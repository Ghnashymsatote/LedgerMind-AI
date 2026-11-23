import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { CurrentUser } from "@/features/auth/types/auth.types";

export function DashboardShell({
  user,
  defaultOpen,
  children,
}: {
  user: CurrentUser;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <SidebarInset>
        <AppHeader />
        <div id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-9">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
