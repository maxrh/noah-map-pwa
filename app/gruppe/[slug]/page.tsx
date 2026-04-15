"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchGroups, type Group } from "@/lib/groups";
import { PageWrapper } from "@/components/layout/page-wrapper";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  TypographyH1,
  TypographyH3,
  TypographyP,
  TypographyMuted,
} from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { MoveRight, MapPin } from "lucide-react";

export default function GroupDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchGroups()
      .then((groups) => {
        const found = groups.find((g) => g.slug === slug);
        if (found) {
          setGroup(found);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <PageWrapper>Loading...</PageWrapper>;
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
          <img
            src={group.image}
            alt={group.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Intet billede</span>
          </div>
        )}
      </div>

      {/* Right side – scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-xl mx-auto">
          <Badge variant="secondary" className="mb-6">
            {group.category}
          </Badge>

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
                <Button size="lg">Besøg hjemmeside <MoveRight /></Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
