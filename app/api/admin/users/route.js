import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // 모든 프로필 조회
    const { data: profiles, error } = await supabaseAdmin
      .from("watch_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 오늘 완료 수
    const profileIds = (profiles || []).map(p => p.id);
    const { data: todayLogs } = await supabaseAdmin
      .from("watch_daily_logs")
      .select("user_id, routine_id")
      .in("user_id", profileIds)
      .eq("log_date", today)
      .eq("completed", true);

    const logCountMap = {};
    (todayLogs || []).forEach(l => {
      logCountMap[l.user_id] = (logCountMap[l.user_id] || 0) + 1;
    });

    // 전체 실천 수 (누적)
    const { data: allLogs } = await supabaseAdmin
      .from("watch_daily_logs")
      .select("user_id")
      .in("user_id", profileIds)
      .eq("completed", true);

    const totalMap = {};
    (allLogs || []).forEach(l => {
      totalMap[l.user_id] = (totalMap[l.user_id] || 0) + 1;
    });

    // auth 유저 목록 (이메일)
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = {};
    (authUsers || []).forEach(u => { emailMap[u.id] = u.email; });

    const result = (profiles || []).map(p => ({
      ...p,
      email: emailMap[p.user_id] || "",
      todayCount: logCountMap[p.id] || 0,
      totalCount: totalMap[p.id] || 0,
    }));

    return NextResponse.json({ users: result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
