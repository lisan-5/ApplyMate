import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crosshair, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { api } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useAiCache } from "@/hooks/useAiCache";
import { useEffect } from "react";
import type { Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;

interface PriorityResult {
  id: string;
  name: string;
  reason: string;
}

interface Props {
  scholarships: Scholarship[];
  loading: boolean;
}

export function FocusNext({ scholarships, loading: dataLoading }: Props) {
  const { toast } = useToast();
  const { getCached, setCached } = useAiCache();
  const [result, setResult] = useState<PriorityResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCached("focus_next").then((cached) => {
      if (cached?.result_data?.focus) {
        setResult(cached.result_data.focus);
      }
    });
  }, [getCached]);

  const fetchPriority = async () => {
    const active = scholarships.filter(
      (s) => s.status !== "archived" && s.status !== "submitted" && s.status !== "awarded" && s.status !== "rejected"
    );
    if (active.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await api.functions.invoke("ai-advisor", {
        body: {
          mode: "prioritize",
          applications: active.map((s) => ({
            id: s.id, name: s.name, status: s.status,
            deadline: s.deadline, amount: s.amount,
          })),
        },
      });
      if (error) throw error;
      if (data?.focus) {
        setResult(data.focus);
        await setCached("focus_next", { focus: data.focus });
      }
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const activeCount = scholarships.filter(
    (s) => s.status !== "archived" && s.status !== "submitted" && s.status !== "awarded" && s.status !== "rejected"
  ).length;

  if (dataLoading || activeCount === 0) return null;

  return (
    <Card className="rounded-2xl border-0 bg-foreground text-background overflow-hidden">
      <CardContent className="py-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className="h-4 w-4 opacity-60" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Focus Next</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-background/60 hover:text-background hover:bg-background/10"
            onClick={fetchPriority}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm opacity-60">Analyzing priorities...</p>
        ) : result ? (
          <div>
            <Link to={`/scholarships/${result.id}`} className="group">
              <p className="text-lg font-bold tracking-tight group-hover:underline">{result.name}</p>
            </Link>
            <p className="text-sm opacity-70 mt-1 leading-relaxed">{result.reason}</p>
          </div>
        ) : (
          <div>
            <p className="text-sm opacity-60">Let AI rank your applications by urgency.</p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-background/80 hover:text-background hover:bg-background/10 rounded-full gap-1"
              onClick={fetchPriority}
            >
              Analyze <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


