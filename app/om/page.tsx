import { Separator } from "@/components/ui/separator";

function formatBuildTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${String(d.getUTCFullYear()).slice(2)}`;
  const time = `${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())}.${pad(d.getUTCSeconds())}`;
  return `${date}, ${time}`;
}

export default function OmPage() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Om appen</h1>
      <p className="text-muted-foreground">
        Denne app viser NOAHs afdelinger og grupper på et interaktivt kort over
        Danmark. Udforsk NOAHs lokale tilstedeværelse, find nærmeste afdeling,
        og få oplysninger om hver gruppe.
      </p>

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
  );
}
