export function safeNext(search, fallback = "/") {
  const value = new URLSearchParams(search).get("next");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function authPath(path, next) {
  return `${path}?next=${encodeURIComponent(next)}`;
}
