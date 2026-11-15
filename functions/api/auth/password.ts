import { verifyPassword, hashPassword, sha256 } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return new Response('NÃ£o autorizado', { status: 401 });

  const tokenHash = await sha256(match[1]);
  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(tokenHash, Date.now()).first();
  if (!session) return new Response('SessÃ£o invÃ¡lida', { status: 401 });

  const { currentPassword, newPassword } = await request.json<any>();
  const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(session.user_id).first();
  
  const isValid = await verifyPassword(currentPassword, user.password_hash as string);
  if (!isValid) return new Response('Senha atual incorreta', { status: 400 });

  const newHash = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, session.user_id).run();
  return new Response('Senha atualizada', { status: 200 });
};