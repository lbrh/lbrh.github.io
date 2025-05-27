import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  output: "export",

  /**
   * Set base path. This is the slug of your GitHub repository.
   *
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/basePath
   */
  basePath: "/lbrh.github.io",

  images: {
    unoptimized: true,
  },
};

export default nextConfig;