"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const WATCH_DOMAINS = [
  {
    key: "heal",
    letter: "H",
    label: "수면",
    subtitle: "Heal",
    color: "bg-[#059669]",
    desc: "기상 시각을 기록해요",
    icon: "🌅",
  },
  {
    key: "think",
    letter: "T",
    label: "학습",
    subtitle: "Think",
    color: "bg-[#7C3AED]",
    desc: "오늘의 학습 목표",
    icon: "📚",
  },
  {
    key: "absorb",
    letter: "A",
    label: "독서",
    subtitle: "Absorb",
    color: "bg-[#0891B2]",
    desc: "책 읽기 시간",
    icon: "📖",
  },
  {
    key: "create",
    letter: "C",
    label: "놀이",
    subtitle: "Create",
    color: "bg-[#EA580C]",
    desc: "신체활동 · 창작놀이",
    icon: "🎨",
  },
  {
    key: "wonder",
    letter: "W",
    label: "성찰",
    subtitle: "Wonder",
    color: "bg-[#0D9488]",
    desc: "감사와 성찰 일기",
    icon: "✨",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("watch_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, [router]);

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

  const today = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* 헤더 */}
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-teal-100 text-sm">{today}</p>
            <h1 className="text-xl font-bold mt-1">
              {profile?.display_name || "사용자"}님, 안녕하세요!
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-teal-200 hover:text-white"
          >
            로그아웃
          </button>
        </div>
        <p className="text-teal-100 text-sm">
          오늘의 WATCH 루틴을 시작해볼까요?
        </p>
      </header>

      {/* WATCH 카드 리스트 */}
      <div className="px-5 mt-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-800 mb-1">오늘의 WATCH</h2>
        {WATCH_DOMAINS.map((domain) => (
          <div
            key={domain.key}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
          >
            <div
              className={`w-12 h-12 rounded-xl ${domain.color} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-white font-bold text-lg">
                {domain.letter}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{domain.label}</span>
                <span className="text-xs text-gray-400">{domain.subtitle}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{domain.desc}</p>
            </div>
            <span className="text-2xl">{domain.icon}</span>
          </div>
        ))}
      </div>

      {/* 안내 */}
      <div className="px-5 mt-6">
        <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
          <p className="text-sm text-teal-700 text-center">
            루틴 설정과 기록 기능은 곧 추가될 예정이에요!
          </p>
        </div>
      </div>
    </div>
  );
}
