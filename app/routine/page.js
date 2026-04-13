"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

const DOMAIN_INFO = {
  heal: { letter: "H", label: "수면", color: "#059669" },
  think: { letter: "T", label: "학습", color: "#7C3AED" },
  absorb: { letter: "A", label: "독서", color: "#0891B2" },
  create: { letter: "C", label: "놀이", color: "#EA580C" },
  wonder: { letter: "W", label: "성찰", color: "#0D9488" },
};

const TIME_SLOTS = [
  { value: "morning", label: "아침" },
  { value: "afternoon", label: "오후" },
  { value: "evening", label: "저녁" },
  { value: "bedtime", label: "취침 전" },
];

export default function RoutinePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    domain: "heal",
    title: "",
    time_slot: "morning",
    duration_minutes: 30,
  });

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

    const { data: routineData } = await supabase
      .from("watch_routines")
      .select("*")
      .eq("user_id", profileData.id)
      .order("sort_order", { ascending: true });

    setRoutines(routineData || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.title.trim()) return;
    const supabase = createClient();

    const { data } = await supabase
      .from("watch_routines")
      .insert({
        user_id: profile.id,
        domain: form.domain,
        title: form.title,
        time_slot: form.time_slot,
        duration_minutes: form.duration_minutes,
        sort_order: routines.length,
        is_active: true,
      })
      .select()
      .single();

    if (data) {
      setRoutines([...routines, data]);
      setForm({ domain: "heal", title: "", time_slot: "morning", duration_minutes: 30 });
      setShowAdd(false);
    }
  }

  async function handleUpdate() {
    if (!editing || !form.title.trim()) return;
    const supabase = createClient();

    const { data } = await supabase
      .from("watch_routines")
      .update({
        title: form.title,
        time_slot: form.time_slot,
        duration_minutes: form.duration_minutes,
        domain: form.domain,
      })
      .eq("id", editing)
      .select()
      .single();

    if (data) {
      setRoutines(routines.map((r) => (r.id === editing ? data : r)));
      setEditing(null);
      setForm({ domain: "heal", title: "", time_slot: "morning", duration_minutes: 30 });
    }
  }

  async function handleDelete(id) {
    const supabase = createClient();
    await supabase.from("watch_routines").delete().eq("id", id);
    setRoutines(routines.filter((r) => r.id !== id));
  }

  async function toggleActive(routine) {
    const supabase = createClient();
    const { data } = await supabase
      .from("watch_routines")
      .update({ is_active: !routine.is_active })
      .eq("id", routine.id)
      .select()
      .single();

    if (data) {
      setRoutines(routines.map((r) => (r.id === routine.id ? data : r)));
    }
  }

  function startEdit(routine) {
    setEditing(routine.id);
    setForm({
      domain: routine.domain,
      title: routine.title,
      time_slot: routine.time_slot || "morning",
      duration_minutes: routine.duration_minutes || 30,
    });
    setShowAdd(false);
  }

  function startAdd() {
    setShowAdd(true);
    setEditing(null);
    setForm({ domain: "heal", title: "", time_slot: "morning", duration_minutes: 30 });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = {};
  Object.keys(DOMAIN_INFO).forEach((key) => { grouped[key] = []; });
  routines.forEach((r) => {
    if (grouped[r.domain]) grouped[r.domain].push(r);
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <h1 className="text-xl font-bold">루틴 설정</h1>
        <p className="text-teal-100 text-sm mt-1">WATCH 영역별 루틴을 관리하세요</p>
      </header>

      <div className="px-5 mt-6 flex flex-col gap-4">
        {Object.entries(grouped).map(([domain, items]) => {
          const info = DOMAIN_INFO[domain];
          return (
            <div key={domain} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* 영역 헤더 */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: info.color }}
                >
                  <span className="text-white font-bold text-sm">{info.letter}</span>
                </div>
                <span className="font-bold text-gray-900">{info.label}</span>
                <span className="text-xs text-gray-400 ml-auto">{items.length}개</span>
              </div>

              {/* 루틴 리스트 */}
              {items.map((routine) => (
                <div
                  key={routine.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 ${
                    !routine.is_active ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{routine.title}</p>
                    <div className="flex gap-2 mt-1">
                      {routine.time_slot && (
                        <span className="text-xs text-gray-400">
                          {TIME_SLOTS.find((t) => t.value === routine.time_slot)?.label}
                        </span>
                      )}
                      {routine.duration_minutes && (
                        <span className="text-xs text-gray-400">{routine.duration_minutes}분</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(routine)}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      routine.is_active ? "bg-[#0D9488]" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        routine.is_active ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => startEdit(routine)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(routine.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {/* 추가 버튼 */}
        {!showAdd && !editing && (
          <button
            onClick={startAdd}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-medium hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
          >
            + 새 루틴 추가
          </button>
        )}

        {/* 추가/수정 폼 */}
        {(showAdd || editing) && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#0D9488] p-5 flex flex-col gap-4">
            <h3 className="font-bold text-gray-900">
              {editing ? "루틴 수정" : "새 루틴 추가"}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">영역</label>
              <div className="flex gap-2">
                {Object.entries(DOMAIN_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, domain: key })}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm transition-all ${
                      form.domain === key ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "opacity-50"
                    }`}
                    style={{ backgroundColor: info.color }}
                  >
                    {info.letter}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">루틴 이름</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 수학 문제 풀기"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">시간대</label>
                <select
                  value={form.time_slot}
                  onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">시간(분)</label>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={editing ? handleUpdate : handleAdd}
                className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white font-semibold text-sm"
              >
                {editing ? "수정 완료" : "추가하기"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setEditing(null); }}
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav current="routine" />
    </div>
  );
}
