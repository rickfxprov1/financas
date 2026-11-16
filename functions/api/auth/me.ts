import { sha256, extractSessionCookie, buildSessionCookie, SESSION_DURATION_MS, SESSION_DURATION_SECONDS } from '../_utils';

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const sessionToken = extractSessionCookie(cookie);
  if (!sessionToken) return new Response('Não autenticado', { status: 401 });

  const tokenHash = await sha256(sessionToken);
  const session = await env.DB.prepare(`
    SELECT u.id, u.email, u.name, s.expires_at 
    FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, Date.now()).first();

  if (!session) return new Response('Sessão inválida', { status: 401 });

  // Sliding window: renova se faltar menos de 12h
  const remaining = (session.expires_at as number) - Date.now();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (remaining < SESSION_DURATION_MS / 2) {
    const newExpiresAt = Date.now() + SESSION_DURATION_MS;
    await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
      .bind(newExpiresAt, tokenHash).run();
    headers['Set-Cookie'] = buildSessionCookie(sessionToken, SESSION_DURATION_SECONDS);
  }

  return new Response(
    JSON.stringify({ id: session.id, email: session.email, name: session.name }),
    { status: 200, headers }
  );
};