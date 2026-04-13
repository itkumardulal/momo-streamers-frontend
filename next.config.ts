import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

/** IIS Express HTTPS — also set in `.env` as `NEXT_PUBLIC_API_URL`. */
const defaultPublicApiUrl = "https://localhost:44336";

function parseEnvFilesForKey(root: string, key: string): string | undefined {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.replace(/\r$/, "").trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      if (k !== key) continue;
      let v = line.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      const trimmed = v.trim().replace(/\/$/, "");
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

const projectRoot = process.cwd();
const publicApiUrl =
  parseEnvFilesForKey(projectRoot, "NEXT_PUBLIC_API_URL") ??
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ??
  defaultPublicApiUrl;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: publicApiUrl,
  },
};

export default nextConfig;
