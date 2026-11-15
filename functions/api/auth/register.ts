import { hashPassword } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const { email, password } = await request.json<any>();
  if (!email || !password) return new Response('Email e senha sÃ£o obrigatÃ³rios', { status: 400 });

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return new Response('Email jÃ¡ cadastrado', { status: 409 });

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  await env.DB.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, email, passwordHash, Date.now()).run();

  return new Response(JSON.stringify({ id: userId, email }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};