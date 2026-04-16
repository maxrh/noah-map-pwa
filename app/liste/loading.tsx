import { Skeleton } from "@/components/ui/skeleton";

export default function ListeLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-4 px-6 py-5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            <Skeleton className="h-4 w-4 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
