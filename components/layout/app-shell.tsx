"use client";

import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {

  return (
    <div className="flex flex-col h-dvh text-foreground">
        {/* Main Navigation */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col">
        {children}
      </main>

    </div>
  );
}
