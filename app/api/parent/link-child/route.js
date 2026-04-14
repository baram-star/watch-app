import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { parentId, childCode } = await request.json();
    if (!parentId || !childCode) {
      return NextResponse.json({ error: "필수 값이 누락되었습니다" }, { status: 400 });
    }

    // 연결 코드(profile.id 앞 8자리)로 자녀 프로필 검색
    const { data: profiles, error } = await supabaseAdmin
      .from("watch_profiles")
      .select("id, display_name, role")
      .ilike("id", `${childCode.toLowerCase()}%`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!profiles?.length) return NextResponse.json({ error: "해당 코드의 학생을 찾을 수 없습니다" }, { status: 404 });

    const child = profiles.find(p => p.role === "student") || profiles[0];

    // 이미 연결되어 있는지 확인
    const { data: existing } = await supabaseAdmin
      .from("watch_parent_child")
      .select("id")
      .eq("parent_id", parentId)
      .eq("child_id", child.id)
      .single();

    if (existing) return NextResponse.json({ error: "이미 연결된 자녀입니다" }, { status: 400 });

    // 연결 생성
    const { error: insertErr } = await supabaseAdmin
      .from("watch_parent_child")
      .insert({ parent_id: parentId, child_id: child.id });

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ success: true, childName: child.display_name });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
