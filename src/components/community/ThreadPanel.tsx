import { useEffect, useState, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { X, Send, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

interface OriginalPost {
  id: string;
  user_email: string;
  content: string;
  created_at: string;
}

interface Props {
  postId: string;
  originalPost: OriginalPost;
  onClose: () => void;
  onReplyCountChange: (postId: string, count: number) => void;
}

export function ThreadPanel({ postId, originalPost, onClose, onReplyCountChange }: Props) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchReplies = useCallback(async () => {
    const { data } = await api
      .from("community_replies")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data) {
      setReplies(data);
      onReplyCountChange(postId, data.length);
    }
  }, [onReplyCountChange, postId]);

  useEffect(() => {
    fetchReplies();
    const intervalId = window.setInterval(fetchReplies, 10000);
    return () => window.clearInterval(intervalId);
  }, [fetchReplies]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [replies]);

  const handleSend = async () => {
    if (!newReply.trim() || !user) return;
    setSending(true);
    const { error } = await api.from("community_replies").insert({
      post_id: postId,
      user_id: user.id,
      user_email: user.email!,
      content: newReply.trim(),
    });
    if (error) toast.error("Failed to send reply");
    else {
      setNewReply("");
      await fetchReplies();
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    await api.from("community_replies").delete().eq("id", id);
    await fetchReplies();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await api.functions.invoke("ai-community-assist", {
        body: {
          postContent: originalPost.content,
          existingReplies: replies.map((r) => r.content),
        },
      });
      if (error) throw error;
      if (data?.suggestion) setNewReply(data.suggestion);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "AI suggestion failed";
      toast.error(message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="font-semibold text-sm">Thread</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Original post */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {originalPost.user_email[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold">{originalPost.user_email.split("@")[0]}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(originalPost.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{originalPost.content}</p>
      </div>

      {/* Replies */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {replies.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No replies yet. Start the conversation!</p>
        )}
        {replies.map((reply) => (
          <div key={reply.id} className="flex gap-2 group">
            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {reply.user_email[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{reply.user_email.split("@")[0]}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                </span>
                {user?.id === reply.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(reply.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{reply.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs text-muted-foreground h-7"
            onClick={handleAiSuggest}
            disabled={aiLoading}
          >
            {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Suggest
          </Button>
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Reply..."
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !newReply.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


