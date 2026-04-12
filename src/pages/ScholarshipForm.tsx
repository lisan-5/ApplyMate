import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Sparkles,
  Globe,
  FileText,
  Loader2,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import type { Database } from "@/integrations/backend/types";

type ScholarshipStatus = Database["public"]["Enums"]["scholarship_status"];

export default function ScholarshipForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType =
    searchParams.get("type") === "job" ? "job" : "scholarship";
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [applicationType, setApplicationType] = useState<"scholarship" | "job">(
    initialType,
  );

  const [form, setForm] = useState({
    name: "",
    organization: "",
    amount: "",
    deadline: "",
    link: "",
    status: "saved" as ScholarshipStatus,
    eligibility_notes: "",
    tags: "",
    notes: "",
  });

  const handleExtract = async (mode: "text" | "url") => {
    const payload = mode === "text" ? { text: pasteText } : { url: pasteUrl };

    if (mode === "text" && !pasteText.trim()) {
      toast({ title: "Paste some text first", variant: "destructive" });
      return;
    }
    if (mode === "url" && !pasteUrl.trim()) {
      toast({ title: "Enter a URL first", variant: "destructive" });
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await api.functions.invoke(
        "parse-scholarship",
        {
          body: payload,
        },
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      const d = data.data;
      setForm((prev) => ({
        ...prev,
        name: d.name || prev.name,
        organization: d.organization || prev.organization,
        amount: d.amount != null ? String(d.amount) : prev.amount,
        deadline: d.deadline || prev.deadline,
        link: d.link || prev.link,
        eligibility_notes: d.eligibility_notes || prev.eligibility_notes,
        tags: Array.isArray(d.tags) ? d.tags.join(", ") : prev.tags,
      }));

      toast({ title: "Fields auto-filled — review and save!" });
    } catch (err: any) {
      console.error("Extraction error:", err);
      toast({
        title: "Extraction failed",
        description: err.message || "Could not extract details",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    const { error } = await api.from("scholarships").insert({
      user_id: user.id,
      name: form.name,
      organization: form.organization || null,
      amount: form.amount ? parseFloat(form.amount) : null,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      link: form.link || null,
      status: form.status,
      eligibility_notes: form.eligibility_notes || null,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      notes: form.notes || null,
      application_type: applicationType,
    } as any);

    setSubmitting(false);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: `${applicationType === "scholarship" ? "Scholarship" : "Job application"} added!`,
      });
      navigate("/scholarships");
    }
  };

  const isScholarship = applicationType === "scholarship";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Type Switcher */}
        <div className="flex gap-3">
          <button
            onClick={() => setApplicationType("scholarship")}
            className={`flex-1 rounded-2xl p-4 glass-card border-0 transition-all duration-300 relative overflow-hidden ${
              isScholarship
                ? "ring-2 ring-zinc-400/50"
                : "hover:ring-1 hover:ring-border"
            }`}
          >
            {isScholarship && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(0 0% 90% / 0.12), transparent)",
                }}
              />
            )}
            <div className="relative flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${isScholarship ? "bg-zinc-200/20" : "bg-muted/50"}`}
              >
                <GraduationCap
                  className={`h-5 w-5 ${isScholarship ? "text-zinc-200" : "text-muted-foreground"}`}
                />
              </div>
              <span
                className={`font-semibold text-sm ${isScholarship ? "text-foreground" : "text-muted-foreground"}`}
              >
                Scholarship
              </span>
            </div>
          </button>
          <button
            onClick={() => setApplicationType("job")}
            className={`flex-1 rounded-2xl p-4 glass-card border-0 transition-all duration-300 relative overflow-hidden ${
              !isScholarship
                ? "ring-2 ring-zinc-500/50"
                : "hover:ring-1 hover:ring-border"
            }`}
          >
            {!isScholarship && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(0 0% 60% / 0.12), transparent)",
                }}
              />
            )}
            <div className="relative flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${!isScholarship ? "bg-zinc-500/20" : "bg-muted/50"}`}
              >
                <Briefcase
                  className={`h-5 w-5 ${!isScholarship ? "text-zinc-300" : "text-muted-foreground"}`}
                />
              </div>
              <span
                className={`font-semibold text-sm ${!isScholarship ? "text-foreground" : "text-muted-foreground"}`}
              >
                Job Application
              </span>
            </div>
          </button>
        </div>

        {/* Smart Import Section */}
        <Card className="glass-card rounded-2xl border-0 gradient-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Import
            </CardTitle>
            <CardDescription>
              Paste {isScholarship ? "scholarship" : "job listing"} text or a
              URL and let AI fill in the details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text">
              <TabsList className="w-full">
                <TabsTrigger value="text" className="flex-1 gap-2">
                  <FileText className="h-4 w-4" />
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1 gap-2">
                  <Globe className="h-4 w-4" />
                  From URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3 mt-3">
                <Textarea
                  placeholder={`Paste ${isScholarship ? "scholarship" : "job"} details from an email, website, etc...`}
                  className="min-h-[120px] rounded-xl"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  disabled={extracting}
                />
                <Button
                  onClick={() => handleExtract("text")}
                  disabled={extracting || !pasteText.trim()}
                  className="w-full gap-2 rounded-xl gradient-primary border-0 text-white"
                >
                  {extracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {extracting ? "Extracting..." : "Extract Details"}
                </Button>
              </TabsContent>

              <TabsContent value="url" className="space-y-3 mt-3">
                <Input
                  type="url"
                  placeholder="https://example.com/listing-page"
                  value={pasteUrl}
                  onChange={(e) => setPasteUrl(e.target.value)}
                  disabled={extracting}
                  className="rounded-xl"
                />
                <Button
                  onClick={() => handleExtract("url")}
                  disabled={extracting || !pasteUrl.trim()}
                  className="w-full gap-2 rounded-xl gradient-primary border-0 text-white"
                >
                  {extracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  {extracting ? "Fetching & Extracting..." : "Fetch & Extract"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isScholarship ? (
                <GraduationCap className="h-5 w-5 text-zinc-200" />
              ) : (
                <Briefcase className="h-5 w-5 text-zinc-300" />
              )}
              Add New {isScholarship ? "Scholarship" : "Job Application"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {isScholarship ? "Scholarship Name" : "Position Title"} *
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">
                    {isScholarship ? "Organization" : "Company"}
                  </Label>
                  <Input
                    id="organization"
                    value={form.organization}
                    onChange={(e) =>
                      setForm({ ...form, organization: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {isScholarship ? "Amount ($)" : "Salary ($)"}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(e) =>
                      setForm({ ...form, deadline: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm({ ...form, status: v as ScholarshipStatus })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="awarded">Awarded</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">Application Link</Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="https://..."
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder={
                    isScholarship
                      ? "STEM, graduate, need-based"
                      : "remote, full-time, engineering"
                  }
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eligibility">
                  {isScholarship ? "Eligibility Notes" : "Requirements"}
                </Label>
                <Textarea
                  id="eligibility"
                  value={form.eligibility_notes}
                  onChange={(e) =>
                    setForm({ ...form, eligibility_notes: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Draft ideas, requirements, etc."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl gradient-primary border-0 text-white h-11 font-semibold glow"
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : `Save ${isScholarship ? "Scholarship" : "Job Application"}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


