import { useState, useEffect } from "react";
import { Send, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Scholarship {
  id: string;
  name: string;
}

export function NewPostForm({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [scholarshipId, setScholarshipId] = useState<string>("");
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [sending, setSending] = useState(false);
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .from("scholarships")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data }) => setScholarships(data || []));
  }, [user]);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSending(true);
    const { error } = await api.from("community_posts").insert({
      user_id: user.id,
      user_email: user.email!,
      content: content.trim(),
      scholarship_id: scholarshipId || null,
    });
    if (error) toast.error("Failed to post");
    else {
      setContent("");
      setScholarshipId("");
      setShowLink(false);
      onPosted();
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Share a tip, ask a question, or suggest an application..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[80px] resize-none text-sm"
        rows={3}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant={showLink ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowLink(!showLink)}
          >
            <LinkIcon className="h-3.5 w-3.5 mr-1" />
            Link Application
          </Button>
          {showLink && scholarships.length > 0 && (
            <Select value={scholarshipId} onValueChange={setScholarshipId}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue placeholder="Select application..." />
              </SelectTrigger>
              <SelectContent>
                {scholarships.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={sending || !content.trim()}>
          <Send className="h-3.5 w-3.5 mr-1" />
          Post
        </Button>
      </div>
    </div>
  );
}


