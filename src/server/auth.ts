import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getCookie } from "@tanstack/react-start/server";
import { getStashedCloudflareEnv, parseDevVarsFile, type CredentialSource } from "./env";

export const ADMIN_COOKIE = "scholia_admin";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const digest = (value: string): Buffer => createHash("sha256").update(value, "utf8").digest();

export function verifyPassword(input: string | undefined, expected: string | undefined): boolean {
  if (!input || !expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

export function signSessionToken(password: string, nowSeconds: number): string {
  const expiry = nowSeconds + SESSION_TTL_SECONDS;
  const hmac = createHmac("sha256", password).update(`admin.${expiry}`, "utf8").digest("hex");
  return `admin.${expiry}.${hmac}`;
}

export function verifySessionToken(
  token: string | undefined,
  password: string,
  nowSeconds: number,
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const expiry = Number(parts[1]);
  if (!Number.isFinite(expiry) || expiry <= nowSeconds) return false;
  const expected = createHmac("sha256", password).update(`admin.${parts[1]}`, "utf8").digest("hex");
  return timingSafeEqual(digest(parts[2]!), digest(expected));
}

export function resolveAdminPassword(src: CredentialSource): string | undefined {
  const cf = src.cloudflare;
  const fromEnv =
    typeof cf?.["ADMIN_PASSWORD"] === "string"
      ? cf["ADMIN_PASSWORD"]
      : src.processEnv?.["ADMIN_PASSWORD"];
  if (fromEnv) return fromEnv;
  const dev = src.readFile?.(".dev.vars");
  if (dev) {
    const vars = parseDevVarsFile(dev);
    if (vars["ADMIN_PASSWORD"]) return vars["ADMIN_PASSWORD"];
  }
  return undefined;
}

export function resolveStoredPassword(): string | undefined {
  return resolveAdminPassword({
    cloudflare: getStashedCloudflareEnv(),
    processEnv: process.env,
    readFile: (p) => {
      try {
        return readFileSync(join(process.cwd(), p), "utf8");
      } catch {
        return undefined;
      }
    },
  });
}

export class AdminAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function requireAdmin(): void {
  const password = resolveStoredPassword();
  if (!password) {
    throw new AdminAuthError(403, "Admin access is not configured on this deployment");
  }
  const token = getCookie(ADMIN_COOKIE);
  if (!verifySessionToken(token, password, Math.floor(Date.now() / 1000))) {
    throw new AdminAuthError(401, "Admin session missing or expired");
  }
}

export function adminSessionValid(): boolean {
  const password = resolveStoredPassword();
  if (!password) return false;
  const token = getCookie(ADMIN_COOKIE);
  return verifySessionToken(token, password, Math.floor(Date.now() / 1000));
}

export function configured(): boolean {
  return Boolean(resolveStoredPassword());
}
