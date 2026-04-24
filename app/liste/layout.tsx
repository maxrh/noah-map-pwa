import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liste",
  description:
    "Se alle NOAHs lokalafdelinger og grupper i en søgbar og filtrerbar liste.",
  alternates: { canonical: "/liste" },
  openGraph: {
    title: "Liste",
    description:
      "Se alle NOAHs lokalafdelinger og grupper i en søgbar og filtrerbar liste.",
    url: "/liste",
  },
};

export default function ListeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
