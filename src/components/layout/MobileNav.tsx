import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderOpen, Share2, MessageCircle, Settings, Menu, X, Users, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ApplyMateLogo } from "@/components/ApplyMateLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FolderOpen, label: "My Applications", href: "/scholarships" },
  { icon: Share2, label: "Shared", href: "/shared" },
  { icon: MessageCircle, label: "Community", href: "/community" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function MobileNav() {
  const { pathname } = useLocation();
  const { isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="animate-fade-rise border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden flex items-center justify-between px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <ApplyMateLogo size="sm" className="text-primary" />
          <span className="text-lg font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>ApplyMate</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="h-9 w-9 border-sidebar-border/80 bg-sidebar-accent/55" />
          <button onClick={() => setOpen(!open)} className="p-1 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="page-shell fixed inset-0 top-[57px] z-50 space-y-1 bg-sidebar/96 p-4 text-sidebar-foreground backdrop-blur-2xl md:hidden">
          {!isAdmin && navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "nav-link-motion flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/60"
                )}
              >
                <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className={cn(
                "nav-link-motion flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                pathname.startsWith("/admin") ? "bg-sidebar-accent text-sidebar-primary-foreground" : "text-sidebar-foreground/60"
              )}
            >
              <Users className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="nav-link-motion flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </>
  );
}

