import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import type { Tables } from "@/integrations/backend/types";

type Profile = Tables<"profiles">;

export default function AdminUsers() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<(Profile & { role?: string; scholarship_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      const { data: profilesData } = await api.from("profiles").select("*");
      const { data: roles } = await api.from("user_roles").select("*");

      const enriched = (profilesData || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.user_id)?.role || "user",
      }));

      setProfiles(enriched);
      setLoading(false);
    };
    fetchData();
  }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">View and manage all registered users</p>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {p.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium">{p.display_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.role === "admin" ? "default" : "secondary"}>
                          {p.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(p.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


