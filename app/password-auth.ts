export const SESSION_COOKIE = "ibsd_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return "Username must be 3–24 characters using lowercase letters, numbers or underscores.";
  }
  return null;
}

export function validatePassword(value: string) {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 128) return "Password must be no more than 128 characters.";
  return null;
}

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeRecoveryCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validateRecoveryCode(value: string) {
  return /^[A-HJ-NP-Z2-9]{20}$/.test(normalizeRecoveryCode(value))
    ? null
    : "Enter the 20-character recovery code issued by this site.";
}

export function createRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const raw = Array.from(bytes, (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]).join("");
  return raw.match(/.{1,5}/g)!.join("-");
}

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const hexToBytes = (value: string) => {
  if (!/^[0-9a-f]*$/i.test(value) || value.length % 2) return new Uint8Array();
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
};

async function derivePassword(password: string, salt: Uint8Array, pepper: string) {
  if (!pepper) throw new Error("Password protection is not configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const payload = new Uint8Array(salt.length + new TextEncoder().encode(password).length);
  payload.set(salt);
  payload.set(new TextEncoder().encode(password), salt.length);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
}

export async function createPasswordRecord(password: string, pepper: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, pepper);
  return { passwordSalt: bytesToHex(salt), passwordHash: bytesToHex(hash) };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string, pepper: string) {
  const actual = await derivePassword(password, hexToBytes(salt), pepper);
  const expected = hexToBytes(expectedHash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function createSessionToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashSessionToken(token: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(hash));
}

export function sessionCookie(token: string, maxAge = SESSION_MAX_AGE) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
