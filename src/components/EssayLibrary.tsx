import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/integrations/backend/client";
import { BookOpen, Copy, Plus, Trash2, WandSparkles } from "lucide-react";
import type { Tables } from "@/integrations/backend/types";

type EssayLibraryItem = Tables<"essay_library_items">;

const kinds = [
  { value: "essay", label: "Essay" },
  { value: "short_answer", label: "Short Answer" },
  { value: "personal_statement", label: "Personal Statement" },
  { value: "snippet", label: "Snippet" },
];

export function EssayLibrary({
  scholarshipName,
  onUseItem,
}: {
  scholarshipName: string;
  onUseItem: (content: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<EssayLibraryItem[]>([]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("snippet");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await api
      .from("essay_library_items")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    fetchItems();
  }, [user?.id]);

  const saveItem = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSaving(true);
    const { error } = await api.from("essay_library_items").insert({
      user_id: user.id,
      title: title.trim(),
      kind,
      content: content.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    setKind("snippet");
    setContent("");
    setTags("");
    fetchItems();
    toast({ title: "Saved to library" });
  };

  const deleteItem = async (id: string) => {
    await api.from("essay_library_items").delete().eq("id", id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <BookOpen className="h-4 w-4" />
          </div>
          Essay Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/45 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leadership essay intro"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kinds.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="leadership, impact, STEM"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Save a reusable essay, response, or snippet here."
              className="rounded-xl"
            />
          </div>
          <Button
            onClick={saveItem}
            disabled={saving || !title.trim() || !content.trim()}
            className="w-fit rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" />
            Save to Library
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved writing yet. Build a reusable library for essays, short answers,
            and personal statement fragments.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/70 bg-background/45 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="rounded-lg">
                        {kinds.find((entry) => entry.value === item.kind)?.label || item.kind}
                      </Badge>
                      {item.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="rounded-lg">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-xl"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground/80 line-clamp-5">
                  {item.content}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      navigator.clipboard.writeText(item.content);
                      toast({ title: "Copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      onUseItem(
                        `Adapt this ${item.kind.replace("_", " ")} for ${scholarshipName}:\n\n${item.content}`,
                      )
                    }
                  >
                    <WandSparkles className="h-4 w-4 mr-1" />
                    Use in AI
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
