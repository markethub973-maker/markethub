// Lightweight password hashing for client portal share links.
// Uses Node's built-in scrypt — zero deps, runs in the Node runtime
// (the public portal route is Node, not Edge, because it uses the
// supabase-js service client).
//
// Storage format: "scrypt:<saltHex>:<hashHex>"
// Verification is constant-time via timingSafeEqual.

import { scrypt as scryptCb, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error("password must be non-empty");
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LEN);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!password || !stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const derived = await scrypt(password, salt, expected.length);
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
