"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Info, List, MoveLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const isDetailPage = pathname.startsWith("/gruppe/");

  return (
    <header
      className={cn(
        "flex items-center gap-4 px-4 h-14 shrink-0 z-40",
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
          className="h-11 w-auto -translate-y-px"
        />
      </Link>

      <div
        className={cn("flex items-center gap-1 shrink-0 ml-auto")}
      >
        {isDetailPage && (
          <Link
            href="/"
            aria-label="Tilbage til kort"
            title="Tilbage til kort"
            className={buttonVariants({ variant: "link" })}
          >
            <MoveLeft className="h-5 w-5" />
            Kort
          </Link>
        )}
        <Link
          href="/liste"
          aria-label="Listevisning"
          title="Listevisning"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "bg-neutral-100 hover:bg-neutral-200"
          )}
        >
          <List className="h-5 w-5" />
        </Link>
        <Link
          href="/om"
          aria-label="Om appen"
          title="Om appen"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "bg-neutral-100 hover:bg-neutral-200"
          )}
        >
          <Info className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
