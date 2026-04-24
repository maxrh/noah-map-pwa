import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om appen",
  description:
    "Læs om NOAH Kort — en åben app der viser NOAHs lokale tilstedeværelse i Danmark.",
  alternates: { canonical: "/om" },
  openGraph: {
    title: "Om appen",
    description:
      "Læs om NOAH Kort — en åben app der viser NOAHs lokale tilstedeværelse i Danmark.",
    url: "/om",
  },
};

export default function OmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
