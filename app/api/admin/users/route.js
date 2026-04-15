import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const today = new Date().toISOString().split("T")[0];

    // 모든 프로필 조회
    const { data: profiles, error } = await supabaseAdmin
      .from("watch_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const profileIds = (profiles || []).map(p => p.id);

    // 모든 루틴 조회 (routine_id → domain 매핑용)
    const { data: routines } = await supabaseAdmin
      .from("watch_routines")
      .select("id, user_id, domain")
      .in("user_id", profileIds);

    const routineMap = {};
    (routines || []).forEach(r => { routineMap[r.id] = { domain: r.domain, userId: r.user_id }; });

    // 오늘 완료 로그
    const { data: todayLogs } = await supabaseAdmin
      .from("watch_daily_logs")
      .select("user_id, routine_id")
      .in("user_id", profileIds)
      .eq("log_date", today)
      .eq("completed", true);

    const domainMap = {}; // user_id → 완료 domain 배열
    (todayLogs || []).forEach(l => {
      const info = routineMap[l.routine_id];
      if (info) {
        if (!domainMap[l.user_id]) domainMap[l.user_id] = [];
        if (!domainMap[l.user_id].includes(info.domain)) domainMap[l.user_id].push(info.domain);
      }
    });

    // 전체 실천 수 (누적)
    const { data: allLogs } = await supabaseAdmin
      .from("watch_daily_logs")
      .select("user_id")
      .in("user_id", profileIds)
      .eq("completed", true);

    const totalMap = {};
    (allLogs || []).forEach(l => { totalMap[l.user_id] = (totalMap[l.user_id] || 0) + 1; });

    // 최근 7일 실천 날짜 (스트릭)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30);
    const { data: recentLogs } = await supabaseAdmin
      .from("watch_daily_logs")
      .select("user_id, log_date")
      .in("user_id", profileIds)
      .eq("completed", true)
      .gte("log_date", sevenDaysAgo.toISOString().split("T")[0]);

    const recentMap = {}; // user_id → [날짜 배열]
    (recentLogs || []).forEach(l => {
      if (!recentMap[l.user_id]) recentMap[l.user_id] = new Set();
      recentMap[l.user_id].add(l.log_date);
    });

    // 스트릭 계산
    const streakMap = {};
    profileIds.forEach(uid => {
      const dates = [...(recentMap[uid] || new Set())].sort().reverse();
      let streak = 0;
      for (let i = 0; i < dates.length; i++) {
        const exp = new Date(today); exp.setDate(exp.getDate() - i);
        if (dates[i] === exp.toISOString().split("T")[0]) streak++;
        else break;
      }
      streakMap[uid] = streak;
    });

    // auth 유저 목록 (이메일)
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = {};
    (authUsers || []).forEach(u => { emailMap[u.id] = u.email; });

    const result = (profiles || []).map(p => ({
      ...p,
      email: emailMap[p.user_id] || "",
      todayDomains: domainMap[p.id] || [],
      todayCount: (domainMap[p.id] || []).length,
      totalCount: totalMap[p.id] || 0,
      streak: streakMap[p.id] || 0,
    }));

    return NextResponse.json({ users: result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
