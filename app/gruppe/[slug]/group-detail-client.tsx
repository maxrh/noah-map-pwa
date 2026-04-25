"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearch } from "@/lib/search-context";
import { buttonVariants } from "@/components/ui/button";
import { ErrorPage } from "@/components/layout/error-page";
import {
  TypographyH1,
  TypographyP,
  TypographyMuted,
} from "@/components/ui/typography";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MoveRight, MapPin, MoveLeft, List } from "lucide-react";

function GroupImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        role="img"
        aria-label={`Billede af ${alt} kunne ikke indlæses`}
        className="absolute inset-0 bg-muted flex items-center justify-center"
      >
        <span className="text-muted-foreground text-sm">Billede ikke tilgængeligt offline</span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        unoptimized
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`object-cover object-top md:object-contain md:object-top transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

export function GroupDetailClient({ slug }: { slug: string }) {
  const { groups, loading } = useSearch();
  const group = useMemo(() => groups.find((g) => g.slug === slug) ?? null, [groups, slug]);
  // Stay in loading state until we actually have groups to search through.
  // Prevents a flash of "ikke fundet" when the cached shell hydrates with an
  // empty groups array before the localStorage read has resolved.
  const stillBooting = loading || groups.length === 0;
  const notFound = !stillBooting && !group;

  if (stillBooting)
    return (
      <div
        className="flex flex-col md:flex-row flex-1 min-h-0"
        aria-busy="true"
        aria-live="polite"
        aria-label="Indlæser gruppe"
      >
        <div className="relative h-56 md:h-auto md:w-1/2 shrink-0">
          <Skeleton className="absolute inset-0 rounded-none" />
        </div>
        <div className="flex-1 p-6 md:p-12">
          <div className="max-w-xl mx-auto">
            <Skeleton className="h-8 w-28 rounded-4xl mb-10" />
            <Skeleton className="h-9 w-3/4 mb-3" />
            <Skeleton className="h-5 w-1/2 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex gap-1 mt-6">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-44" />
            </div>
          </div>
        </div>
      </div>
    );

  if (notFound || !group)
    return (
      <ErrorPage
        title="Gruppe ikke fundet"
        description="Vi kunne ikke finde den gruppe, du leder efter."
        actions={[
          { label: "Tilbage til kort", href: "/", icon: <MoveLeft /> },
          { label: "Se liste", href: "/liste", icon: <List /> },
        ]}
      />
    );

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0">
      {/* Left side – fixed image */}
      <div className="relative h-56 md:h-auto md:w-1/2 md:sticky md:top-0 shrink-0 md:bg-secondary">
        {group.image ? (
          <GroupImage src={group.image} alt={group.name} />
        ) : (
          <div
            role="img"
            aria-label={`Intet billede af ${group.name}`}
            className="absolute inset-0 bg-muted flex items-center justify-center"
          >
            <span className="text-muted-foreground text-sm">Intet billede</span>
          </div>
        )}
      </div>

      {/* Right side – scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 pb-16 md:p-12 md:pb-24 animate-in fade-in duration-300">
        <div className="max-w-xl mx-auto">
          <CategoryBadge
            category={group.category}
            iconName={group.categoryIcon}
            className="mb-10"
          />

          <TypographyH1 className="mb-3">{group.name}</TypographyH1>

          <TypographyMuted className="mb-4">{group.address}</TypographyMuted>

          <TypographyP className="whitespace-pre-line">
            {group.description}
          </TypographyP>

          <div className="flex flex-wrap gap-1 mt-6">
            <Link
              href={`/?flyTo=${group.slug}`}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <MapPin /> Vis på kort
            </Link>
            {group.link && (
              <Link
                href={group.link}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Besøg hjemmeside <MoveRight />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
