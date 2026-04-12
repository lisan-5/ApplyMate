import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { CommandPalette } from "@/components/CommandPalette";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background relative">
      <AppSidebar />
      <div className="flex-1 flex flex-col relative min-w-0 md:pl-64">
        {/* Ambient mesh gradient */}
        <div className="absolute inset-0 mesh-gradient pointer-events-none opacity-75" />
        <div className="absolute inset-x-0 top-0 h-24 pointer-events-none bg-gradient-to-b from-white/[0.04] to-transparent" />
        <div className="absolute left-[12%] top-20 h-48 w-48 rounded-full bg-[hsl(var(--gradient-start)/0.08)] blur-3xl pointer-events-none animate-soft-float" />
        <div className="absolute right-[10%] top-40 h-64 w-64 rounded-full bg-[hsl(var(--gradient-end)/0.08)] blur-3xl pointer-events-none animate-soft-float-delayed" />
        <MobileNav />
        <main className="page-shell relative flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}

