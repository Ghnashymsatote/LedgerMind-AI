"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useLogout } from "@/features/auth/hooks/use-logout";
import type { CurrentUser } from "@/features/auth/types/auth.types";

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function AccountMenu({ user }: { user: CurrentUser }) {
  const logout = useLogout();
  const { isMobile } = useSidebar();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton aria-label={`Open account menu for ${user.email}`} className="h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" tooltip="Account menu">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground" aria-hidden="true">{initials(user.email)}</span>
                <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.email}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.role === "ADMIN" ? "Administrator" : "Operator"}</span>
                </span>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
              <DropdownMenuLabel className="font-normal">
                <span className="grid gap-0.5">
                  <span className="truncate text-sm font-medium">{user.email}</span>
                  <span className="text-xs text-muted-foreground">{user.role === "ADMIN" ? "Administrator" : "Operator"}</span>
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={logout.isPending || logout.isSuccess} onSelect={() => logout.mutate()}>
                <LogOut />
                {logout.isPending || logout.isSuccess ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      {logout.error && <p className="px-2 pb-1 text-xs text-destructive" role="alert">{logout.error.message}</p>}
    </>
  );
}
