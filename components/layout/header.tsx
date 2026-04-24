"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Info, List, MoveLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
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
        "flex items-center gap-4 px-4 h-19 shrink-0 z-40",
        transparent
          ? "bg-transparent"
          : "bg-background border-b"
      )}
    >
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <Image
          src="/Logo_NOAH_2020_small.png"
          alt="NOAH logo"
          width={650}
          height={265}
          priority
          className="h-14 w-auto -translate-y-px"
        />
      </Link>

      <div
        className={cn("flex items-center gap-2 shrink-0 ml-auto")}
      >
        {isSubPage && (
          <Button
            variant="default"
            size="icon"
            aria-label="Tilbage"
            title="Tilbage"
            onClick={handleBack}
          >
            <MoveLeft className="size-5" />
          </Button>
        )}
        <Link
          href="/om"
          aria-label="Om appen"
          title="Om appen"
          className={buttonVariants({ variant: "secondary", size: "icon" })}
        >
          <Info className="size-5" />
        </Link>
        <Link
          href="/liste"
          aria-label="Listevisning"
          title="Listevisning"
          className={buttonVariants({ variant: "secondary", size: "icon" })}
        >
          <List className="size-5" />
        </Link>
        
      </div>
    </header>
  );
}
