import { withSerwist } from "@serwist/turbopack";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["esbuild", "esbuild-wasm"],
};

export default withSerwist(nextConfig);
