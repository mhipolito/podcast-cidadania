export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { email, token } = await request.json();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const secret = env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return new Response(JSON.stringify({ error: 'TURNSTILE_SECRET_KEY não configurada no dashboard' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const turnstileResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`
    });
    const turnstileData = await turnstileResult.json();

    console.log('Turnstile debug:', turnstileData); // ← aparece nos logs do dashboard

    if (!turnstileData.success) {
      return new Response(JSON.stringify({ 
        error: 'Falha na verificação Turnstile', 
        details: turnstileData['error-codes'] || ['unknown'] 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    await env.NEWSLETTER_KV.put(email.toLowerCase(), new Date().toISOString());
    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err) {
    console.error('Erro subscribe:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}