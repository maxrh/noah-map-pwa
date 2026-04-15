"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Info, List, MoveLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const isDetailPage = pathname.startsWith("/gruppe/");

  return (
    <header className="flex items-center gap-4 px-4 h-14 border-b bg-background shrink-0">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <Image
          src="/Logo_NOAH_2020_small.png"
          alt="NOAH logo"
          width={650}
          height={265}
          priority
          className="h-8 w-auto"
        />
      </Link>

      <div
        className={cn("flex items-center gap-1 shrink-0 ml-auto")}
      >
        {isDetailPage && (
          <Link
            href="/"
            aria-label="Tilbage til kort"
            className={buttonVariants({ variant: "link" })}
          >
            <MoveLeft className="h-5 w-5" />
            Kort
          </Link>
        )}
        <Link
          href="/liste"
          aria-label="Listevisning"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "bg-neutral-100 hover:bg-neutral-200"
          )}
        >
          <List className="h-5 w-5" />
        </Link>
        <Link
          href="/om"
          aria-label="Om NOAH"
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
