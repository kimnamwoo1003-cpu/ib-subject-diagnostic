export const SESSION_COOKIE = "ibsd_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const ITERATIONS = 210_000;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return "계정 이름은 영문 소문자, 숫자, 밑줄로 3–24자여야 합니다.";
  }
  return null;
}

export function validatePassword(value: string) {
  if (value.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (value.length > 128) return "비밀번호는 128자 이하여야 합니다.";
  return null;
}

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function derivePassword(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
  return new Uint8Array(bits);
}

export async function createPasswordRecord(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt);
  return { passwordSalt: bytesToBase64(salt), passwordHash: bytesToBase64(hash) };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = await derivePassword(password, base64ToBytes(salt));
  const expected = base64ToBytes(expectedHash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function createSessionToken() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hashSessionToken(token: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToBase64(new Uint8Array(hash));
}

export function sessionCookie(token: string, maxAge = SESSION_MAX_AGE) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
