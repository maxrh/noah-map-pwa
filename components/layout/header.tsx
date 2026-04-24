"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Info, List, MoveLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useSearch } from "@/lib/search-context";
import { cn } from "@/lib/utils";

export function Header({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resetView } = useSearch();
  const isSubPage = pathname !== "/";

  function handleBack() {
    // Fall back to home when there's no in-app history (deep link / PWA launch)
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <header
      className={cn(
        "flex items-center gap-4 px-4 h-19 shrink-0 z-40 border-b",
        transparent
          ? "bg-transparent border-transparent"
          : "bg-background"
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-2 shrink-0 rounded-sm focus-ring"
        onClick={(e) => {
          // When already on the map page, soft-reset filters + map view
          // instead of doing a hard reload — preserves PWA app-shell feel.
          if (pathname === "/") {
            e.preventDefault();
            resetView();
          }
        }}
      >
        <Image
          src="/Logo_NOAH_2020_small.png"
          alt="NOAH logo"
          width={650}
          height={265}
          priority
          className="h-14 w-auto -translate-y-px"
        />
      </Link>

      <nav
        aria-label="Hovednavigation"
        className={cn("flex items-center gap-2 shrink-0 ml-auto", transparent && "[&>*]:shadow-md")}
      >
        {isSubPage && (
          <Button
            variant="default"
            size="icon"
            aria-label="Tilbage"
            title="Tilbage"
            onClick={handleBack}
            className="hover:bg-accent"
          >
            <MoveLeft className="size-5" />
          </Button>
        )}
        <Link
          href="/om"
          aria-label="Om appen"
          title="Om appen"
          className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "hover:bg-border")}
        >
          <Info className="size-5" />
        </Link>
        <Link
          href="/liste"
          aria-label="Listevisning"
          title="Listevisning"
          className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "hover:bg-border")}
        >
          <List className="size-5" />
        </Link>
      </nav>
    </header>
  );
}
