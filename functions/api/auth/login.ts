import { verifyPassword, sha256, buildSessionCookie, SESSION_DURATION_MS, SESSION_DURATION_SECONDS } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const { email, password } = await request.json<any>();
  if (!email || !password) return new Response('Email e senha são obrigatórios', { status: 400 });

  // Limpa sessões expiradas (housekeeping)
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now()).run();

  const user = await env.DB.prepare('SELECT id, name, password_hash FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (!user) return new Response('Credenciais inválidas', { status: 401 });

  const isValid = await verifyPassword(password, user.password_hash as string);
  if (!isValid) return new Response('Credenciais inválidas', { status: 401 });

  const sessionToken = crypto.randomUUID();
  const tokenHash = await sha256(sessionToken);
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, user.id, expiresAt).run();

  return new Response(JSON.stringify({ id: user.id, email, name: user.name }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(sessionToken, SESSION_DURATION_SECONDS)
    }
  });
};