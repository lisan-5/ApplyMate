import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useAiCache } from "@/hooks/useAiCache";
import { BrainCircuit, RefreshCw, Loader2, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;

interface Props {
  scholarships: Scholarship[];
  loading: boolean;
}

export function AdvisorCard({ scholarships, loading: dataLoading }: Props) {
  const { toast } = useToast();
  const { getCached, setCached } = useAiCache();
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Restore cached advice on mount
  useEffect(() => {
    getCached("advisor").then((cached) => {
      if (cached?.result_data?.advice) {
        setAdvice(cached.result_data.advice);
        setHasFetched(true);
      }
    });
  }, [getCached]);

  const fetchAdvice = async () => {
    setLoading(true);
    try {
      const summary = scholarships.map((s) => ({
        name: s.name, status: s.status, deadline: s.deadline,
        amount: s.amount, notes: s.notes ? "yes" : "no",
      }));
      const { data, error } = await api.functions.invoke("ai-advisor", {
        body: { mode: "dashboard", applications: summary },
      });
      if (error) throw error;
      const result = data?.advice || "No advice available.";
      setAdvice(result);
      setHasFetched(true);
      await setCached("advisor", { advice: result });
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card rounded-2xl border-0 overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <BrainCircuit className="h-4 w-4" />
          </div>
          AI Advisor
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAdvice}
          disabled={loading || dataLoading}
          className="gap-1.5 rounded-xl text-xs h-8"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {hasFetched ? "Refresh" : "Get Advice"}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your applications...
          </div>
        ) : advice ? (
          <p className="text-sm leading-relaxed">{advice}</p>
        ) : (
          <div className="flex items-center gap-3 py-3">
            <Sparkles className="h-5 w-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Get personalized strategic guidance based on your applications.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


