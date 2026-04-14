"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";

const DOMAIN_INFO = {
  heal: { label: "수면", color: "#059669" },
  think: { label: "학습", color: "#7C3AED" },
  absorb: { label: "독서", color: "#0891B2" },
  create: { label: "놀이", color: "#EA580C" },
  wonder: { label: "성찰", color: "#0D9488" },
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function ReportPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week"); // week or month
  const [weeklyData, setWeeklyData] = useState([]);
  const [domainStats, setDomainStats] = useState([]);
  const [summary, setSummary] = useState({ total: 0, rate: 0, bestDomain: "" });

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
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

    // 기간 계산
    const now = new Date();
    const startDate = new Date(now);
    if (period === "week") {
      // 이번 주 월요일부터 시작
      const dayOfWeek = now.getDay(); // 0=일, 1=월 ... 6=토
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(now.getDate() - diffToMonday);
    } else {
      startDate.setDate(now.getDate() - 29);
    }
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = now.toISOString().split("T")[0];

    // 루틴 로드
    const { data: routines } = await supabase
      .from("watch_routines")
      .select("*")
      .eq("user_id", profileData.id);

    if (!routines || routines.length === 0) {
      setLoading(false);
      return;
    }

    const routineIds = routines.map((r) => r.id);

    // 일일 로그 로드
    const { data: logs } = await supabase
      .from("watch_daily_logs")
      .select("*")
      .in("routine_id", routineIds)
      .gte("log_date", startStr)
      .lte("log_date", endStr)
      .eq("completed", true);

    // 날짜별 완료 수 계산
    const days = period === "week" ? 7 : 30;
    const dateMap = {};
    if (period === "week") {
      // 이번 주 월요일부터 일요일까지 7일
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const key = d.toISOString().split("T")[0];
        dateMap[key] = { date: DAY_LABELS[d.getDay()], count: 0, fullDate: key };
      }
    } else {
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - (29 - i));
        const key = d.toISOString().split("T")[0];
        dateMap[key] = { date: `${d.getMonth() + 1}/${d.getDate()}`, count: 0, fullDate: key };
      }
    }

    // 영역별 통계
    const domainCount = {};
    Object.keys(DOMAIN_INFO).forEach((k) => { domainCount[k] = 0; });

    (logs || []).forEach((log) => {
      if (dateMap[log.log_date]) {
        dateMap[log.log_date].count++;
      }
      const routine = routines.find((r) => r.id === log.routine_id);
      if (routine && domainCount[routine.domain] !== undefined) {
        domainCount[routine.domain]++;
      }
    });

    const chartData = Object.values(dateMap);
    setWeeklyData(chartData);

    // 영역별 레이더 데이터
    const maxPossible = days;
    const radarData = Object.entries(DOMAIN_INFO).map(([key, info]) => ({
      domain: info.label,
      value: Math.round((domainCount[key] / maxPossible) * 100),
      count: domainCount[key],
    }));
    setDomainStats(radarData);

    // 요약
    const totalCompleted = (logs || []).length;
    const totalPossible = days * 5;
    const rate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    let bestDomain = "";
    let bestCount = 0;
    Object.entries(domainCount).forEach(([key, count]) => {
      if (count > bestCount) {
        bestCount = count;
        bestDomain = DOMAIN_INFO[key].label;
      }
    });

    setSummary({ total: totalCompleted, rate, bestDomain });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <h1 className="text-xl font-bold">리포트</h1>
        <p className="text-teal-100 text-sm mt-1">나의 WATCH 실천 현황</p>
      </header>

      <div className="px-5 mt-6 flex flex-col gap-4">
        {/* 기간 선택 */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          <button
            onClick={() => setPeriod("week")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              period === "week" ? "bg-[#0D9488] text-white" : "text-gray-500"
            }`}
          >
            최근 7일
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              period === "month" ? "bg-[#0D9488] text-white" : "text-gray-500"
            }`}
          >
            최근 30일
          </button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-[#0D9488]">{summary.rate}%</p>
            <p className="text-xs text-gray-500 mt-1">실천율</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-[#7C3AED]">{summary.total}</p>
            <p className="text-xs text-gray-500 mt-1">완료 횟수</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-lg font-bold text-[#EA580C]">{summary.bestDomain || "-"}</p>
            <p className="text-xs text-gray-500 mt-1">최고 영역</p>
          </div>
        </div>

        {/* 일별 실천 차트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">일별 실천 현황</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barSize={period === "week" ? 28 : 8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval={period === "month" ? 4 : 0}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={25}
              />
              <Tooltip
                formatter={(value) => [`${value}개 완료`, "실천"]}
                labelFormatter={(label) => label}
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
              <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 영역별 균형 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">영역별 균형</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={domainStats} outerRadius={80}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="domain"
                tick={{ fontSize: 12, fill: "#374151" }}
              />
              <Radar
                dataKey="value"
                stroke="#0D9488"
                fill="#0D9488"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* 영역별 상세 */}
          <div className="flex flex-col gap-2 mt-2">
            {domainStats.map((stat) => (
              <div key={stat.domain} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-10">{stat.domain}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stat.value}%`,
                      backgroundColor: Object.values(DOMAIN_INFO).find((d) => d.label === stat.domain)?.color,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-14 text-right">{stat.count}회 ({stat.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav current="report" />
    </div>
  );
}
