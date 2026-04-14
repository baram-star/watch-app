"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import GrowthTree from "@/components/GrowthTree";
import { Suspense } from "react";

const WATCH_DOMAINS = [
  { key: "heal",   letter: "H", label: "수면", color: "#059669" },
  { key: "think",  letter: "T", label: "학습", color: "#7C3AED" },
  { key: "absorb", letter: "A", label: "독서", color: "#0891B2" },
  { key: "create", letter: "C", label: "놀이", color: "#EA580C" },
  { key: "wonder", letter: "W", label: "성찰", color: "#0D9488" },
];

function ParentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");

  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);
  const [completedDomains, setCompletedDomains] = useState({});
  const [streak, setStreak] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // 자녀 프로필
    const { data: childProfile } = await supabase
      .from("watch_profiles").select("*").eq("id", childId).single();
    if (!childProfile) { router.push("/mypage"); return; }
    setChild(childProfile);

    // 오늘 완료 도메인
    const { data: routines } = await supabase
      .from("watch_routines").select("*").eq("user_id", childId).eq("is_active", true);
    const routineIds = (routines || []).map(r => r.id);

    if (routineIds.length) {
      const { data: logs } = await supabase
        .from("watch_daily_logs").select("*")
        .in("routine_id", routineIds).eq("log_date", today).eq("completed", true);
      const completed = {};
      (logs || []).forEach(log => {
        const r = routines.find(rt => rt.id === log.routine_id);
        if (r) completed[r.domain] = { notes: log.notes };
      });
      setCompletedDomains(completed);
    }

    // 스트릭
    const { data: streakLogs } = await supabase
      .from("watch_daily_logs").select("log_date")
      .eq("user_id", childId).eq("completed", true)
      .order("log_date", { ascending: false }).limit(100);
    const dates = [...new Set((streakLogs || []).map(l => l.log_date))].sort().reverse();
    let sc = 0;
    for (let i = 0; i < dates.length; i++) {
      const exp = new Date(today); exp.setDate(exp.getDate() - i);
      if (dates[i] === exp.toISOString().split("T")[0]) sc++;
      else break;
    }
    setStreak(sc);

    // 최근 7일 실천 현황
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const dayLogs = (streakLogs || []).filter(l => l.log_date === ds);
      weekly.push({ date: ["일","월","화","수","목","금","토"][d.getDay()], count: dayLogs.length, ds });
    }
    setWeeklyData(weekly);

    setLoading(false);
  }, [childId, router, today]);

  useEffect(() => { if (childId) loadData(); else router.push("/mypage"); }, [childId, loadData, router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const completedCount = Object.keys(completedDomains).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-teal-100 text-sm mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>
        <h1 className="text-xl font-bold">{child?.display_name}</h1>
        <p className="text-teal-100 text-sm mt-1">{child?.grade} · 오늘의 WATCH</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-teal-700 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / 5) * 100}%` }} />
          </div>
          <span className="text-white font-bold text-sm">{completedCount} / 5</span>
        </div>
      </header>

      <div className="px-5 mt-6 flex flex-col gap-4">
        {/* 오늘 WATCH 현황 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">오늘의 실천 현황</h3>
          <div className="flex gap-2">
            {WATCH_DOMAINS.map(d => {
              const done = !!completedDomains[d.key];
              return (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: done ? d.color : "#F3F4F6" }}>
                    <span className={`font-bold text-sm ${done ? "text-white" : "text-gray-400"}`}>{d.letter}</span>
                  </div>
                  <span className="text-xs text-gray-500">{d.label}</span>
                  {done && <span className="text-xs text-green-500 font-bold">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* 성장 나무 */}
        <GrowthTree streak={streak} />

        {/* 주간 현황 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">최근 7일 실천</h3>
          <div className="flex items-end gap-2 h-24">
            {weeklyData.map((d, i) => {
              const isToday = d.ds === today;
              const heightPct = d.count > 0 ? Math.max(20, (d.count / 5) * 100) : 4;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-lg transition-all"
                    style={{ height: `${heightPct}%`, backgroundColor: isToday ? "#0D9488" : d.count > 0 ? "#99F6E4" : "#F3F4F6", minHeight: "4px" }} />
                  <span className={`text-xs ${isToday ? "font-bold text-[#0D9488]" : "text-gray-400"}`}>{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 메모 확인 */}
        {Object.entries(completedDomains).filter(([, v]) => v.notes).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">오늘의 기록</h3>
            {Object.entries(completedDomains).filter(([, v]) => v.notes).map(([key, val]) => {
              const domain = WATCH_DOMAINS.find(d => d.key === key);
              return (
                <div key={key} className="flex gap-3 mb-3 last:mb-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: domain?.color }}>
                    <span className="text-white text-xs font-bold">{domain?.letter}</span>
                  </div>
                  <p className="text-sm text-gray-600 pt-0.5">{val.notes}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav current="mypage" />
    </div>
  );
}

export default function ParentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>}>
      <ParentContent />
    </Suspense>
  );
}
