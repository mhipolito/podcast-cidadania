// functions/api/subscribe.js
export async function onRequest(context) {
  const { request, env } = context;

  // Apenas aceitamos POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { email, token } = await request.json();

    // Validações básicas
    if (!email || !token) {
      return new Response(JSON.stringify({ error: 'Email e token são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar o token com Turnstile
    const turnstileResult = await verifyTurnstile(token, env);

    if (!turnstileResult.success) {
      return new Response(JSON.stringify({ error: 'Falha na verificação de segurança' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Guardar o email no KV (o binding chama-se NEWSLETTER_KV, conforme definido no dashboard)
    // Vamos usar uma estrutura simples: a chave pode ser o email (ou um hash) e o valor pode ser a data de subscrição
    await env.NEWSLETTER_KV.put(email, new Date().toISOString());

    return new Response(JSON.stringify({ success: true, message: 'Email registado com sucesso' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function verifyTurnstile(token, env) {
  const secret = env.TURNSTILE_SECRET_KEY; 
  // Substitua 'SUA_SECRET_KEY' pela sua secret key, ou melhor, defina-a como variável de ambiente no Pages.
  // Recomendo usar variável de ambiente no Pages em vez de colocar a secret no código.

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`
  });

  return await response.json();
}