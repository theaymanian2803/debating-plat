let cloudflareEnv: Record<string, unknown> | undefined;

export function setCloudflareEnv(env: unknown) {
  cloudflareEnv = (env ?? undefined) as Record<string, unknown> | undefined;
}

export function getStashedCloudflareEnv() {
  return cloudflareEnv;
}

export function parseDevVarsFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]!] = m[2] ?? "";
  }
  return out;
}

export type CredentialSource = {
  cloudflare?: Record<string, unknown>;
  processEnv?: Record<string, string | undefined>;
  readFile?: (path: string) => string | undefined;
};

export function resolveTursoCredentials(src: CredentialSource): { url: string; token: string } {
  const cf = src.cloudflare;
  const url =
    typeof cf?.["TURSO_URL"] === "string" ? cf["TURSO_URL"] : src.processEnv?.["TURSO_URL"];
  const token =
    typeof cf?.["TURSO_AUTH_TOKEN"] === "string"
      ? cf["TURSO_AUTH_TOKEN"]
      : src.processEnv?.["TURSO_AUTH_TOKEN"];
  if (url && token) return { url, token };

  const dev = src.readFile?.(".dev.vars");
  if (dev) {
    const vars = parseDevVarsFile(dev);
    if (vars["TURSO_URL"] && vars["TURSO_AUTH_TOKEN"]) {
      return { url: vars["TURSO_URL"], token: vars["TURSO_AUTH_TOKEN"] };
    }
  }

  throw new Error("Turso credentials not found (set TURSO_URL and TURSO_AUTH_TOKEN, or .dev.vars)");
}
