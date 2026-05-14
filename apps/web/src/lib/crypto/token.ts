import { createHash, randomBytes } from "crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function randomOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}
