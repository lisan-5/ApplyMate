import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Trash2,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { api } from "@/integrations/backend/client";
import { toast } from "sonner";

interface CommunityPost {
  id: string;
  user_id: string;
  user_email: string;
  content: string;
  scholarship_id: string | null;
  created_at: string;
  reply_count?: number;
  scholarship_name?: string | null;
  upvotes?: number;
  downvotes?: number;
  user_vote?: 1 | -1 | 0;
}

interface Props {
  post: CommunityPost;
  currentUserId: string | undefined;
  onOpenThread: (postId: string) => void;
  onDelete: (postId: string) => void;
  onVote: () => Promise<void>;
}

export function CommunityPostCard({
  post,
  currentUserId,
  onOpenThread,
  onDelete,
  onVote,
}: Props) {
  const initial = post.user_email?.[0]?.toUpperCase() ?? "?";
  const displayName = post.user_email.split("@")[0];

  const handleVote = async (value: 1 | -1) => {
    if (!currentUserId) return;
    const currentVote = post.user_vote || 0;
    if (currentVote === value) {
      const { error } = await api
        .from("community_post_votes")
        .delete()
        .eq("post_id", post.id);
      if (error) {
        toast.error("Failed to remove vote");
        return;
      }
    } else {
      const { error } = await api.from("community_post_votes").upsert(
        {
          post_id: post.id,
          user_id: currentUserId,
          value,
        },
        { onConflict: "post_id,user_id" },
      );
      if (error) {
        toast.error("Failed to save vote");
        return;
      }
    }
    await onVote();
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold truncate">{displayName}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>

            {post.scholarship_id && (
              <Link
                to={`/scholarships/${post.scholarship_id}`}
                className="inline-flex items-center gap-1 mt-2"
              >
                <Badge variant="secondary" className="gap-1 text-xs font-normal hover:bg-accent cursor-pointer">
                  <LinkIcon className="h-3 w-3" />
                  {post.scholarship_name || "View Application"}
                </Badge>
              </Link>
            )}

            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center rounded-full border border-border/70 bg-background/60">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs ${post.user_vote === 1 ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => handleVote(1)}
                >
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  {post.upvotes || 0}
                </Button>
                <div className="h-4 w-px bg-border/70" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs ${post.user_vote === -1 ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => handleVote(-1)}
                >
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  {post.downvotes || 0}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onOpenThread(post.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                {post.reply_count || 0} {(post.reply_count || 0) === 1 ? "reply" : "replies"}
              </Button>
              {currentUserId === post.user_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDelete(post.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

