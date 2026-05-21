import type { SignInResponse } from "next-auth/react";

/** Auth.js v5 may return `{ ok: false }` without `error` when credentials fail. */
export function isCredentialsSignInFailure(
  result: SignInResponse | undefined,
): boolean {
  if (!result) return true;
  return !result.ok || Boolean(result.error);
}
