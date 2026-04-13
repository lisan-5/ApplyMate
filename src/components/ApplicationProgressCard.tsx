import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ListChecks, FileText, PenSquare, Target } from "lucide-react";
import { useAiCache } from "@/hooks/useAiCache";
import type { Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;
type ChecklistItem = Tables<"application_checklist">;
type ScholarshipFile = Tables<"scholarship_files">;

function statusWeight(status: Scholarship["status"]) {
  if (status === "submitted" || status === "awarded") return 10;
  if (status === "in_progress") return 7;
  if (status === "saved") return 4;
  return 2;
}

export function ApplicationProgressCard({
  scholarship,
  checklistItems,
  files,
}: {
  scholarship: Scholarship;
  checklistItems: ChecklistItem[];
  files: ScholarshipFile[];
}) {
  const { getCached } = useAiCache();
  const [essayHistoryCount, setEssayHistoryCount] = useState(0);

  useEffect(() => {
    getCached("essay_history", scholarship.id).then((cached) => {
      const count = cached?.result_data?.messages?.filter(
        (item: { role?: string }) => item.role === "assistant",
      )?.length;
      setEssayHistoryCount(count || 0);
    });
  }, [getCached, scholarship.id]);

  const summary = useMemo(() => {
    const detailFields = [
      scholarship.name,
      scholarship.organization,
      scholarship.deadline,
      scholarship.link,
      scholarship.amount,
      scholarship.tags?.length ? scholarship.tags.join(",") : "",
    ];
    const detailScore = Math.round(
      (detailFields.filter(Boolean).length / detailFields.length) * 25,
    );

    const notesFields = [scholarship.notes, scholarship.eligibility_notes];
    const notesScore = Math.round(
      (notesFields.filter((item) => (item || "").trim().length > 0).length /
        notesFields.length) *
        15,
    );

    const checklistScore =
      checklistItems.length > 0
        ? Math.round(
            (checklistItems.filter((item) => item.is_done).length /
              checklistItems.length) *
              25,
          )
        : 0;

    const filesScore = Math.min(files.length, 3) * 5;
    const essayScore = Math.min(essayHistoryCount, 2) * 5;
    const stageScore = statusWeight(scholarship.status);

    const score = Math.min(
      100,
      detailScore + notesScore + checklistScore + filesScore + essayScore + stageScore,
    );

    return {
      score,
      parts: [
        { label: "Application details", value: detailScore, max: 25, icon: Target },
        {
          label: "Checklist progress",
          value: checklistScore,
          max: 25,
          icon: ListChecks,
        },
        { label: "Notes quality", value: notesScore, max: 15, icon: FileText },
        { label: "Files uploaded", value: filesScore, max: 15, icon: FileText },
        { label: "Essay work", value: essayScore, max: 10, icon: PenSquare },
        { label: "Stage momentum", value: stageScore, max: 10, icon: Target },
      ],
    };
  }, [checklistItems, essayHistoryCount, files.length, scholarship]);

  const tone =
    summary.score >= 75
      ? "bg-success/10 text-success"
      : summary.score >= 45
        ? "bg-warning/10 text-warning"
        : "bg-destructive/10 text-destructive";

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <Target className="h-4 w-4" />
          </div>
          Application Progress
        </CardTitle>
        <Badge className={tone}>{summary.score}% ready</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Progress value={summary.score} className="h-3" />
          <p className="mt-2 text-sm text-muted-foreground">
            This score reflects how complete this application looks based on its details,
            checklist, uploaded files, and essay work.
          </p>
        </div>

        <div className="space-y-2">
          {summary.parts.map((part) => (
            <div
              key={part.label}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-background/45 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <part.icon className="h-4 w-4 text-primary" />
                <span>{part.label}</span>
              </div>
              <span className="text-sm font-semibold">
                {part.value}/{part.max}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
