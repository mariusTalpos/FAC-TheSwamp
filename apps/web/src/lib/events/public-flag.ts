export function isPublicEventsEnabled(): boolean {
  return process.env.PUBLIC_EVENTS === "true";
}
