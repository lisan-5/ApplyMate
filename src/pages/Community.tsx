import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { ThreadPanel } from "@/components/community/ThreadPanel";
import { NewPostForm } from "@/components/community/NewPostForm";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, MessageCircle } from "lucide-react";

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

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeThread, setActiveThread] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    const query = api
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: postsData } = await query;
    if (!postsData) { setLoading(false); return; }

    const postIds = postsData.map((p) => p.id);
    const { data: repliesData } = await api
      .from("community_replies")
      .select("post_id")
      .in("post_id", postIds.length > 0 ? postIds : ["__none__"]);

    const replyCounts: Record<string, number> = {};
    repliesData?.forEach((r) => {
      replyCounts[r.post_id] = (replyCounts[r.post_id] || 0) + 1;
    });

    const scholarshipIds = postsData
      .map((p) => p.scholarship_id)
      .filter(Boolean) as string[];
    const scholarshipNames: Record<string, string> = {};
    if (scholarshipIds.length > 0) {
      const { data: schData } = await api
        .from("scholarships")
        .select("id, name")
        .in("id", scholarshipIds);
      schData?.forEach((s) => { scholarshipNames[s.id] = s.name; });
    }

    const { data: votesData } = await api
      .from("community_post_votes")
      .select("post_id, user_id, value")
      .in("post_id", postIds.length > 0 ? postIds : ["__none__"]);

    const voteSummary: Record<string, { upvotes: number; downvotes: number }> = {};
    const currentUserVotes: Record<string, 1 | -1 | 0> = {};
    votesData?.forEach((vote) => {
      if (!voteSummary[vote.post_id]) {
        voteSummary[vote.post_id] = { upvotes: 0, downvotes: 0 };
      }
      if (vote.value > 0) voteSummary[vote.post_id].upvotes += 1;
      else voteSummary[vote.post_id].downvotes += 1;
      if (vote.user_id === user?.id) {
        currentUserVotes[vote.post_id] = vote.value > 0 ? 1 : -1;
      }
    });

    const enriched: CommunityPost[] = postsData.map((p) => ({
      ...p,
      reply_count: replyCounts[p.id] || 0,
      scholarship_name: p.scholarship_id ? scholarshipNames[p.scholarship_id] || null : null,
      upvotes: voteSummary[p.id]?.upvotes || 0,
      downvotes: voteSummary[p.id]?.downvotes || 0,
      user_vote: currentUserVotes[p.id] || 0,
    }));

    setPosts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
    const intervalId = window.setInterval(fetchPosts, 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchPosts]);

  const handleDelete = async (postId: string) => {
    const { error } = await api.from("community_posts").delete().eq("id", postId);
    if (error) toast.error("Failed to delete post");
    else {
      if (activeThread === postId) setActiveThread(null);
      await fetchPosts();
    }
  };

  const handleReplyCountChange = (postId: string, count: number) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reply_count: count } : p)));
  };

  const filtered = search.trim()
    ? posts.filter(
        (p) =>
          p.content.toLowerCase().includes(search.toLowerCase()) ||
          p.user_email.toLowerCase().includes(search.toLowerCase()) ||
          (p.scholarship_name && p.scholarship_name.toLowerCase().includes(search.toLowerCase()))
      )
    : posts;

  const activePost = posts.find((p) => p.id === activeThread);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] gap-0 -m-4 md:-m-8 min-w-0">
        <div className={`flex-1 flex flex-col min-w-0 ${activeThread ? "hidden md:flex" : "flex"}`}>
          <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 space-y-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-foreground/5">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Community</h1>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts, users, or applications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl"
              />
            </div>

            <Card className="glass-card rounded-2xl border-0">
              <CardContent className="pt-4 pb-3">
                <NewPostForm onPosted={fetchPosts} />
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {search ? "No posts match your search." : "No posts yet. Be the first to share!"}
              </p>
            ) : (
              filtered.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  onOpenThread={setActiveThread}
                  onDelete={handleDelete}
                  onVote={fetchPosts}
                />
              ))
            )}
          </div>
        </div>

        {activeThread && activePost && (
          <div className={`w-full md:w-[380px] lg:w-[420px] shrink-0 ${activeThread ? "flex" : "hidden"}`}>
            <ThreadPanel
              postId={activeThread}
              originalPost={activePost}
              onClose={() => setActiveThread(null)}
              onReplyCountChange={handleReplyCountChange}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


