import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2, Link as LinkIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface CommunityPost {
  id: string;
  user_id: string;
  user_email: string;
  content: string;
  scholarship_id: string | null;
  created_at: string;
  reply_count?: number;
  scholarship_name?: string | null;
}

interface Props {
  post: CommunityPost;
  currentUserId: string | undefined;
  onOpenThread: (postId: string) => void;
  onDelete: (postId: string) => void;
}

export function CommunityPostCard({ post, currentUserId, onOpenThread, onDelete }: Props) {
  const initial = post.user_email?.[0]?.toUpperCase() ?? "?";
  const displayName = post.user_email.split("@")[0];

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

