import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Link2, Brain, Download, Loader2 } from "lucide-react";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onBriefRequest: () => void;
  briefLoading: boolean;
  scholarships: any[];
}

export function QuickActions({ onBriefRequest, briefLoading, scholarships }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scanOpen, setScanOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    if (!url.trim() || !user) return;
    setScanning(true);
    try {
      const { data, error } = await api.functions.invoke("parse-scholarship", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (data?.name) {
        await api.from("scholarships").insert({
          user_id: user.id,
          name: data.name,
          organization: data.organization || null,
          amount: data.amount || null,
          deadline: data.deadline || null,
          link: url.trim(),
          eligibility_notes: data.eligibility || null,
          notes: data.description || null,
        });
        toast({ title: "Scholarship imported!" });
        setScanOpen(false);
        setUrl("");
        window.location.reload();
      } else {
        toast({ title: "Couldn't parse", description: "No scholarship data found at that URL.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const exportCSV = () => {
    if (!scholarships.length) {
      toast({ title: "Nothing to export" });
      return;
    }
    const headers = ["Name", "Organization", "Amount", "Deadline", "Status", "Tags"];
    const rows = scholarships.map((s) => [
      s.name, s.organization || "", s.amount || "", s.deadline || "", s.status, (s.tags || []).join("; "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `applymate-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast({ title: "Exported!" });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link to="/scholarships/new">
          <Button size="sm" className="rounded-full h-9 gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/5">
            <Plus className="h-3.5 w-3.5" /> Add Application
          </Button>
        </Link>
        <Button size="sm" variant="outline" className="rounded-full h-9 gap-2" onClick={() => setScanOpen(true)}>
          <Link2 className="h-3.5 w-3.5" /> Scan URL
        </Button>
        <Button size="sm" variant="outline" className="rounded-full h-9 gap-2" onClick={onBriefRequest} disabled={briefLoading}>
          {briefLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          AI Brief
        </Button>
        <Button size="sm" variant="outline" className="rounded-full h-9 gap-2" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Scan Scholarship URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl"
            />
            <Button onClick={handleScan} disabled={scanning || !url.trim()} className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
              {scanning ? "Scanning..." : "Import Scholarship"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


