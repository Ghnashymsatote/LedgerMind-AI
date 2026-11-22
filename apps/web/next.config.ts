import type { NextConfig } from "next";

import { apiBaseUrl as api } from "./config/api";

const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [
      { source: "/api/auth/:action(login|logout|me)", destination: `${api}/auth/:action` },
      { source: "/api/suppliers", destination: `${api}/suppliers` },
      { source: "/api/suppliers/:id", destination: `${api}/suppliers/:id` },
      { source: "/api/invoices", destination: `${api}/invoices` },
      { source: "/api/invoices/:id/file", destination: `${api}/invoices/:id/file` },
      { source: "/api/invoices/:segment", destination: `${api}/invoices/:segment` },
    ];
  },
};

export default config;
