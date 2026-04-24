import { MoveLeft, List } from "lucide-react";
import { ErrorPage } from "@/components/layout/error-page";

export default function NotFound() {
  return (
    <ErrorPage
      title="Siden findes ikke"
      description="Vi kunne ikke finde den side, du leder efter."
      actions={[
        { label: "Tilbage til kort", href: "/", icon: <MoveLeft /> },
        { label: "Se liste", href: "/liste", icon: <List /> },
      ]}
    />
  );
}
