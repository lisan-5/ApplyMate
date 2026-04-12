import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Share2,
  MessageCircle,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ApplyMateLogo } from "@/components/ApplyMateLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FolderOpen, label: "My Applications", href: "/scholarships" },
  { icon: Share2, label: "Shared with Me", href: "/shared" },
  { icon: MessageCircle, label: "Community", href: "/community" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const adminItems = [{ icon: Users, label: "Admin Panel", href: "/admin" }];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { isAdmin, signOut, user } = useAuth();

  return (
    <aside className="animate-fade-rise hidden h-screen w-64 flex-col overflow-hidden border-r border-sidebar-border/80 bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl md:fixed md:inset-y-0 md:left-0 md:flex z-20">
      {/* Top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full opacity-[0.15] blur-3xl pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--gradient-start)), hsl(var(--gradient-end)))",
        }}
      />

      <div className="relative flex items-center gap-3 px-6 py-5 border-b border-sidebar-border/80">
        <ApplyMateLogo size="md" className="text-primary" />
        <span
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          ApplyMate
        </span>
        <ThemeToggle className="ml-auto h-9 w-9 border-sidebar-border/80 bg-sidebar-accent/55" />
      </div>

      <nav className="relative flex-1 px-3 py-4 space-y-1">
        {!isAdmin &&
          navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "nav-link-motion relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "text-sidebar-primary-foreground bg-sidebar-accent"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30",
                )}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{
                      background:
                        "linear-gradient(180deg, hsl(var(--gradient-start)), hsl(var(--gradient-end)))",
                    }}
                  />
                )}
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active && "text-primary",
                  )}
                />
                {item.label}
              </Link>
            );
          })}

        {isAdmin && (
          <>
            <div className="pb-1 px-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30">
                Admin
              </span>
            </div>
            {adminItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "nav-link-motion flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="relative px-3 py-4 border-t border-sidebar-border/80 bg-sidebar/45">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-xs font-bold text-white shadow-sm glow-sm">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="nav-link-motion flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

