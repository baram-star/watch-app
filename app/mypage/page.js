"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalDays: 0, streak: 0, totalBooks: 0 });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profileData } = await supabase
      .from("watch_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profileData) { router.push("/login"); return; }
    setProfile(profileData);

    // 통계 로드
    const { count: logCount } = await supabase
      .from("watch_daily_logs")
      .select("log_date", { count: "exact", head: true })
      .eq("user_id", profileData.id)
      .eq("completed", true);

    const { count: bookCount } = await supabase
      .from("watch_reading_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profileData.id);

    setStats({
      totalDays: logCount || 0,
      totalBooks: bookCount || 0,
    });

    setLoading(false);
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-8 rounded-b-3xl">
        <h1 className="text-xl font-bold mb-6">마이페이지</h1>

        {/* 프로필 카드 */}
        <div className="bg-white/15 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {profile?.display_name?.[0] || "?"}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile?.display_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-teal-100">
                  {profile?.role === "student" ? "학생" : "학부모"}
                </span>
                {profile?.grade && (
                  <>
                    <span className="text-teal-200">·</span>
                    <span className="text-sm text-teal-100">{profile.grade}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 mt-6 flex flex-col gap-4">
        {/* 활동 통계 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">활동 통계</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-teal-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#0D9488]">{stats.totalDays}</p>
              <p className="text-xs text-gray-500 mt-1">총 실천 횟수</p>
            </div>
            <div className="bg-cyan-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#0891B2]">{stats.totalBooks}</p>
              <p className="text-xs text-gray-500 mt-1">등록한 책</p>
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => router.push("/routine")}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 text-left"
          >
            <span className="text-sm text-gray-800">루틴 설정</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/absorb")}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 text-left"
          >
            <span className="text-sm text-gray-800">독서 기록</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/wonder")}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-sm text-gray-800">성찰 기록</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl border border-red-200 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors"
        >
          로그아웃
        </button>

        <p className="text-center text-xs text-gray-300 mt-2">
          바람나무숲 교육연구소 · WATCH v1.0
        </p>
      </div>

      <BottomNav current="mypage" />
    </div>
  );
}
