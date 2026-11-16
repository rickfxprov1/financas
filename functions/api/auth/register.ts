import { hashPassword } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const { email, password, name } = await request.json<any>();

  if (!email || !password || !name) {
    return new Response('Nome, e-mail e senha são obrigatórios', { status: 400 });
  }
  
  if (password.length < 6) {
    return new Response('A senha deve ter pelo menos 6 caracteres', { status: 400 });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email) || email.includes('..')) {
    return new Response('Por favor, insira um e-mail válido.', { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase()).first();
  if (existing) return new Response('Este e-mail já está cadastrado', { status: 409 });

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  await env.DB.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, email.toLowerCase(), name.trim(), passwordHash, Date.now()).run();

  return new Response(JSON.stringify({ id: userId, email: email.toLowerCase(), name: name.trim() }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};