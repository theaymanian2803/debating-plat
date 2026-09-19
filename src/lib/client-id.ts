const KEY = "scholia-client-id";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = `c-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
