"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MoveRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { TypographyH1, TypographyP } from "@/components/ui/typography";
import { fetchPage, type PageContent } from "@/lib/pages";

function formatBuildTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function OmPage() {
  const [page, setPage] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchPage("om")
      .then(setPage)
      .catch((err) => console.error("Failed to fetch page:", err))
      .finally(() => setLoading(false));
  }, []);

  async function handleClearAppData() {
    const confirmed = window.confirm(
      "Er du sikker på at du vil rydde alle app-data? Dette nulstiller cache og indstillinger."
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      // localStorage + sessionStorage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      // Service worker caches
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // Unregister service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }

      // Hard reload
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to clear app data:", err);
      setClearing(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-16 md:p-12 md:pb-24">
      <div className="max-w-xl mx-auto">
        {loading ? (
          <>
            <Skeleton className="h-9 w-2/5 mb-3" />
            <Skeleton className="h-6 w-4/5 mb-2" />
            <Skeleton className="h-6 w-2/3" />
            <div className="space-y-2 mt-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="h-10 w-44 mt-6" />
          </>
        ) : (
          <>
            <TypographyH1 className="mb-3">{page?.title ?? "Om appen"}</TypographyH1>
            {page?.subtitle && (
              <TypographyP className="whitespace-pre-line text-lg font-medium">
                {page.subtitle}
              </TypographyP>
            )}
            {page?.content && (
              <TypographyP className="whitespace-pre-line mt-4">
                {page.content}
              </TypographyP>
            )}
            {page?.buttonText && page?.buttonUrl && (
              <div className="mt-6">
                <Link
                  href={page.buttonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "secondary", size: "lg" })}
                >
                  {page.buttonText} <MoveRight />
                </Link>
              </div>
            )}
          </>
        )}

      <div className="my-24" />

      <Table>
        <TableBody className="[&_td]:p-2">
          <TableRow>
            <TableCell className="w-full text-muted-foreground">Version</TableCell>
            <TableCell className="text-right font-medium">0.1.0</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="w-full text-muted-foreground">Build</TableCell>
            <TableCell className="text-right font-medium">
              {formatBuildTime(process.env.NEXT_PUBLIC_BUILD_TIME ?? "")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="w-full text-muted-foreground">Udviklet af</TableCell>
            <TableCell className="text-right font-medium">
              <a
                href="https://monsun.dk"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground rounded-sm focus-ring"
              >
                Monsun
              </a>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="w-full text-muted-foreground">Kort</TableCell>
            <TableCell className="text-right font-medium">
              <a
                href="https://protomaps.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground rounded-sm focus-ring"
              >
                Protomaps
              </a>
              {" © "}
              <a
                href="https://openstreetmap.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground rounded-sm focus-ring"
              >
                OpenStreetMap
              </a>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="w-full text-muted-foreground">Licens</TableCell>
            <TableCell className="text-right font-medium">MIT</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="mt-12">
        <Button
          variant="destructive"
          onClick={handleClearAppData}
          disabled={clearing}
          className="w-full h-11"
        >
          {clearing ? "Rydder..." : "Ryd app-data"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Sletter cache og indstillinger lokalt på denne enhed.
        </p>
      </div>
      </div>
    </div>
  );
}
