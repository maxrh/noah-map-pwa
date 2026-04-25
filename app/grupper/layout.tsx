import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liste",
  description:
    "Se alle NOAHs lokalafdelinger og grupper i en søgbar og filtrerbar liste.",
  alternates: { canonical: "/grupper" },
  openGraph: {
    title: "Liste",
    description:
      "Se alle NOAHs lokalafdelinger og grupper i en søgbar og filtrerbar liste.",
    url: "/grupper",
  },
};

export default function ListeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
