const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Fonction démarrée');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token manquant' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;

    console.log('URL:', supabaseUrl ? 'ok' : 'MANQUANTE');
    console.log('Service key:', serviceKey ? 'ok' : 'MANQUANTE');

    // Vérifier le user via l'API REST Supabase Auth directement
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
      }
    });

    const userData = await userRes.json();
    console.log('User status:', userRes.status, userData?.id ?? userData?.error);

    if (!userRes.ok || !userData?.id) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Vérifier le rôle via l'API REST
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userData.id}&select=role`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        }
      }
    );

    const profiles = await profileRes.json();
    console.log('Profile:', profiles?.[0]?.role);

    if (!profiles?.[0] || profiles[0].role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Créer l'utilisateur via l'API Admin
    const { email, password, full_name } = await req.json();
    console.log('Création de:', email);

    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })
    });

    const created = await createRes.json();
    console.log('Créé:', createRes.status, created?.id ?? created?.error);

    if (!createRes.ok) {
      return new Response(JSON.stringify({ error: created?.msg ?? created?.error ?? 'Erreur création' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mettre à jour full_name dans profiles
    if (full_name && created.id) {
      await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${created.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ full_name })
        }
      );
    }

    return new Response(JSON.stringify({ user: created }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('Erreur catch:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});