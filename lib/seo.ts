// Central SEO constants. Override SITE_URL via NEXT_PUBLIC_SITE_URL in env.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://kort.noah.dk";

export const SITE_NAME = "NOAH Kort";
export const SITE_DESCRIPTION =
  "Find NOAHs lokalafdelinger og grupper på et interaktivt kort over Danmark.";
export const SITE_LOCALE = "da_DK";
export const OG_IMAGE = "/icon.png"; // Replace with a 1200x630 OG image when available
