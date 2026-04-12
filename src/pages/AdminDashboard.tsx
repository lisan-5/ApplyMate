import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  FolderOpen,
  Trophy,
  TrendingUp,
  Search,
  Eye,
  Trash2,
  Shield,
  BarChart3,
  MessageCircle,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables, Database } from "@/integrations/backend/types";

type Profile = Tables<"profiles">;
type Scholarship = Tables<"scholarships">;
type ScholarshipStatus = Database["public"]["Enums"]["scholarship_status"];
type Reply = Tables<"community_replies">;

function PostReplies({ postId }: { postId: string }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const fetchReplies = async () => {
    const { data } = await api
      .from("community_replies")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setReplies(data || []);
  };

  useEffect(() => {
    if (open) fetchReplies();
  }, [open]);

  const deleteReply = async (id: string) => {
    await api.from("community_replies").delete().eq("id", id);
    toast({ title: "Reply deleted" });
    fetchReplies();
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        <MessageCircle className="h-3 w-3" />
        {open ? "Hide replies" : "Show replies"}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-border">
          {replies.length === 0 && (
            <p className="text-xs text-muted-foreground">No replies</p>
          )}
          {replies.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold">{r.user_email}</span>{" "}
                <span className="text-muted-foreground">
                  {format(new Date(r.created_at), "MMM d, HH:mm")}
                </span>
                <p className="text-sm mt-0.5">{r.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive shrink-0"
                onClick={() => deleteReply(r.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const statusLabels: Record<string, string> = {
  saved: "Saved",
  in_progress: "In Progress",
  submitted: "Submitted",
  awarded: "Awarded",
  rejected: "Rejected",
  archived: "Archived",
};

const statusColors: Record<string, string> = {
  saved: "bg-secondary text-secondary-foreground",
  in_progress:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  submitted: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700/40 dark:text-zinc-200",
  awarded:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

interface UserWithDetails extends Profile {
  role?: string;
  email?: string;
  scholarship_count?: number;
  total_awarded?: number;
}

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [allScholarships, setAllScholarships] = useState<Scholarship[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchScholarships, setSearchScholarships] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(
    null,
  );
  const [selectedScholarship, setSelectedScholarship] =
    useState<Scholarship | null>(null);
  const [userScholarships, setUserScholarships] = useState<Scholarship[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    const [profilesRes, rolesRes, scholarshipsRes, postsRes] =
      await Promise.all([
        api.from("profiles").select("*"),
        api.from("user_roles").select("*"),
        api
          .from("scholarships")
          .select("*")
          .order("created_at", { ascending: false }),
        api
          .from("community_posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const scholarships = scholarshipsRes.data || [];

    const enriched: UserWithDetails[] = profiles.map((p) => {
      const userScholarships = scholarships.filter(
        (s) => s.user_id === p.user_id,
      );
      return {
        ...p,
        role: roles.find((r) => r.user_id === p.user_id)?.role || "user",
        scholarship_count: userScholarships.length,
        total_awarded: userScholarships
          .filter((s) => s.status === "awarded")
          .reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
      };
    });

    setUsers(enriched);
    setAllScholarships(scholarships);
    setPosts(postsRes.data || []);
    setLoading(false);
  };

  const viewUserDetail = async (user: UserWithDetails) => {
    setSelectedUser(user);
    const { data } = await api
      .from("scholarships")
      .select("*")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });
    setUserScholarships(data || []);
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    if (currentRole === "admin") {
      await api
        .from("user_roles")
        .update({ role: "user" })
        .eq("user_id", userId);
    } else {
      await api
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", userId);
    }
    toast({
      title: `Role updated to ${currentRole === "admin" ? "user" : "admin"}`,
    });
    fetchAll();
  };

  const updateScholarshipStatus = async (
    id: string,
    status: ScholarshipStatus,
  ) => {
    await api.from("scholarships").update({ status }).eq("id", id);
    toast({ title: "Status updated" });
    fetchAll();
    if (selectedUser) viewUserDetail(selectedUser);
  };

  const deleteScholarship = async (id: string) => {
    await api.from("scholarships").delete().eq("id", id);
    toast({ title: "Application deleted" });
    fetchAll();
    if (selectedUser) viewUserDetail(selectedUser);
  };

  const deletePost = async (id: string) => {
    // Delete replies first, then the post
    await api.from("community_replies").delete().eq("post_id", id);
    await api.from("community_posts").delete().eq("id", id);
    toast({ title: "Post deleted" });
    fetchAll();
  };

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const totalUsers = users.length;
  const totalApps = allScholarships.length;
  const totalAwarded = allScholarships.filter(
    (s) => s.status === "awarded",
  ).length;
  const totalAmount = allScholarships
    .filter((s) => s.status === "awarded")
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const filteredUsers = users.filter(
    (u) =>
      (u.display_name?.toLowerCase().includes(searchUsers.toLowerCase()) ??
        false) ||
      u.user_id.includes(searchUsers),
  );

  const filteredScholarships = allScholarships.filter(
    (s) =>
      s.name.toLowerCase().includes(searchScholarships.toLowerCase()) ||
      (s.organization
        ?.toLowerCase()
        .includes(searchScholarships.toLowerCase()) ??
        false),
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full min-w-0 overflow-hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Full platform overview and management
          </p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Users",
                  value: totalUsers,
                  icon: Users,
                  gradient: "from-zinc-300 to-zinc-500",
                },
                {
                  label: "Total Applications",
                  value: totalApps,
                  icon: FolderOpen,
                  gradient: "from-zinc-400 to-zinc-600",
                },
                {
                  label: "Awarded",
                  value: totalAwarded,
                  icon: Trophy,
                  gradient: "from-zinc-500 to-zinc-700",
                },
                {
                  label: "Total Won",
                  value: `$${totalAmount.toLocaleString()}`,
                  icon: TrendingUp,
                  gradient: "from-zinc-200 to-zinc-400",
                },
              ].map((stat) => (
                <Card
                  key={stat.label}
                  className="glass-card rounded-2xl border-0"
                >
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-2xl md:text-3xl font-bold tracking-tight truncate">
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.label}
                        </p>
                      </div>
                      <div
                        className={`bg-gradient-to-br ${stat.gradient} p-2 rounded-xl shrink-0`}
                      >
                        <stat.icon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="users">
              <TabsList className="w-full sm:w-auto flex overflow-x-auto">
                <TabsTrigger
                  value="users"
                  className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <Users className="h-3.5 w-3.5" /> Users
                </TabsTrigger>
                <TabsTrigger
                  value="applications"
                  className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Applications
                </TabsTrigger>
                <TabsTrigger
                  value="community"
                  className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Community
                </TabsTrigger>
              </TabsList>

              {/* Users Tab */}
              <TabsContent value="users" className="mt-4 space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="overflow-x-auto -mx-4 px-4">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Apps
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Awarded
                        </TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Joined
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {u.display_name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate text-sm">
                                  {u.display_name || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate sm:hidden">
                                  {u.scholarship_count} apps
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {u.scholarship_count}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {u.total_awarded
                              ? `$${u.total_awarded.toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                u.role === "admin" ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                            {format(new Date(u.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => viewUserDetail(u)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  toggleRole(u.user_id, u.role || "user")
                                }
                                title={
                                  u.role === "admin"
                                    ? "Demote to user"
                                    : "Promote to admin"
                                }
                              >
                                <Shield className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Applications Tab */}
              <TabsContent value="applications" className="mt-4 space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search applications..."
                    value={searchScholarships}
                    onChange={(e) => setSearchScholarships(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="overflow-x-auto -mx-4 px-4">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Organization
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Amount
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Deadline
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScholarships.slice(0, 100).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium truncate text-sm max-w-[200px]">
                                {s.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate sm:hidden">
                                {s.organization || "—"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-[150px]">
                            {s.organization || "—"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={s.status}
                              onValueChange={(v) =>
                                updateScholarshipStatus(
                                  s.id,
                                  v as ScholarshipStatus,
                                )
                              }
                            >
                              <SelectTrigger
                                className={`h-7 text-xs w-auto gap-1 border-0 ${statusColors[s.status]}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusLabels).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>
                                    {v}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {s.amount
                              ? `$${Number(s.amount).toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {s.deadline
                              ? format(new Date(s.deadline), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedScholarship(s)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteScholarship(s.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredScholarships.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Showing first 100 of {filteredScholarships.length}{" "}
                    applications
                  </p>
                )}
              </TabsContent>

              {/* Community Tab */}
              <TabsContent value="community" className="mt-4 space-y-3">
                {posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No community posts yet
                  </p>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">
                                {post.user_email}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(post.created_at),
                                  "MMM d, yyyy",
                                )}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2">
                              {post.content}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0"
                            onClick={() => deletePost(post.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {/* Replies for this post */}
                        <PostReplies postId={post.id} />
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>

            {/* User Detail Dialog */}
            <Dialog
              open={!!selectedUser}
              onOpenChange={(open) => !open && setSelectedUser(null)}
            >
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {selectedUser?.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    {selectedUser?.display_name || "Unknown User"}
                  </DialogTitle>
                </DialogHeader>
                {selectedUser && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Role</p>
                        <Badge
                          variant={
                            selectedUser.role === "admin"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedUser.role}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Joined</p>
                        <p className="font-medium">
                          {format(
                            new Date(selectedUser.created_at),
                            "MMM d, yyyy",
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Major</p>
                        <p className="font-medium">
                          {selectedUser.major || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">GPA</p>
                        <p className="font-medium">{selectedUser.gpa || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Education Level
                        </p>
                        <p className="font-medium">
                          {selectedUser.education_level || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Applications
                        </p>
                        <p className="font-medium">
                          {selectedUser.scholarship_count}
                        </p>
                      </div>
                    </div>

                    {selectedUser.skills && selectedUser.skills.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedUser.skills.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-xs"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedUser.bio && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Bio
                        </p>
                        <p className="text-sm">{selectedUser.bio}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Applications ({userScholarships.length})
                      </p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {userScholarships.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {s.organization || "—"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {s.amount && (
                                <span className="text-xs font-semibold">
                                  ${Number(s.amount).toLocaleString()}
                                </span>
                              )}
                              <Badge
                                className={`text-xs ${statusColors[s.status]}`}
                              >
                                {statusLabels[s.status]}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {userScholarships.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No applications
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Scholarship Detail Dialog */}
            <Dialog
              open={!!selectedScholarship}
              onOpenChange={(open) => !open && setSelectedScholarship(null)}
            >
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="break-words">
                    {selectedScholarship?.name}
                  </DialogTitle>
                </DialogHeader>
                {selectedScholarship && (
                  <div className="space-y-3 text-sm">
                    {/* Owner */}
                    <div>
                      <p className="text-muted-foreground text-xs">Owner</p>
                      <p className="font-medium">
                        {users.find(
                          (u) => u.user_id === selectedScholarship.user_id,
                        )?.display_name || selectedScholarship.user_id}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Organization
                        </p>
                        <p className="font-medium">
                          {selectedScholarship.organization || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Amount</p>
                        <p className="font-medium">
                          {selectedScholarship.amount
                            ? `$${Number(selectedScholarship.amount).toLocaleString()}`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Deadline
                        </p>
                        <p className="font-medium">
                          {selectedScholarship.deadline
                            ? format(
                                new Date(selectedScholarship.deadline),
                                "MMM d, yyyy",
                              )
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Status</p>
                        <Badge
                          className={statusColors[selectedScholarship.status]}
                        >
                          {statusLabels[selectedScholarship.status]}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Shared</p>
                        <p className="font-medium">
                          {selectedScholarship.is_shared ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Favorited
                        </p>
                        <p className="font-medium">
                          {selectedScholarship.is_favorited ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    {selectedScholarship.tags &&
                      selectedScholarship.tags.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Tags
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedScholarship.tags.map((t) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="text-xs"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {selectedScholarship.eligibility_notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Eligibility Notes
                        </p>
                        <p className="whitespace-pre-wrap">
                          {selectedScholarship.eligibility_notes}
                        </p>
                      </div>
                    )}

                    {selectedScholarship.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Notes
                        </p>
                        <p className="whitespace-pre-wrap">
                          {selectedScholarship.notes}
                        </p>
                      </div>
                    )}

                    {selectedScholarship.link && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Link
                        </p>
                        <a
                          href={selectedScholarship.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline break-all"
                        >
                          {selectedScholarship.link}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}


