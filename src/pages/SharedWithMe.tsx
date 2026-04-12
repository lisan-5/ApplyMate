import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Share2, Inbox } from "lucide-react";
import type { Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;

const statusLabels: Record<string, string> = {
  saved: "Saved", in_progress: "In Progress", submitted: "Submitted", awarded: "Awarded", rejected: "Rejected",
};

export default function SharedWithMe() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .from("shared_scholarships")
      .select("scholarship_id")
      .eq("shared_with", user.id)
      .then(async ({ data: shared }) => {
        if (shared && shared.length > 0) {
          const ids = shared.map((s) => s.scholarship_id);
          const { data } = await api.from("scholarships").select("*").in("id", ids);
          setScholarships(data || []);
        }
        setLoading(false);
      });
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto w-full min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-foreground/5">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Shared with Me</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Scholarships friends have shared</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        ) : scholarships.length === 0 ? (
          <Card className="glass-card rounded-2xl border-0">
            <CardContent className="py-16 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No shared scholarships yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {scholarships.map((s) => (
              <Card key={s.id} className="glass-card rounded-2xl border-0 hover-lift">
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4 px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.organization || "—"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {s.amount && <span className="text-sm font-semibold tabular-nums">${Number(s.amount).toLocaleString()}</span>}
                    {s.deadline && <span className="text-xs text-muted-foreground">{format(new Date(s.deadline), "MMM d, yyyy")}</span>}
                    <Badge variant="secondary" className="rounded-lg">{statusLabels[s.status]}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


