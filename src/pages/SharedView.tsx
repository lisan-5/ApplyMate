import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/integrations/backend/client";
import { BookOpen, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/backend/types";

type SharedScholarship = Omit<Tables<"scholarships">, "share_token" | "user_id" | "is_favorited" | "position" | "application_type">;

const statusLabels: Record<string, string> = {
  saved: "Saved", in_progress: "In Progress", submitted: "Submitted", awarded: "Awarded", rejected: "Rejected",
};

export default function SharedView() {
  const { token } = useParams<{ token: string }>();
  const [scholarship, setScholarship] = useState<SharedScholarship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .rpc("get_shared_scholarship", { _token: token })
      .then(({ data }) => {
        setScholarship(data?.[0] ?? null);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!scholarship) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">This scholarship is not available or has not been shared.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>ScholarTrack</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scholarship.name}
              {scholarship.link && (
                <a href={scholarship.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div><span className="text-muted-foreground">Organization:</span> <span className="font-medium">{scholarship.organization || "—"}</span></div>
              <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{scholarship.amount ? `$${Number(scholarship.amount).toLocaleString()}` : "—"}</span></div>
              <div><span className="text-muted-foreground">Deadline:</span> <span className="font-medium">{scholarship.deadline ? format(new Date(scholarship.deadline), "MMM d, yyyy") : "—"}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{statusLabels[scholarship.status]}</Badge></div>
              {scholarship.tags && scholarship.tags.length > 0 && (
                <div className="col-span-2 flex gap-1 flex-wrap">
                  {scholarship.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                </div>
              )}
              {scholarship.eligibility_notes && (
                <div className="col-span-2 mt-2">
                  <p className="text-muted-foreground mb-1">Eligibility Notes</p>
                  <p className="whitespace-pre-wrap">{scholarship.eligibility_notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {scholarship.link && (
          <a href={scholarship.link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
            Apply Now <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}


