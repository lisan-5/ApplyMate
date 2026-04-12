import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { StickyNote, Check } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export function QuickNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    api
      .from("profiles")
      .select("quick_notes")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.quick_notes) setNotes(data.quick_notes);
      });
  }, [user]);

  const save = useCallback(
    async (value: string) => {
      if (!user) return;
      await api
        .from("profiles")
        .update({ quick_notes: value } as any)
        .eq("user_id", user.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
    [user]
  );

  const handleChange = (value: string) => {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(value), 800);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="glass-card rounded-2xl border-0">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer select-none">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-foreground/5">
                <StickyNote className="h-3.5 w-3.5" />
              </div>
              Quick Notes
              <div className="ml-auto flex items-center gap-2">
                {saved && (
                  <span className="text-[10px] text-success flex items-center gap-1">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <Textarea
              placeholder="Jot down quick thoughts, links, or reminders..."
              value={notes}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={() => save(notes)}
              className="min-h-[100px] resize-none border-0 bg-accent/30 rounded-xl text-sm focus-visible:ring-1"
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}


