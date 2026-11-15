import { sha256 } from '../_utils';

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return new Response('NÃ£o autenticado', { status: 401 });

  const tokenHash = await sha256(match[1]);
  const session = await env.DB.prepare(`
    SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, Date.now()).first();

  if (!session) return new Response('SessÃ£o invÃ¡lida', { status: 401 });

  return new Response(JSON.stringify(session), { status: 200, headers: { 'Content-Type': 'application/json' } });
};