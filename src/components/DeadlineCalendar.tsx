import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, isToday,
} from "date-fns";

interface DeadlineCalendarProps {
  deadlines: { id: string; name: string; deadline: string }[];
  onDayClick?: (date: Date) => void;
}

export function DeadlineCalendar({ deadlines, onDayClick }: DeadlineCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const deadlineDates = useMemo(() => {
    const map = new Map<string, number>();
    deadlines.forEach((d) => {
      const key = format(new Date(d.deadline), "yyyy-MM-dd");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [deadlines]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-foreground/5">
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
            Deadline Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium min-w-[90px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-0">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <div key={d} className="text-[10px] text-muted-foreground font-medium text-center py-1">{d}</div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const count = deadlineDates.get(key) || 0;
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <button
                key={key}
                onClick={() => onDayClick?.(day)}
                className={`relative h-8 w-full flex flex-col items-center justify-center rounded-lg text-xs transition-colors
                  ${!inMonth ? "text-muted-foreground/30" : ""}
                  ${today ? "bg-foreground text-background font-bold" : "hover:bg-accent/50"}
                `}
              >
                {format(day, "d")}
                {count > 0 && (
                  <div className={`absolute bottom-0.5 flex gap-0.5`}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <div key={i} className={`h-1 w-1 rounded-full ${today ? "bg-background" : "bg-destructive"}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

