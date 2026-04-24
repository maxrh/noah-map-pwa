"use client";

import { useEffect } from "react";
import { RotateCcw, MoveLeft } from "lucide-react";
import { ErrorPage } from "@/components/layout/error-page";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in dev; production users see the friendly message below.
    if (process.env.NODE_ENV !== "production") {
      console.error("[route error]", error);
    }
  }, [error]);

  return (
    <ErrorPage
      title="Noget gik galt"
      description="Der opstod en uventet fejl. Du kan prøve igen, eller gå tilbage til kortet."
      actions={[
        { label: "Prøv igen", onClick: reset, icon: <RotateCcw /> },
        { label: "Tilbage til kort", href: "/", icon: <MoveLeft /> },
      ]}
    />
  );
}
