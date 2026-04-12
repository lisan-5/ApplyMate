import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, FileText, CheckCircle2, MessageSquare, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "scholarship_added" | "scholarship_updated" | "checklist_done" | "community_post";
  label: string;
  timestamp: string;
}

export function ActivityTimeline() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchActivities = async () => {
      const [scholarships, checklist, posts] = await Promise.all([
        api
          .from("scholarships")
          .select("id, name, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(10),
        api
          .from("application_checklist")
          .select("id, label, created_at, is_done")
          .eq("user_id", user.id)
          .eq("is_done", true)
          .order("created_at", { ascending: false })
          .limit(5),
        api
          .from("community_posts")
          .select("id, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const items: ActivityItem[] = [];

      scholarships.data?.forEach((s) => {
        // If created_at and updated_at are very close, it's a new addition
        const created = new Date(s.created_at).getTime();
        const updated = new Date(s.updated_at).getTime();
        if (updated - created < 60000) {
          items.push({ id: `s-add-${s.id}`, type: "scholarship_added", label: s.name, timestamp: s.created_at });
        } else {
          items.push({ id: `s-upd-${s.id}`, type: "scholarship_updated", label: s.name, timestamp: s.updated_at });
        }
      });

      checklist.data?.forEach((c) => {
        items.push({ id: `c-${c.id}`, type: "checklist_done", label: c.label, timestamp: c.created_at! });
      });

      posts.data?.forEach((p) => {
        items.push({ id: `p-${p.id}`, type: "community_post", label: p.content.slice(0, 60), timestamp: p.created_at });
      });

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items.slice(0, 8));
      setLoading(false);
    };

    fetchActivities();
  }, [user]);

  const iconMap = {
    scholarship_added: <Plus className="h-3.5 w-3.5" />,
    scholarship_updated: <FileText className="h-3.5 w-3.5" />,
    checklist_done: <CheckCircle2 className="h-3.5 w-3.5" />,
    community_post: <MessageSquare className="h-3.5 w-3.5" />,
  };

  const labelMap = {
    scholarship_added: "Added",
    scholarship_updated: "Updated",
    checklist_done: "Completed",
    community_post: "Posted",
  };

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <Activity className="h-3.5 w-3.5" />
          </div>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No recent activity yet.</p>
        ) : (
          <div className="space-y-0.5">
            {activities.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="mt-0.5 p-1.5 rounded-md bg-foreground/5 shrink-0">
                  {iconMap[item.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    <span className="text-muted-foreground text-xs font-medium">{labelMap[item.type]}</span>{" "}
                    <span className="font-medium">{item.label}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


