import { sha256 } from '../_utils';

export const onRequestPut: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return new Response('Não autorizado', { status: 401 });

  const tokenHash = await sha256(match[1]);
  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(tokenHash, Date.now()).first();
  if (!session) return new Response('Sessão inválida', { status: 401 });

  const { name } = await request.json<any>();
  
  // Salvando o nome no banco de dados
  await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, session.user_id).run();
  
  return Response.json({ ok: true });
};