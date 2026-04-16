import { Separator } from "@/components/ui/separator";
import { TypographyH1, TypographyP } from "@/components/ui/typography";

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
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12">
      <div className="max-w-xl mx-auto">
        <TypographyH1 className="mb-3">Om appen</TypographyH1>
        <TypographyP>
          Denne app viser NOAHs afdelinger og grupper på et interaktivt kort over
          Danmark. Udforsk NOAHs lokale tilstedeværelse, find nærmeste afdeling,
          og få oplysninger om hver gruppe.
        </TypographyP>

      <div className="my-16" />

      <dl className="space-y-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Version</dt>
          <dd className="font-medium">0.1.0</dd>
        </div>
        <Separator />
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Build</dt>
          <dd className="font-medium">{formatBuildTime(process.env.NEXT_PUBLIC_BUILD_TIME ?? "")}</dd>
        </div>
        <Separator />
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Udviklet af</dt>
          <dd className="font-medium">
            <a
              href="https://monsun.dk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Monsun
            </a>
          </dd>
        </div>
        <Separator />
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Kort</dt>
          <dd className="font-medium">
            <a
              href="https://protomaps.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Protomaps
            </a>
            {" © "}
            <a
              href="https://openstreetmap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              OpenStreetMap
            </a>
          </dd>
        </div>
        <Separator />
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Licens</dt>
          <dd className="font-medium">MIT</dd>
        </div>
      </dl>
      </div>
    </div>
  );
}
