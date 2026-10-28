export function safeNext(next: string | null) {
  return next && /^\/invite\/[a-f0-9]{64}$/.test(next) ? next : "/";
}
