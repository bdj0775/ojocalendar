// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: admin-list-users
// 관리자 페이지의 "회원 데이터 열람" 드롭다운에 쓸 전체 회원 목록(이메일/이름/플랜)을 반환. 읽기 전용.
// 배포: supabase functions deploy admin-list-users
// 참고: MONETIZATION_ROADMAP.md Phase 5

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }
    const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? '';
    if (!adminEmail || user.email !== adminEmail) {
      return new Response(
        JSON.stringify({ error: '관리자만 사용할 수 있는 기능입니다.' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: profiles, error: profilesErr } = await adminClient
      .from('profiles').select('id, email, name, created_at')
      .order('created_at', { ascending: false });
    if (profilesErr) throw new Error(`회원 목록 조회 실패: ${profilesErr.message}`);

    const { data: subs, error: subsErr } = await adminClient
      .from('subscriptions').select('host_id, plan');
    if (subsErr) throw new Error(`플랜 조회 실패: ${subsErr.message}`);

    const planByHost = new Map(subs.map((s: { host_id: string; plan: string }) => [s.host_id, s.plan]));
    const users = profiles.map((p: { id: string; email: string; name: string | null }) => ({
      id: p.id, email: p.email, name: p.name, plan: planByHost.get(p.id) ?? 'free',
    }));

    return new Response(
      JSON.stringify({ users }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
