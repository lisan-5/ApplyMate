import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Lock,
  FileText,
  Eye,
  EyeOff,
  Download,
  Loader2,
  Copy,
  Check,
  WandSparkles,
} from "lucide-react";
import { ProfileEditor } from "@/components/ProfileEditor";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);

  const hasMinLength = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const strengthScore = [
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
  ].filter(Boolean).length;

  const strengthLabel =
    strengthScore <= 1
      ? "Weak"
      : strengthScore <= 3
        ? "Fair"
        : strengthScore === 4
          ? "Good"
          : "Strong";

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await api
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url || "");
      setProfileData(data);
    }
    setLoadingProfile(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await api
      .from("profiles")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Profile updated!" });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await api.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Password updated!" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const generateStrongPassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+[]{}-=";
    let generated = "";
    for (let i = 0; i < 16; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    toast({ title: "Strong password generated" });
  };

  const handleCopyUserId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 1500);
      toast({ title: "User ID copied" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access is blocked in this browser.",
        variant: "destructive",
      });
    }
  };

  const handleExportMyData = async () => {
    if (!user) return;
    setExportingData(true);
    try {
      const [
        { data: profileSnapshot, error: profileError },
        { data: scholarshipsSnapshot, error: scholarshipsError },
      ] = await Promise.all([
        api
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        api
          .from("scholarships")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (scholarshipsError) throw scholarshipsError;

      const payload = {
        exported_at: new Date().toISOString(),
        account: {
          user_id: user.id,
          email: user.email,
        },
        profile: profileSnapshot,
        scholarships: scholarshipsSnapshot || [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `applymate-data-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({ title: "Data export ready" });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Unable to export your data right now.",
        variant: "destructive",
      });
    } finally {
      setExportingData(false);
    }
  };

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 w-full min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Settings
        </h1>

        <Tabs defaultValue="profile">
          <TabsList className="w-full sm:w-auto flex overflow-x-auto rounded-xl bg-muted/50 p-1">
            <TabsTrigger
              value="profile"
              className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none rounded-lg"
            >
              <User className="h-4 w-4" /> Account
            </TabsTrigger>
            <TabsTrigger
              value="cv"
              className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none rounded-lg"
            >
              <FileText className="h-4 w-4" /> Profile & CV
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none rounded-lg"
            >
              <Lock className="h-4 w-4" /> Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-6">
            <Card className="glass-card rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-foreground/5">
                    <User className="h-4 w-4" />
                  </div>
                  Account
                </CardTitle>
                <CardDescription>
                  Your basic account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="text-lg font-bold bg-foreground/5">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {displayName || "No display name"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avatar URL</Label>
                    <Input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded-xl bg-foreground text-background hover:bg-foreground/90"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>

                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportMyData}
                    disabled={exportingData}
                    className="rounded-xl"
                  >
                    {exportingData ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Export My Data
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyUserId}
                    className="rounded-xl"
                  >
                    {copiedUserId ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copiedUserId ? "Copied User ID" : "Copy User ID"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cv" className="mt-4">
            {loadingProfile ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              </div>
            ) : (
              <ProfileEditor
                initialData={profileData || {}}
                onSaved={fetchProfile}
              />
            )}
          </TabsContent>

          <TabsContent value="security" className="mt-4 space-y-6">
            <Card className="glass-card rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-foreground/5">
                    <Lock className="h-4 w-4" />
                  </div>
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>New Password</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-lg px-2.5 text-xs"
                      onClick={generateStrongPassword}
                    >
                      <WandSparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generate
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="rounded-xl pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(strengthScore / 5) * 100}%`,
                            background:
                              strengthScore <= 2
                                ? "hsl(var(--destructive))"
                                : strengthScore <= 3
                                  ? "hsl(var(--warning))"
                                  : "hsl(var(--success))",
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Strength: {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="rounded-xl pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  variant="outline"
                  className="rounded-xl"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={signOut}
                  className="rounded-xl"
                >
                  Sign Out of All Devices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}


