"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

function breadcrumbFor(pathname: string) {
  if (pathname === "/invoices/upload") return { parent: "Invoices", parentHref: "/invoices", current: "Upload" };
  if (/^\/invoices\/[^/]+$/.test(pathname)) return { parent: "Invoices", parentHref: "/invoices", current: "Invoice details" };
  if (pathname.startsWith("/suppliers")) return { current: "Suppliers" };
  return { current: "Invoices" };
}

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumb = breadcrumbFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <span className="mr-2 h-4 w-px bg-border" aria-hidden="true" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {breadcrumb.parent && (
            <>
              <BreadcrumbItem className="hidden sm:inline-flex"><BreadcrumbLink href={breadcrumb.parentHref}>{breadcrumb.parent}</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:list-item" />
            </>
          )}
          <BreadcrumbItem className="min-w-0"><BreadcrumbPage className="truncate">{breadcrumb.current}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <ThemeToggle />
    </header>
  );
}
