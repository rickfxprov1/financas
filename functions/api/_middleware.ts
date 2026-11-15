import { sha256 } from './_utils';

export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith('/api/auth/')) {
    return context.next();
  }

  const cookie = context.request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return new Response('NÃ£o autorizado', { status: 401 });

  const tokenHash = await sha256(match[1]);
  const session = await context.env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(tokenHash, Date.now()).first();

  if (!session) return new Response('SessÃ£o invÃ¡lida ou expirada', { status: 401 });

  (context as any).data = { userId: session.user_id };
  return context.next();
};