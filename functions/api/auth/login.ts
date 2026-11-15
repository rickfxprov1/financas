import { verifyPassword, sha256 } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const { email, password } = await request.json<any>();
  if (!email || !password) return new Response('Email e senha sÃ£o obrigatÃ³rios', { status: 400 });

  const user = await env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ?').bind(email).first();
  if (!user) return new Response('Credenciais invÃ¡lidas', { status: 401 });

  const isValid = await verifyPassword(password, user.password_hash as string);
  if (!isValid) return new Response('Credenciais invÃ¡lidas', { status: 401 });

  const sessionToken = crypto.randomUUID();
  const tokenHash = await sha256(sessionToken);
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 dias

  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, user.id, expiresAt).run();

  const cookie = `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;

  return new Response(JSON.stringify({ id: user.id, email }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie }
  });
};