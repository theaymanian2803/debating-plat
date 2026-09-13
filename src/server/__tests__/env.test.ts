import { describe, expect, it } from "vitest";
import { parseDevVarsFile, resolveTursoCredentials } from "@/server/env";

describe("parseDevVarsFile", () => {
  it("parses KEY=VALUE lines", () => {
    expect(parseDevVarsFile("TURSO_URL=x\nTURSO_AUTH_TOKEN=y\n")).toEqual({
      TURSO_URL: "x",
      TURSO_AUTH_TOKEN: "y",
    });
  });

  it("ignores comments and blank lines", () => {
    expect(parseDevVarsFile("# comment\n\nA=1\n")).toEqual({ A: "1" });
  });

  it("keeps values containing '='", () => {
    expect(parseDevVarsFile("URL=libsql://db?tls=1\n")).toEqual({ URL: "libsql://db?tls=1" });
  });
});

describe("resolveTursoCredentials", () => {
  it("prefers cloudflare bindings", () => {
    const creds = resolveTursoCredentials({
      cloudflare: { TURSO_URL: "cf-url", TURSO_AUTH_TOKEN: "cf-tok" },
      processEnv: { TURSO_URL: "env-url", TURSO_AUTH_TOKEN: "env-tok" },
      readFile: () => undefined,
    });
    expect(creds).toEqual({ url: "cf-url", token: "cf-tok" });
  });

  it("falls back to process.env", () => {
    const creds = resolveTursoCredentials({
      cloudflare: undefined,
      processEnv: { TURSO_URL: "env-url", TURSO_AUTH_TOKEN: "env-tok" },
      readFile: () => undefined,
    });
    expect(creds).toEqual({ url: "env-url", token: "env-tok" });
  });

  it("falls back to .dev.vars", () => {
    const creds = resolveTursoCredentials({
      cloudflare: undefined,
      processEnv: {},
      readFile: () => "TURSO_URL=dev-url\nTURSO_AUTH_TOKEN=dev-tok\n",
    });
    expect(creds).toEqual({ url: "dev-url", token: "dev-tok" });
  });

  it("throws when nothing is available", () => {
    expect(() =>
      resolveTursoCredentials({ cloudflare: undefined, processEnv: {}, readFile: () => undefined }),
    ).toThrow(/Turso credentials/);
  });
});
