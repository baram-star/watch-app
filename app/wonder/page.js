"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function WonderPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reflection, setReflection] = useState({
    gratitude_1: "",
    gratitude_2: "",
    gratitude_3: "",
    journal: "",
  });
  const [existingId, setExistingId] = useState(null);

  const today = new Date().toISOString().split("T")[0];

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

    // 오늘의 성찰 기록 로드
    const { data: existing } = await supabase
      .from("watch_reflections")
      .select("*")
      .eq("user_id", profileData.id)
      .eq("reflection_date", today)
      .single();

    if (existing) {
      setReflection({
        gratitude_1: existing.gratitude_1 || "",
        gratitude_2: existing.gratitude_2 || "",
        gratitude_3: existing.gratitude_3 || "",
        journal: existing.journal || "",
      });
      setExistingId(existing.id);
    }

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();

    const payload = {
      user_id: profile.id,
      reflection_date: today,
      ...reflection,
    };

    if (existingId) {
      await supabase
        .from("watch_reflections")
        .update(reflection)
        .eq("id", existingId);
    } else {
      const { data } = await supabase
        .from("watch_reflections")
        .insert(payload)
        .select()
        .single();

      if (data) setExistingId(data.id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">W</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">성찰 기록</h1>
            <p className="text-teal-100 text-sm">{todayStr}</p>
          </div>
        </div>
      </header>

      <div className="px-5 mt-6 flex flex-col gap-5">
        {/* 감사 3가지 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-1">오늘 감사한 3가지</h2>
          <p className="text-xs text-gray-400 mb-4">작은 것이라도 좋아요</p>

          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{num}</span>
              </div>
              <input
                type="text"
                value={reflection[`gratitude_${num}`]}
                onChange={(e) =>
                  setReflection({ ...reflection, [`gratitude_${num}`]: e.target.value })
                }
                placeholder={`감사한 것 ${num}`}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>
          ))}
        </div>

        {/* 성찰 일기 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-1">성찰 일기</h2>
          <p className="text-xs text-gray-400 mb-4">오늘 하루를 돌아보며 자유롭게 써보세요</p>
          <textarea
            value={reflection.journal}
            onChange={(e) => setReflection({ ...reflection, journal: e.target.value })}
            placeholder="오늘은 어떤 하루였나요?"
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
            saved
              ? "bg-green-500 text-white"
              : "bg-[#0D9488] text-white hover:bg-teal-700"
          } disabled:opacity-50`}
        >
          {saving ? "저장 중..." : saved ? "저장 완료!" : existingId ? "수정하기" : "저장하기"}
        </button>
      </div>

      <BottomNav current="home" />
    </div>
  );
}
