"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

const WATCH_DOMAINS = [
  { key: "heal", letter: "H", label: "수면", subtitle: "Heal", color: "#059669", desc: "기상 시각을 기록해요" },
  { key: "think", letter: "T", label: "학습", subtitle: "Think", color: "#7C3AED", desc: "오늘의 학습 목표" },
  { key: "absorb", letter: "A", label: "독서", subtitle: "Absorb", color: "#0891B2", desc: "책 읽기 시간" },
  { key: "create", letter: "C", label: "놀이", subtitle: "Create", color: "#EA580C", desc: "신체활동 · 창작놀이" },
  { key: "wonder", letter: "W", label: "성찰", subtitle: "Wonder", color: "#0D9488", desc: "감사와 성찰 일기" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState([]);
  const [completedDomains, setCompletedDomains] = useState({});
  const [animating, setAnimating] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      setDebugInfo("1. getUser 호출 중...");

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        setDebugInfo("getUser 에러: " + userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setDebugInfo("유저 없음 - 로그인 페이지로 이동");
        router.push("/login");
        return;
      }

      setDebugInfo("2. 프로필 로드 중... user.id=" + user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("watch_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        setDebugInfo("프로필 에러: " + profileError.message + " (code: " + profileError.code + ")");
        setLoading(false);
        return;
      }

      if (!profileData) {
        setDebugInfo("프로필 데이터 없음");
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setDebugInfo("3. 루틴 로드 중... profile.id=" + profileData.id);

      // 루틴 로드
      let { data: routineData, error: routineError } = await supabase
        .from("watch_routines")
        .select("*")
        .eq("user_id", profileData.id)
        .eq("is_active", true);

      if (routineError) {
        setDebugInfo("루틴 에러: " + routineError.message);
      }

      // 루틴 없으면 기본 루틴 생성
      if (!routineData || routineData.length === 0) {
        setDebugInfo("4. 기본 루틴 생성 중...");
        const defaultRoutines = WATCH_DOMAINS.map((d, i) => ({
          user_id: profileData.id,
          domain: d.key,
          title: `${d.label} 루틴`,
          sort_order: i,
          is_active: true,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from("watch_routines")
          .insert(defaultRoutines)
          .select();

        if (insertError) {
          setDebugInfo("루틴 생성 에러: " + insertError.message);
        }
        routineData = inserted || [];
      }

      setRoutines(routineData);
      setDebugInfo("5. 일일 기록 로드 중...");

      // 오늘의 완료 기록 로드
      const routineIds = routineData.map((r) => r.id);
      if (routineIds.length > 0) {
        const { data: logs } = await supabase
          .from("watch_daily_logs")
          .select("*")
          .in("routine_id", routineIds)
          .eq("log_date", today);

        const completed = {};
        (logs || []).forEach((log) => {
          const routine = routineData.find((r) => r.id === log.routine_id);
          if (routine && log.completed) {
            completed[routine.domain] = log.id;
          }
        });
        setCompletedDomains(completed);
      }

      setDebugInfo("로드 완료!");
      setLoading(false);
    } catch (err) {
      setDebugInfo("예외 발생: " + err.message);
      setLoading(false);
    }
  }, [router, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleDomain = async (domainKey) => {
    const supabase = createClient();
    const routine = routines.find((r) => r.domain === domainKey);
    if (!routine) return;

    const isCompleted = !!completedDomains[domainKey];

    if (isCompleted) {
      await supabase
        .from("watch_daily_logs")
        .delete()
        .eq("id", completedDomains[domainKey]);

      setCompletedDomains((prev) => {
        const next = { ...prev };
        delete next[domainKey];
        return next;
      });
    } else {
      setAnimating(domainKey);
      const { data } = await supabase
        .from("watch_daily_logs")
        .insert({
          user_id: profile.id,
          routine_id: routine.id,
          log_date: today,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (data) {
        setCompletedDomains((prev) => ({ ...prev, [domainKey]: data.id }));
      }
      setTimeout(() => setAnimating(null), 600);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">{debugInfo}</p>
      </div>
    );
  }

  // 프로필이 없으면 에러 표시
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <p className="text-red-500 font-bold">문제 발생</p>
        <p className="text-sm text-gray-600 text-center">{debugInfo}</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 px-6 py-2 bg-[#0D9488] text-white rounded-xl"
        >
          로그인으로 돌아가기
        </button>
      </div>
    );
  }

  const completedCount = Object.keys(completedDomains).length;
  const progressPercent = (completedCount / WATCH_DOMAINS.length) * 100;

  const todayStr = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-teal-100 text-sm">{todayStr}</p>
            <h1 className="text-xl font-bold mt-1">
              {profile.display_name}님, 안녕하세요!
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-teal-200 hover:text-white"
          >
            로그아웃
          </button>
        </div>

        {/* 진행률 바 */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-teal-100 text-sm">오늘의 진행률</p>
            <p className="text-white font-bold text-sm">
              {completedCount} / {WATCH_DOMAINS.length}
            </p>
          </div>
          <div className="w-full h-2.5 bg-teal-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {completedCount === WATCH_DOMAINS.length && (
            <p className="text-center text-white font-bold mt-3 text-sm">
              오늘의 WATCH를 모두 완료했어요!
            </p>
          )}
        </div>
      </header>

      {/* WATCH 카드 리스트 */}
      <div className="px-5 mt-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-800 mb-1">오늘의 WATCH</h2>
        {WATCH_DOMAINS.map((domain) => {
          const isCompleted = !!completedDomains[domain.key];
          const isAnimating = animating === domain.key;

          return (
            <button
              key={domain.key}
              onClick={() => toggleDomain(domain.key)}
              className={`flex items-center gap-4 p-4 rounded-2xl shadow-sm border text-left w-full transition-all duration-300 ${
                isCompleted
                  ? "bg-gray-50 border-gray-200"
                  : "bg-white border-gray-100 active:scale-[0.98]"
              } ${isAnimating ? "scale-[1.02]" : ""}`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isCompleted ? "opacity-40" : ""
                }`}
                style={{ backgroundColor: domain.color }}
              >
                <span className="text-white font-bold text-lg">{domain.letter}</span>
              </div>

              <div className={`flex-1 ${isCompleted ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{domain.label}</span>
                  <span className="text-xs text-gray-400">{domain.subtitle}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{domain.desc}</p>
              </div>

              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isCompleted ? "border-transparent" : "border-gray-300"
                }`}
                style={isCompleted ? { backgroundColor: domain.color } : {}}
              >
                {isCompleted && (
                  <svg
                    className={`w-5 h-5 text-white ${isAnimating ? "animate-bounce" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <BottomNav current="home" />
    </div>
  );
}
