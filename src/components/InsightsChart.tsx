import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface InsightsChartProps {
  scholarships: { created_at: string; status: string }[];
  loading: boolean;
}

export function InsightsChart({ scholarships, loading }: InsightsChartProps) {
  const data = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, "MMM"),
        start: startOfMonth(date),
        end: endOfMonth(date),
        count: 0,
      };
    });

    scholarships.forEach((s) => {
      const created = new Date(s.created_at);
      months.forEach((m) => {
        if (isWithinInterval(created, { start: m.start, end: m.end })) {
          m.count++;
        }
      });
    });

    return months.map((m) => ({ month: m.month, Applications: m.count }));
  }, [scholarships]);

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <BarChart3 className="h-3.5 w-3.5" />
          </div>
          Application Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={24}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--accent))" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="Applications" fill="hsl(var(--foreground))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

