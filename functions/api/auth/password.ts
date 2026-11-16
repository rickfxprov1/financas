import { verifyPassword, hashPassword, sha256, extractSessionCookie } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const sessionToken = extractSessionCookie(cookie);
  if (!sessionToken) return new Response('Não autorizado', { status: 401 });

  const tokenHash = await sha256(sessionToken);
  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(tokenHash, Date.now()).first();
  if (!session) return new Response('Sessão inválida', { status: 401 });

  const { currentPassword, newPassword } = await request.json<any>();
  
  if (!currentPassword || !newPassword) {
    return new Response('Senha atual e nova senha são obrigatórias', { status: 400 });
  }
  
  if (newPassword.length < 6) {
    return new Response('A nova senha deve ter pelo menos 6 caracteres', { status: 400 });
  }

  const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(session.user_id).first();
  
  const isValid = await verifyPassword(currentPassword, user.password_hash as string);
  if (!isValid) return new Response('Senha atual incorreta', { status: 400 });

  const newHash = await hashPassword(newPassword);
  
  // Atualiza a senha E invalida TODAS as sessões (força login em todos os dispositivos)
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, session.user_id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(session.user_id)
  ]);

  // Cookie expirado para o navegador atual também
  return new Response('Senha atualizada. Faça login novamente.', {
    status: 200,
    headers: { 'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' }
  });
};