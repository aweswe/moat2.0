import React from "react";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsMobileNav } from "@/components/docs/DocsMobileNav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background pt-16 mt-8">
      <div className="max-w-7xl mx-auto px-8 w-full flex-grow flex flex-col lg:flex-row gap-8 lg:gap-12 py-12">
        <DocsSidebar />
        <main className="flex-grow min-w-0 max-w-4xl pb-24">
          <DocsMobileNav />
          <div className="prose prose-slate dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
