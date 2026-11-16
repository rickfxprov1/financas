import { sha256, extractSessionCookie, buildSessionCookie, SESSION_DURATION_MS, SESSION_DURATION_SECONDS } from './_utils';

export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith('/api/auth/')) {
    return context.next();
  }

  const cookie = context.request.headers.get('Cookie') || '';
  const sessionToken = extractSessionCookie(cookie);
  if (!sessionToken) return new Response('Não autorizado', { status: 401 });

  const tokenHash = await sha256(sessionToken);
  const session = await context.env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(tokenHash, Date.now()).first();

  if (!session) return new Response('Sessão inválida ou expirada', { status: 401 });

  // Sliding window: se faltam menos de 12h para expirar, renova por mais 1 dia
  const expiresAt = session.expires_at as number;
  const remaining = expiresAt - Date.now();
  let newCookie: string | null = null;

  if (remaining < SESSION_DURATION_MS / 2) {
    const newExpiresAt = Date.now() + SESSION_DURATION_MS;
    await context.env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
      .bind(newExpiresAt, tokenHash).run();
    newCookie = buildSessionCookie(sessionToken, SESSION_DURATION_SECONDS);
  }

  (context as any).data = { userId: session.user_id };
  const response = await context.next();
  
  if (newCookie) {
    response.headers.append('Set-Cookie', newCookie);
  }
  return response;
};