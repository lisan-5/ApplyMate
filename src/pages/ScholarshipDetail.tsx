import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Trash2,
  ExternalLink,
  Share2,
  Upload,
  Archive,
  ArchiveRestore,
  Star,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EssayAssistant } from "@/components/EssayAssistant";
import { SuccessMeter } from "@/components/SuccessMeter";
import { ApplicationChecklist } from "@/components/ApplicationChecklist";
import { NotesSummary } from "@/components/NotesSummary";
import { ApplicationProgressCard } from "@/components/ApplicationProgressCard";
import { EssayLibrary } from "@/components/EssayLibrary";
import type { Database, Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;
type ScholarshipFile = Tables<"scholarship_files">;
type ChecklistItem = Tables<"application_checklist">;
type ScholarshipStatus = Database["public"]["Enums"]["scholarship_status"];

const statusLabels: Record<string, string> = {
  saved: "Saved",
  in_progress: "In Progress",
  submitted: "Submitted",
  awarded: "Awarded",
  rejected: "Rejected",
  archived: "Archived",
};

export default function ScholarshipDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [files, setFiles] = useState<ScholarshipFile[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assistantSeed, setAssistantSeed] = useState("");
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

  useEffect(() => {
    if (!id || !user) return;

    Promise.all([
      api.from("scholarships").select("*").eq("id", id).single(),
      api.from("scholarship_files").select("*").eq("scholarship_id", id),
      api
        .from("application_checklist")
        .select("*")
        .eq("scholarship_id", id)
        .eq("user_id", user.id)
        .order("position", { ascending: true }),
    ])
      .then(([{ data: scholarshipData }, { data: fileData }, { data: checklistData }]) => {
        if (scholarshipData) {
          setScholarship(scholarshipData);
          setForm({
            name: scholarshipData.name,
            organization: scholarshipData.organization || "",
            amount: scholarshipData.amount?.toString() || "",
            deadline: scholarshipData.deadline
              ? format(new Date(scholarshipData.deadline), "yyyy-MM-dd")
              : "",
            link: scholarshipData.link || "",
            status: scholarshipData.status,
            eligibility_notes: scholarshipData.eligibility_notes || "",
            tags: scholarshipData.tags?.join(", ") || "",
            notes: scholarshipData.notes || "",
          });
        }

        setFiles(fileData || []);
        setChecklistItems((checklistData as ChecklistItem[]) || []);
      })
      .catch((error: { message?: string }) => {
        toast({
          title: "Could not load application",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, user, toast]);

  const refreshScholarship = async () => {
    if (!id) return;
    const { data } = await api.from("scholarships").select("*").eq("id", id).single();
    if (data) {
      setScholarship(data);
    }
  };

  const handleUpdate = async () => {
    if (!id) return;

    const { error } = await api
      .from("scholarships")
      .update({
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
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        notes: form.notes || null,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Updated!" });
    setEditing(false);
    refreshScholarship();
  };

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await api.from("scholarships").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Deleted" });
    navigate("/scholarships");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !id) return;

    setUploading(true);
    const path = `${user.id}/${id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await api.storage.from("scholarship-files").upload(path, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    await api.from("scholarship_files").insert({
      scholarship_id: id,
      user_id: user.id,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
    });

    const { data } = await api.from("scholarship_files").select("*").eq("scholarship_id", id);
    setFiles(data || []);
    setUploading(false);
    toast({ title: "File uploaded!" });
  };

  const handleShare = async () => {
    if (!scholarship) return;

    if (!scholarship.is_shared) {
      await api.from("scholarships").update({ is_shared: true }).eq("id", scholarship.id);
      await refreshScholarship();
    }

    const url = `${window.location.origin}/shared/${scholarship.share_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share this link with friends" });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!scholarship) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Application not found.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5 w-full min-w-0">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/scholarships")}
              className="gap-2 w-fit rounded-xl"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <button
              onClick={async () => {
                const newVal = !scholarship.is_favorited;
                await api
                  .from("scholarships")
                  .update({ is_favorited: newVal })
                  .eq("id", scholarship.id);
                setScholarship({ ...scholarship, is_favorited: newVal });
              }}
              className="p-2 rounded-xl hover:bg-accent transition-colors"
            >
              <Star
                className={`h-4 w-4 ${
                  scholarship.is_favorited
                    ? "text-amber-400 fill-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="rounded-xl">
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const newStatus = scholarship.status === "archived" ? "saved" : "archived";
                await api.from("scholarships").update({ status: newStatus }).eq("id", scholarship.id);
                setScholarship({ ...scholarship, status: newStatus as ScholarshipStatus });
                toast({ title: newStatus === "archived" ? "Archived" : "Restored" });
              }}
              className="gap-1 rounded-xl"
            >
              {scholarship.status === "archived" ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {scholarship.status === "archived" ? "Restore" : "Archive"}
            </Button>
            {!editing ? (
              <Button
                size="sm"
                onClick={() => setEditing(true)}
                className="rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                Edit
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  className="rounded-xl bg-foreground text-background hover:bg-foreground/90"
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="glass-card rounded-2xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editing ? (
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="rounded-xl"
                />
              ) : (
                <>
                  {scholarship.name}
                  {scholarship.link && (
                    <a href={scholarship.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  )}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input
                      value={form.organization}
                      onChange={(event) =>
                        setForm({ ...form, organization: event.target.value })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={(event) => setForm({ ...form, amount: event.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Input
                      type="date"
                      value={form.deadline}
                      onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm({ ...form, status: value as ScholarshipStatus })
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Link</Label>
                  <Input
                    value={form.link}
                    onChange={(event) => setForm({ ...form, link: event.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={form.tags}
                    onChange={(event) => setForm({ ...form, tags: event.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Eligibility Notes</Label>
                  <Textarea
                    value={form.eligibility_notes}
                    onChange={(event) =>
                      setForm({ ...form, eligibility_notes: event.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    rows={6}
                    className="rounded-xl"
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Organization:</span>{" "}
                  <span className="font-medium">{scholarship.organization || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-medium">
                    {scholarship.amount
                      ? `$${Number(scholarship.amount).toLocaleString()}`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Deadline:</span>{" "}
                  <span className="font-medium">
                    {scholarship.deadline
                      ? format(new Date(scholarship.deadline), "MMM d, yyyy")
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant="secondary" className="rounded-lg">
                    {statusLabels[scholarship.status]}
                  </Badge>
                </div>
                {scholarship.tags && scholarship.tags.length > 0 && (
                  <div className="col-span-2 flex gap-1 flex-wrap">
                    {scholarship.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-lg">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {scholarship.eligibility_notes && (
                  <div className="col-span-2 mt-2">
                    <p className="text-muted-foreground mb-1">Eligibility Notes</p>
                    <p className="whitespace-pre-wrap">{scholarship.eligibility_notes}</p>
                  </div>
                )}
                {scholarship.notes && (
                  <div className="col-span-2 mt-2">
                    <p className="text-muted-foreground mb-1">Notes</p>
                    <p className="whitespace-pre-wrap">{scholarship.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <NotesSummary scholarship={scholarship} />
        <ApplicationProgressCard
          scholarship={scholarship}
          checklistItems={checklistItems}
          files={files}
        />
        <SuccessMeter scholarship={scholarship} />
        <ApplicationChecklist scholarship={scholarship} onItemsChange={setChecklistItems} />
        <EssayLibrary scholarshipName={scholarship.name} onUseItem={setAssistantSeed} />
        <EssayAssistant
          scholarship={scholarship}
          seededInput={assistantSeed}
          onSeedConsumed={() => setAssistantSeed("")}
        />

        <Card className="glass-card rounded-2xl border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-foreground/5">
                <Upload className="h-3.5 w-3.5" />
              </div>
              Files
            </CardTitle>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button variant="outline" size="sm" asChild className="rounded-xl">
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading ? "Uploading..." : "Upload"}
                </span>
              </Button>
            </label>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded-xl border text-sm bg-muted/20"
                  >
                    <span className="truncate">{file.file_name}</span>
                    <span className="text-muted-foreground text-xs">
                      {file.file_size ? `${(file.file_size / 1024).toFixed(0)} KB` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
