import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Plus, LayoutDashboard, Settings, Users, Search, FileText,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [scholarships, setScholarships] = useState<{ id: string; name: string }[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    api
      .from("scholarships")
      .select("id, name")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setScholarships(data || []));
  }, [open, user]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search applications, navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/scholarships/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Application
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/scholarships")}>
            <Search className="mr-2 h-4 w-4" /> View All Applications
          </CommandItem>
          <CommandItem onSelect={() => go("/community")}>
            <Users className="mr-2 h-4 w-4" /> Community
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>
        {scholarships.length > 0 && (
          <CommandGroup heading="Applications">
            {scholarships.map((s) => (
              <CommandItem key={s.id} onSelect={() => go(`/scholarships/${s.id}`)}>
                <FileText className="mr-2 h-4 w-4" /> {s.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}


