export const SESSION_COOKIE = '__Host-crab_session';
export const SESSION_SECONDS = 8 * 60 * 60;
export type AccessEnv = { CRAB_PASSWORD_HASH?: string; CRAB_SESSION_SECRET?: string; CRAB_OWNER_KEY_HASH?: string };
const encoder = new TextEncoder();

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), character => character.charCodeAt(0));
}
async function signingKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}
export async function createSession(secret: string, origin: string, now = Date.now(), revision = 'initial'): Promise<string> {
  if (secret.length < 32) throw new Error('Access signing key is not configured.');
  const payload = encode(encoder.encode(JSON.stringify({v:1,aud:new URL(origin).origin,exp:Math.floor(now/1000)+SESSION_SECONDS,rev:revision})));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload));
  return payload + '.' + encode(new Uint8Array(signature));
}
export async function hasAccess(request: Request, secret?: string, now = Date.now(), revision?: string): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  try {
    const tokens = (request.headers.get('Cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(SESSION_COOKIE + '='));
    if (tokens.length !== 1) return false;
    const token = tokens[0].slice(SESSION_COOKIE.length + 1);
    if (token.length > 1024) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    if (!await crypto.subtle.verify('HMAC', await signingKey(secret), decode(signature), encoder.encode(payload))) return false;
    const session = JSON.parse(new TextDecoder().decode(decode(payload)));
    const seconds = Math.floor(now/1000);
    return session.v === 1 && session.aud === new URL(request.url).origin && Number.isInteger(session.exp) && session.exp > seconds && session.exp <= seconds + SESSION_SECONDS + 60 && (revision === undefined || session.rev === revision);
  } catch { return false; }
}
export function sessionCookie(value: string, maxAge = SESSION_SECONDS): string {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
