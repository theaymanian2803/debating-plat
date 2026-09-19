import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getRequestProtocol, setCookie } from "@tanstack/react-start/server";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  adminSessionValid,
  configured,
  resolveStoredPassword,
  signSessionToken,
  verifyPassword,
} from "@/server/auth";

export const login = createServerFn({ method: "POST" })
  .validator((password: string) => password)
  .handler(({ data }) => {
    const password = resolveStoredPassword();
    if (!password) return { ok: false as const, reason: "not-configured" as const };
    if (!verifyPassword(data, password)) return { ok: false as const, reason: "invalid" as const };
    setCookie(ADMIN_COOKIE, signSessionToken(password, Math.floor(Date.now() / 1000)), {
      httpOnly: true,
      sameSite: "lax",
      secure: getRequestProtocol() === "https",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(() => {
  deleteCookie(ADMIN_COOKIE, { path: "/" });
  return { ok: true as const };
});

export const authState = createServerFn({ method: "POST" }).handler(() => ({
  authed: adminSessionValid(),
  configured: configured(),
}));
