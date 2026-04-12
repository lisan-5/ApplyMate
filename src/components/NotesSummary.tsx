import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useAiCache } from "@/hooks/useAiCache";
import type { Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;

interface Props {
  scholarship: Scholarship;
}

export function NotesSummary({ scholarship }: Props) {
  const { toast } = useToast();
  const { getCached, setCached } = useAiCache();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const cacheKey = `summary_${scholarship.id}`;

  useEffect(() => {
    getCached(cacheKey).then((cached) => {
      if (cached?.result_data?.summary) {
        setSummary(cached.result_data.summary);
      }
    });
  }, [cacheKey, getCached]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.functions.invoke("ai-advisor", {
        body: {
          mode: "summarize",
          scholarshipContext: {
            name: scholarship.name,
            organization: scholarship.organization,
            amount: scholarship.amount,
            eligibility_notes: scholarship.eligibility_notes,
            notes: scholarship.notes,
            status: scholarship.status,
            deadline: scholarship.deadline,
          },
        },
      });
      if (error) throw error;
      const text = data?.summary || "No summary available.";
      setSummary(text);
      await setCached(cacheKey, { summary: text });
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasContent = scholarship.notes || scholarship.eligibility_notes;
  if (!hasContent && !summary) return null;

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          AI Summary
        </CardTitle>
        <div className="flex items-center gap-1">
          {!summary && (
            <Button variant="outline" size="sm" onClick={fetchSummary} disabled={loading} className="gap-1.5 rounded-xl text-xs h-8">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Summarize
            </Button>
          )}
          {summary && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Summarizing...
            </div>
          ) : summary ? (
            <p className="text-sm leading-relaxed">{summary}</p>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}


