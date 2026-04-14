"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLogs: 0, streak: 0, totalBooks: 0 });

  // 알림 설정
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState("20:00");
  const [notifSaved, setNotifSaved] = useState(false);

  // 학부모-자녀 연결
  const [childCode, setChildCode] = useState("");
  const [linkMsg, setLinkMsg] = useState("");
  const [children, setChildren] = useState([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    // 로컬스토리지에서 알림 설정 불러오기
    setNotifEnabled(localStorage.getItem("watch_notif_enabled") === "true");
    setNotifTime(localStorage.getItem("watch_notif_time") || "20:00");
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profileData } = await supabase
      .from("watch_profiles").select("*").eq("user_id", user.id).single();
    if (!profileData) { router.push("/login"); return; }
    setProfile(profileData);

    // 통계
    const { count: logCount } = await supabase
      .from("watch_daily_logs").select("*", { count: "exact", head: true })
      .eq("user_id", profileData.id).eq("completed", true);

    const { count: bookCount } = await supabase
      .from("watch_reading_logs").select("*", { count: "exact", head: true })
      .eq("user_id", profileData.id);

    // 스트릭
    const { data: streakLogs } = await supabase
      .from("watch_daily_logs").select("log_date")
      .eq("user_id", profileData.id).eq("completed", true)
      .order("log_date", { ascending: false }).limit(100);
    const dates = [...new Set((streakLogs || []).map(l => l.log_date))].sort().reverse();
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const exp = new Date(today); exp.setDate(exp.getDate() - i);
      if (dates[i] === exp.toISOString().split("T")[0]) streak++;
      else break;
    }

    setStats({ totalLogs: logCount || 0, totalBooks: bookCount || 0, streak });

    // 학부모인 경우: 연결된 자녀 목록
    if (profileData.role === "parent") {
      const { data: links } = await supabase
        .from("watch_parent_child").select("child_id").eq("parent_id", profileData.id);
      if (links?.length) {
        const childIds = links.map(l => l.child_id);
        const { data: childProfiles } = await supabase
          .from("watch_profiles").select("*").in("id", childIds);
        setChildren(childProfiles || []);
      }
    }

    setLoading(false);
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const saveNotifSettings = async () => {
    if (notifEnabled && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { alert("알림 권한이 거부되었습니다."); return; }
    }
    localStorage.setItem("watch_notif_enabled", notifEnabled ? "true" : "false");
    localStorage.setItem("watch_notif_time", notifTime);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const linkChild = async () => {
    if (!childCode.trim()) return;
    setLinkMsg("");
    const res = await fetch("/api/parent/link-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: profile.id, childCode: childCode.trim() }),
    });
    const json = await res.json();
    if (json.error) { setLinkMsg("❌ " + json.error); return; }
    setLinkMsg("✅ 연결 완료!");
    setChildCode("");
    loadData();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const connectCode = profile?.id?.substring(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-8 rounded-b-3xl">
        <h1 className="text-xl font-bold mb-6">마이페이지</h1>
        <div className="bg-white/15 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-3xl font-bold">{profile?.display_name?.[0] || "?"}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile?.display_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-teal-100">
                  {profile?.role === "student" ? "학생" : profile?.role === "parent" ? "학부모" : "관리자"}
                </span>
                {profile?.grade && <><span className="text-teal-200">·</span><span className="text-sm text-teal-100">{profile.grade}</span></>}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 mt-6 flex flex-col gap-4">

        {/* 활동 통계 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">활동 통계</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-500">🔥{stats.streak}</p>
              <p className="text-xs text-gray-500 mt-1">연속 달성</p>
            </div>
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#0D9488]">{stats.totalLogs}</p>
              <p className="text-xs text-gray-500 mt-1">총 실천 횟수</p>
            </div>
            <div className="bg-cyan-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#0891B2]">{stats.totalBooks}</p>
              <p className="text-xs text-gray-500 mt-1">등록한 책</p>
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {[
            { label: "루틴 설정", href: "/routine" },
            { label: "독서 기록", href: "/absorb" },
            { label: "성찰 기록", href: "/wonder" },
          ].map((item, i, arr) => (
            <button key={item.href} onClick={() => router.push(item.href)}
              className={`w-full flex items-center justify-between px-5 py-4 text-left ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
              <span className="text-sm text-gray-800">{item.label}</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
          {profile?.is_admin && (
            <button onClick={() => router.push("/admin")}
              className="w-full flex items-center justify-between px-5 py-4 border-t border-gray-100 text-left">
              <span className="text-sm font-semibold text-red-600">관리자 페이지</span>
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* 연결 코드 (학생) / 자녀 연결 (학부모) */}
        {profile?.role === "student" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-1">나의 연결 코드</h3>
            <p className="text-xs text-gray-400 mb-3">학부모님께 이 코드를 알려주세요</p>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="font-mono text-xl font-bold text-[#0D9488] tracking-widest flex-1">{connectCode}</span>
              <button onClick={() => navigator.clipboard?.writeText(connectCode)}
                className="text-xs text-gray-400 hover:text-[#0D9488] px-2 py-1 rounded-lg border border-gray-200">
                복사
              </button>
            </div>
          </div>
        )}

        {profile?.role === "parent" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">자녀 연결</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={childCode}
                onChange={e => setChildCode(e.target.value.toUpperCase())}
                placeholder="자녀 연결 코드 입력"
                maxLength={8}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
              <button onClick={linkChild}
                className="px-4 py-2.5 rounded-xl bg-[#0D9488] text-white text-sm font-semibold">
                연결
              </button>
            </div>
            {linkMsg && <p className="text-xs mt-1 text-gray-600">{linkMsg}</p>}

            {children.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2">연결된 자녀</p>
                {children.map(child => (
                  <button key={child.id} onClick={() => router.push(`/parent?childId=${child.id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl mb-2 text-left">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{child.display_name}</p>
                      <p className="text-xs text-gray-400">{child.grade}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 알림 설정 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">알림 설정</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-700">매일 루틴 알림</p>
              <p className="text-xs text-gray-400">앱 열 때 알림을 보내드려요</p>
            </div>
            <button
              onClick={() => setNotifEnabled(v => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative ${notifEnabled ? "bg-[#0D9488]" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${notifEnabled ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
          {notifEnabled && (
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-gray-600">알림 시간</label>
              <input type="time" value={notifTime} onChange={e => setNotifTime(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            </div>
          )}
          <button onClick={saveNotifSettings}
            className="w-full py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold">
            {notifSaved ? "✓ 저장됨" : "설정 저장"}
          </button>
        </div>

        {/* 로그아웃 */}
        <button onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl border border-red-200 text-red-500 font-medium text-sm">
          로그아웃
        </button>

        <p className="text-center text-xs text-gray-300 mt-2">바람나무숲 교육연구소 · WATCH v1.0</p>
      </div>

      <BottomNav current="mypage" />
    </div>
  );
}
