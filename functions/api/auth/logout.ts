import { sha256 } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (match) {
    const tokenHash = await sha256(match[1]);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  const expiredCookie = `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
  return new Response('Logout realizado', { status: 200, headers: { 'Set-Cookie': expiredCookie } });
};