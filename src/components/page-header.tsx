"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/posts": "Posts",
  "/connect": "Connect",
  "/settings": "Settings",
};

export function PageHeader() {
  const pathname = usePathname();

  const isPostDetail = pathname.startsWith("/posts/") && pathname !== "/posts";
  const title = isPostDetail ? "Post Detail" : PAGE_TITLES[pathname] || "Page";
  const isNested = isPostDetail;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {isNested && (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/posts">Posts</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
