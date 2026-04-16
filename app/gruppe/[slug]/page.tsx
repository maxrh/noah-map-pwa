"use client";

export const runtime = "edge";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSearch } from "@/lib/search-context";
import { PageWrapper } from "@/components/layout/page-wrapper";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  TypographyH1,
  TypographyH3,
  TypographyP,
  TypographyMuted,
} from "@/components/ui/typography";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MoveRight, MapPin } from "lucide-react";

function GroupImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="absolute inset-0 bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Billede kunne ikke indlæses</span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <Skeleton className="absolute inset-0 rounded-none flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Indlæser...</span>
        </Skeleton>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

export default function GroupDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { groups, loading } = useSearch();
  const group = useMemo(() => groups.find((g) => g.slug === slug) ?? null, [groups, slug]);
  const notFound = !loading && !group;

  if (loading)
    return (
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <div className="relative h-56 md:h-auto md:w-1/2 shrink-0">
          <Skeleton className="absolute inset-0 rounded-none flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Indlæser...</span>
          </Skeleton>
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
      <PageWrapper>
        <TypographyH3 className="mb-4">Gruppe ikke fundet</TypographyH3>
        <Link href="/">
          <Button variant="outline">Tilbage til kort</Button>
        </Link>
      </PageWrapper>
    );

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0">
      {/* Left side – fixed image */}
      <div className="relative h-56 md:h-auto md:w-1/2 md:sticky md:top-0 shrink-0">
        {group.image ? (
          <GroupImage src={group.image} alt={group.name} />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Intet billede</span>
          </div>
        )}
      </div>

      {/* Right side – scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 animate-in fade-in duration-300">
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
            <Link href={`/?flyTo=${group.slug}`}>
              <Button size="lg" variant="secondary"><MapPin /> Vis på kort</Button>
            </Link>
            {group.link && (
              <Link href={group.link} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="secondary">Besøg hjemmeside <MoveRight /></Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
