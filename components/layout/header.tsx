"use client";

import Link from "next/link";
import { List } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 h-14 border-b bg-background shrink-0">
      <Link href="/" className="text-lg font-bold tracking-tight">
        NOAH
      </Link>

      <Link
        href="/liste"
        aria-label="Listevisning"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <List className="h-5 w-5" />
      </Link>
    </header>
  );
}
