"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isMapPage = pathname === "/";

  return (
    <div className="relative flex flex-col h-dvh text-foreground">
      <Header transparent={isMapPage} />

      <main className={cn("flex-1 min-h-0 flex flex-col", isMapPage && "-mt-14")}>
        {children}
      </main>
    </div>
  );
}
