import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Pencil, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  goal: number;
  current: number;
  onGoalChange: (newGoal: number) => void;
}

export function GoalTracker({ goal, current, onGoalChange }: Props) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(goal));
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (pct / 100) * circumference;

  const save = async () => {
    const n = Math.max(1, parseInt(val) || 5);
    if (user) {
      await api.from("profiles").update({ monthly_goal: n }).eq("user_id", user.id);
    }
    onGoalChange(n);
    setEditing(false);
  };

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardContent className="py-5 px-5">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="14" fill="none"
                stroke="hsl(var(--foreground))"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold tabular-nums">{current}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Goal</span>
            </div>
            {editing ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  className="h-7 w-16 rounded-lg text-sm"
                  min={1}
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-medium">
                  {current} <span className="text-muted-foreground">/ {goal} applications</span>
                </p>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setVal(String(goal)); setEditing(true); }}>
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


