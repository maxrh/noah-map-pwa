import { withSerwist } from "@serwist/turbopack";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSerwist(nextConfig);
