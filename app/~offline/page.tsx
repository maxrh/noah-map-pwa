export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Du er offline</h1>
      <p className="text-muted-foreground max-w-sm">
        Denne side er ikke tilgængelig uden internetforbindelse. Prøv igen, når du er online.
      </p>
    </div>
  );
}
