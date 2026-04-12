import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Sparkles, Loader2, ListChecks } from "lucide-react";
import type { Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;

interface ChecklistItem {
  id: string;
  label: string;
  is_done: boolean;
  position: number;
}

interface Props {
  scholarship: Scholarship;
}

export function ApplicationChecklist({ scholarship }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await api
      .from("application_checklist")
      .select("*")
      .eq("scholarship_id", scholarship.id)
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    setItems((data as ChecklistItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [scholarship.id, user]);

  const addItem = async () => {
    if (!newLabel.trim() || !user) return;
    await api.from("application_checklist").insert({
      scholarship_id: scholarship.id,
      user_id: user.id,
      label: newLabel.trim(),
      position: items.length,
    });
    setNewLabel("");
    fetchItems();
  };

  const toggleItem = async (item: ChecklistItem) => {
    await api.from("application_checklist").update({ is_done: !item.is_done }).eq("id", item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i)));
  };

  const deleteItem = async (id: string) => {
    await api.from("application_checklist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const suggestTasks = async () => {
    setSuggesting(true);
    try {
      const { data, error } = await api.functions.invoke("ai-advisor", {
        body: {
          mode: "checklist",
          scholarshipContext: {
            name: scholarship.name,
            organization: scholarship.organization,
            amount: scholarship.amount,
            eligibility_notes: scholarship.eligibility_notes,
            notes: scholarship.notes,
          },
        },
      });
      if (error) throw error;
      const tasks: { label: string }[] = data?.tasks || [];
      if (tasks.length === 0) {
        toast({ title: "No suggestions generated", variant: "destructive" });
        return;
      }
      for (let i = 0; i < tasks.length; i++) {
        await api.from("application_checklist").insert({
          scholarship_id: scholarship.id,
          user_id: user!.id,
          label: tasks[i].label,
          position: items.length + i,
        });
      }
      toast({ title: `${tasks.length} tasks suggested!` });
      fetchItems();
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  const doneCount = items.filter((i) => i.is_done).length;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Checklist
          {items.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {doneCount}/{items.length}
            </span>
          )}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={suggestTasks} disabled={suggesting} className="gap-1">
          {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          AI Suggest
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <Checkbox checked={item.is_done} onCheckedChange={() => toggleItem(item)} />
                <span className={`flex-1 text-sm ${item.is_done ? "line-through text-muted-foreground" : ""}`}>
                  {item.label}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteItem(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Add a task..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addItem} disabled={!newLabel.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


