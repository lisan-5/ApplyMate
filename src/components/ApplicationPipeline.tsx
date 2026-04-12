import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/integrations/backend/client";
import { useAiCache } from "@/hooks/useAiCache";
import {
  Bookmark, Pencil, Send, Trophy, XCircle,
  ChevronRight, Sparkles, RefreshCw, Briefcase, GraduationCap,
  TrendingUp, AlertTriangle, Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;

interface PipelineInsights {
  summary: string;
  highlights: string[];
  warnings: string[];
  tips: string[];
}

const stages = [
  { key: "saved", label: "Saved", icon: Bookmark, gradient: "from-muted-foreground/60 to-muted-foreground/40" },
  { key: "in_progress", label: "In Progress", icon: Pencil, gradient: "from-primary/80 to-primary/60" },
  { key: "submitted", label: "Submitted", icon: Send, gradient: "from-[hsl(200,80%,55%)] to-[hsl(200,80%,45%)]" },
  { key: "awarded", label: "Awarded", icon: Trophy, gradient: "from-success to-success/80" },
  { key: "rejected", label: "Rejected", icon: XCircle, gradient: "from-destructive/70 to-destructive/50" },
] as const;

const stageColors: Record<string, string> = {
  saved: "hsl(var(--muted-foreground))",
  in_progress: "hsl(var(--primary))",
  submitted: "hsl(200, 80%, 55%)",
  awarded: "hsl(var(--success))",
  rejected: "hsl(var(--destructive))",
};

const stageBgColors: Record<string, string> = {
  saved: "bg-muted-foreground/10",
  in_progress: "bg-primary/10",
  submitted: "bg-[hsl(200,80%,55%)]/10",
  awarded: "bg-success/10",
  rejected: "bg-destructive/10",
};

const stageTextColors: Record<string, string> = {
  saved: "text-muted-foreground",
  in_progress: "text-primary",
  submitted: "text-[hsl(200,80%,55%)]",
  awarded: "text-success",
  rejected: "text-destructive",
};

export function ApplicationPipeline({
  scholarships,
  loading,
}: {
  scholarships: Scholarship[];
  loading: boolean;
}) {
  const [insights, setInsights] = useState<PipelineInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const { getCached, setCached } = useAiCache();

  const active = useMemo(() => scholarships.filter((s) => s.status !== "archived"), [scholarships]);
  const total = active.length;

  const stageCounts = useMemo(() => {
    const counts: Record<string, { total: number; scholarships: number; jobs: number }> = {};
    stages.forEach((s) => {
      counts[s.key] = { total: 0, scholarships: 0, jobs: 0 };
    });
    active.forEach((s) => {
      const stage = counts[s.status];
      if (stage) {
        stage.total++;
        if ((s.application_type || "scholarship") === "job") stage.jobs++;
        else stage.scholarships++;
      }
    });
    return counts;
  }, [active]);

  // Load cached insights on mount
  useState(() => {
    getCached("pipeline_insights").then((cached) => {
      if (cached?.result_data?.insights) {
        setInsights(cached.result_data.insights as PipelineInsights);
      }
    });
  });

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const { data, error } = await api.functions.invoke("pipeline-insights", {
        body: {
          pipeline: stageCounts,
          total,
          scholarshipCount: active.filter((s) => (s.application_type || "scholarship") === "scholarship").length,
          jobCount: active.filter((s) => (s.application_type || "scholarship") === "job").length,
        },
      });
      if (error) throw error;
      if (data?.insights) {
        setInsights(data.insights);
        await setCached("pipeline_insights", { insights: data.insights });
      }
    } catch (e) {
      console.error("Pipeline insights error:", e);
    } finally {
      setInsightsLoading(false);
    }
  };

  const maxCount = Math.max(...Object.values(stageCounts).map((c) => c.total), 1);

  return (
    <div className="space-y-3">
      <p className="section-label">Pipeline Overview</p>

      {/* Visual Flow Pipeline */}
      <Card className="glass-card rounded-2xl border-0 overflow-hidden">
        <CardContent className="pt-6 pb-6 px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Add your first application to see your pipeline.</p>
          ) : (
            <div className="space-y-6">
              {/* Horizontal Flow */}
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
                {stages.map((stage, i) => {
                  const count = stageCounts[stage.key];
                  const barHeight = Math.max(20, (count.total / maxCount) * 100);
                  const Icon = stage.icon;

                  return (
                    <div key={stage.key} className="flex items-center flex-1 min-w-0">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.4 }}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex flex-col items-center gap-2">
                          {/* Bar */}
                          <div className="h-28 w-full flex items-end justify-center">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${barHeight}%` }}
                              transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: "easeOut" }}
                              className={`w-full max-w-[48px] rounded-t-xl bg-gradient-to-t ${stage.gradient} relative group cursor-default`}
                              style={{ minHeight: count.total > 0 ? 24 : 8 }}
                            >
                              {/* Glow effect on hover */}
                              <div
                                className="absolute inset-0 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ boxShadow: `0 0 20px ${stageColors[stage.key]}40` }}
                              />
                              {/* Count inside bar */}
                              {count.total > 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-sm font-bold text-white drop-shadow-md tabular-nums">
                                    {count.total}
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          </div>

                          {/* Icon + Label */}
                          <div className={`p-1.5 rounded-lg ${stageBgColors[stage.key]}`}>
                            <Icon className={`h-3.5 w-3.5 ${stageTextColors[stage.key]}`} />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                            {stage.label}
                          </span>

                          {/* Type breakdown */}
                          {count.total > 0 && (count.scholarships > 0 || count.jobs > 0) && (
                            <div className="flex items-center gap-1.5">
                              {count.scholarships > 0 && (
                                <div className="flex items-center gap-0.5" title="Scholarships">
                                  <GraduationCap className="h-2.5 w-2.5 text-primary/60" />
                                  <span className="text-[9px] tabular-nums text-muted-foreground">{count.scholarships}</span>
                                </div>
                              )}
                              {count.jobs > 0 && (
                                <div className="flex items-center gap-0.5" title="Jobs">
                                  <Briefcase className="h-2.5 w-2.5 text-[hsl(var(--gradient-accent))]/60" />
                                  <span className="text-[9px] tabular-nums text-muted-foreground">{count.jobs}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>

                      {/* Connector arrow */}
                      {i < stages.length - 1 && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 -mx-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Conversion funnel metrics */}
              <div className="flex items-center gap-3 flex-wrap">
                {(() => {
                  const savedCount = stageCounts.saved.total;
                  const ipCount = stageCounts.in_progress.total;
                  const subCount = stageCounts.submitted.total;
                  const awardCount = stageCounts.awarded.total;
                  const metrics = [];
                  if (savedCount + ipCount > 0 && subCount + awardCount > 0) {
                    const convRate = Math.round(((subCount + awardCount) / total) * 100);
                    metrics.push({ label: "Completion Rate", value: `${convRate}%` });
                  }
                  if (subCount + awardCount + stageCounts.rejected.total > 0) {
                    const winRate = Math.round((awardCount / (subCount + awardCount + stageCounts.rejected.total)) * 100);
                    metrics.push({ label: "Win Rate", value: `${winRate}%` });
                  }
                  metrics.push({ label: "Active", value: `${total}` });

                  return metrics.map((m) => (
                    <div key={m.label} className="px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50">
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      <span className="ml-1.5 text-sm font-bold tabular-nums">{m.value}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights Card */}
      {total > 0 && (
        <Card className="glass-card rounded-2xl border-0 gradient-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="stat-card-icon">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              Pipeline AI Insights
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInsights}
              disabled={insightsLoading}
              className="gap-1.5 rounded-xl text-xs h-8"
            >
              <RefreshCw className={`h-3 w-3 ${insightsLoading ? "animate-spin" : ""}`} />
              {insights ? "Refresh" : "Analyze"}
            </Button>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {!insights && !insightsLoading && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-muted-foreground"
                >
                  Get AI-powered analysis of your application pipeline — trends, bottlenecks, and personalized tips.
                </motion.p>
              )}

              {insightsLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 py-4"
                >
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Analyzing your pipeline...</p>
                </motion.div>
              )}

              {insights && !insightsLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-foreground/80">{insights.summary}</p>

                  {insights.highlights.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-success" /> Highlights
                      </p>
                      <ul className="space-y-1">
                        {insights.highlights.map((h, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-success mt-0.5">•</span> {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Needs Attention
                      </p>
                      <ul className="space-y-1">
                        {insights.warnings.map((w, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-warning mt-0.5">•</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.tips.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" /> Actionable Tips
                      </p>
                      <ul className="space-y-1">
                        {insights.tips.map((t, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


