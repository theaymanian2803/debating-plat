import { describe, expect, it } from "vitest";
import {
  resolveAdminPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from "@/server/auth";

const NOW = 1_800_000_000;

describe("verifyPassword", () => {
  it("accepts the correct password", () => {
    expect(verifyPassword("hunter2", "hunter2")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifyPassword("hunter3", "hunter2")).toBe(false);
  });

  it("rejects empty input", () => {
    expect(verifyPassword("", "hunter2")).toBe(false);
    expect(verifyPassword(undefined, "hunter2")).toBe(false);
  });

  it("rejects when no password is configured", () => {
    expect(verifyPassword("hunter2", undefined)).toBe(false);
  });
});

describe("signSessionToken / verifySessionToken", () => {
  it("produces a token with the admin prefix and expiry", () => {
    const token = signSessionToken("hunter2", NOW);
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("admin");
    expect(parts[1]).toBe(String(NOW + 30 * 24 * 60 * 60));
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies a fresh token", () => {
    const token = signSessionToken("hunter2", NOW);
    expect(verifySessionToken(token, "hunter2", NOW)).toBe(true);
  });

  it("rejects an expired token", () => {
    const token = signSessionToken("hunter2", NOW);
    expect(verifySessionToken(token, "hunter2", NOW + 31 * 24 * 60 * 60)).toBe(false);
  });

  it("rejects a token signed with a different password", () => {
    const token = signSessionToken("hunter2", NOW);
    expect(verifySessionToken(token, "hunter3", NOW)).toBe(false);
  });

  it("rejects a tampered token", () => {
    const token = signSessionToken("hunter2", NOW);
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(verifySessionToken(tampered, "hunter2", NOW)).toBe(false);
  });

  it("rejects missing and malformed tokens", () => {
    expect(verifySessionToken(undefined, "hunter2", NOW)).toBe(false);
    expect(verifySessionToken("garbage", "hunter2", NOW)).toBe(false);
    expect(verifySessionToken("admin.1234", "hunter2", NOW)).toBe(false);
  });
});

describe("resolveAdminPassword", () => {
  it("prefers cloudflare bindings", () => {
    const pw = resolveAdminPassword({
      cloudflare: { ADMIN_PASSWORD: "cf-pw" },
      processEnv: { ADMIN_PASSWORD: "env-pw" },
      readFile: () => "ADMIN_PASSWORD=dev-pw\n",
    });
    expect(pw).toBe("cf-pw");
  });

  it("falls back to process.env", () => {
    const pw = resolveAdminPassword({
      cloudflare: undefined,
      processEnv: { ADMIN_PASSWORD: "env-pw" },
      readFile: () => undefined,
    });
    expect(pw).toBe("env-pw");
  });

  it("falls back to .dev.vars", () => {
    const pw = resolveAdminPassword({
      cloudflare: undefined,
      processEnv: {},
      readFile: () => "TURSO_URL=x\nADMIN_PASSWORD=dev-pw\n",
    });
    expect(pw).toBe("dev-pw");
  });

  it("returns undefined when nothing is configured", () => {
    const pw = resolveAdminPassword({
      cloudflare: undefined,
      processEnv: {},
      readFile: () => undefined,
    });
    expect(pw).toBeUndefined();
  });
});
