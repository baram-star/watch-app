"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import GrowthTree from "@/components/GrowthTree";

const WATCH_DOMAINS = [
  { key: "heal", letter: "H", label: "수면", subtitle: "Heal", color: "#059669", desc: "기상/취침 시각을 기록해요" },
  { key: "think", letter: "T", label: "학습", subtitle: "Think", color: "#7C3AED", desc: "오늘의 학습 기록" },
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
  const [streak, setStreak] = useState(0);

  // 모달 상태
  const [activeModal, setActiveModal] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // 수면 기록
  const [sleepData, setSleepData] = useState({ wake_time: "", sleep_time: "", sleep_quality: 3, notes: "" });
  // 학습 기록
  const [thinkData, setThinkData] = useState({ duration: "", notes: "" });
  // 놀이 기록
  const [createData, setCreateData] = useState({ duration: "", notes: "" });
  // 성찰 기록
  const [wonderData, setWonderData] = useState({ gratitude_1: "", gratitude_2: "", gratitude_3: "", journal: "" });
  const [wonderExistingId, setWonderExistingId] = useState(null);
  // 독서 기록
  const [absorbForm, setAbsorbForm] = useState({ book_title: "", pages_read: "", reading_minutes: "", memo: "" });

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setDebugInfo(userError ? "getUser 에러: " + userError.message : "유저 없음");
        if (!user) router.push("/login");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("watch_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        setDebugInfo(profileError ? "프로필 에러: " + profileError.message : "프로필 없음");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // 루틴 로드
      let { data: routineData } = await supabase
        .from("watch_routines")
        .select("*")
        .eq("user_id", profileData.id)
        .eq("is_active", true);

      // 누락된 도메인 루틴 추가 생성
      const existingDomains = (routineData || []).map((r) => r.domain);
      const missingDomains = WATCH_DOMAINS.filter((d) => !existingDomains.includes(d.key));
      if (missingDomains.length > 0) {
        const newRoutines = missingDomains.map((d, i) => ({
          user_id: profileData.id,
          domain: d.key,
          title: `${d.label} 루틴`,
          sort_order: WATCH_DOMAINS.findIndex((x) => x.key === d.key),
          is_active: true,
        }));
        const { data: inserted } = await supabase
          .from("watch_routines")
          .insert(newRoutines)
          .select();
        routineData = [...(routineData || []), ...(inserted || [])];
      }

      setRoutines(routineData);

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
            completed[routine.domain] = { logId: log.id, notes: log.notes };
          }
        });
        setCompletedDomains(completed);
      }

      // 스트릭 계산
      const { data: streakLogs } = await supabase
        .from("watch_daily_logs")
        .select("log_date")
        .eq("user_id", profileData.id)
        .eq("completed", true)
        .order("log_date", { ascending: false })
        .limit(100);
      const uniqueDates = [...new Set((streakLogs || []).map((l) => l.log_date))].sort().reverse();
      let streakCount = 0;
      for (let i = 0; i < uniqueDates.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        if (uniqueDates[i] === expected.toISOString().split("T")[0]) streakCount++;
        else break;
      }
      setStreak(streakCount);

      // 오늘의 수면 기록 로드
      const { data: sleepLog } = await supabase
        .from("watch_sleep_logs")
        .select("*")
        .eq("user_id", profileData.id)
        .eq("log_date", today)
        .single();

      if (sleepLog) {
        setSleepData({
          wake_time: sleepLog.wake_time || "",
          sleep_time: sleepLog.sleep_time || "",
          sleep_quality: sleepLog.sleep_quality || 3,
          notes: sleepLog.notes || "",
        });
      }

      setLoading(false);
    } catch (err) {
      setDebugInfo("예외 발생: " + err.message);
      setLoading(false);
    }
  }, [router, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 카드 클릭 핸들러
  const handleCardClick = async (domainKey) => {
    setModalError("");
    setActiveModal(domainKey);

    // 이미 완료된 경우 메모 복원
    if (completedDomains[domainKey]?.notes) {
      if (domainKey === "think") {
        const parts = completedDomains[domainKey].notes.split("|");
        setThinkData({ duration: parts[0] || "", notes: parts[1] || "" });
      } else if (domainKey === "create") {
        const parts = completedDomains[domainKey].notes.split("|");
        setCreateData({ duration: parts[0] || "", notes: parts[1] || "" });
      }
    }

    // 성찰: 오늘 기존 기록 로드
    if (domainKey === "wonder") {
      const supabase = createClient();
      const { data } = await supabase
        .from("watch_reflections")
        .select("*")
        .eq("user_id", profile.id)
        .eq("reflection_date", today)
        .single();
      if (data) {
        setWonderData({
          gratitude_1: data.gratitude_1 || "",
          gratitude_2: data.gratitude_2 || "",
          gratitude_3: data.gratitude_3 || "",
          journal: data.journal || "",
        });
        setWonderExistingId(data.id);
      } else {
        setWonderData({ gratitude_1: "", gratitude_2: "", gratitude_3: "", journal: "" });
        setWonderExistingId(null);
      }
    }

    // 독서: 폼 초기화
    if (domainKey === "absorb") {
      setAbsorbForm({ book_title: "", pages_read: "", reading_minutes: "", memo: "" });
    }
  };

  // 수면 저장
  const saveSleep = async () => {
    setModalSaving(true);
    setModalError("");
    const supabase = createClient();

    // sleep_logs에 저장/업데이트
    const { data: existing } = await supabase
      .from("watch_sleep_logs")
      .select("id")
      .eq("user_id", profile.id)
      .eq("log_date", today)
      .single();

    const payload = {
      user_id: profile.id,
      log_date: today,
      wake_time: sleepData.wake_time || null,
      sleep_time: sleepData.sleep_time || null,
      sleep_quality: sleepData.sleep_quality,
      notes: sleepData.notes || null,
    };

    if (existing) {
      await supabase.from("watch_sleep_logs").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("watch_sleep_logs").insert(payload);
    }

    // daily_logs에 완료 표시
    const result = await markDomainComplete("heal", `${sleepData.wake_time || ""}~${sleepData.sleep_time || ""}`);
    setModalSaving(false);
    if (result?.error) { setModalError(result.error); return; }
    setActiveModal(null);
  };

  // 학습 저장
  const saveThink = async () => {
    setModalSaving(true);
    setModalError("");
    const notes = `${thinkData.duration}|${thinkData.notes}`;
    const result = await markDomainComplete("think", notes);
    setModalSaving(false);
    if (result?.error) { setModalError(result.error); return; }
    setActiveModal(null);
  };

  // 놀이 저장
  const saveCreate = async () => {
    setModalSaving(true);
    setModalError("");
    const notes = `${createData.duration}|${createData.notes}`;
    const result = await markDomainComplete("create", notes);
    setModalSaving(false);
    if (result?.error) { setModalError(result.error); return; }
    setActiveModal(null);
  };

  // 성찰 저장
  const saveWonder = async () => {
    setModalSaving(true);
    setModalError("");
    const supabase = createClient();
    const payload = { user_id: profile.id, reflection_date: today, ...wonderData };
    if (wonderExistingId) {
      await supabase.from("watch_reflections").update(wonderData).eq("id", wonderExistingId);
    } else {
      const { data } = await supabase.from("watch_reflections").insert(payload).select().single();
      if (data) setWonderExistingId(data.id);
    }
    const notes = [wonderData.gratitude_1, wonderData.gratitude_2, wonderData.gratitude_3].filter(Boolean).join(", ");
    const result = await markDomainComplete("wonder", notes);
    setModalSaving(false);
    if (result?.error) { setModalError(result.error); return; }
    setActiveModal(null);
  };

  // 독서 저장
  const saveAbsorb = async () => {
    if (!absorbForm.book_title.trim()) { setModalError("책 제목을 입력해주세요"); return; }
    setModalSaving(true);
    setModalError("");
    const supabase = createClient();
    await supabase.from("watch_reading_logs").insert({
      user_id: profile.id,
      book_title: absorbForm.book_title,
      pages_read: absorbForm.pages_read ? parseInt(absorbForm.pages_read) : null,
      reading_minutes: absorbForm.reading_minutes ? parseInt(absorbForm.reading_minutes) : null,
      memo: absorbForm.memo || null,
      started_at: today,
    });
    const notes = `${absorbForm.book_title}${absorbForm.reading_minutes ? ` · ${absorbForm.reading_minutes}분` : ""}`;
    const result = await markDomainComplete("absorb", notes);
    setModalSaving(false);
    if (result?.error) { setModalError(result.error); return; }
    setActiveModal(null);
  };

  // 영역 완료 처리
  const markDomainComplete = async (domainKey, notes) => {
    const supabase = createClient();
    const routine = routines.find((r) => r.domain === domainKey);
    if (!routine) {
      return { error: `루틴을 찾을 수 없습니다 (domain: ${domainKey})` };
    }

    // 기존 기록이 있으면 업데이트, 없으면 생성
    if (completedDomains[domainKey]) {
      const { error } = await supabase
        .from("watch_daily_logs")
        .update({ notes, completed: true, completed_at: new Date().toISOString() })
        .eq("id", completedDomains[domainKey].logId);

      if (error) return { error: error.message };

      setCompletedDomains((prev) => ({
        ...prev,
        [domainKey]: { ...prev[domainKey], notes },
      }));
    } else {
      setAnimating(domainKey);
      const { data, error } = await supabase
        .from("watch_daily_logs")
        .insert({
          user_id: profile.id,
          routine_id: routine.id,
          log_date: today,
          completed: true,
          completed_at: new Date().toISOString(),
          notes,
        })
        .select()
        .single();

      if (error) {
        setTimeout(() => setAnimating(null), 300);
        return { error: error.message };
      }

      if (data) {
        setCompletedDomains((prev) => ({
          ...prev,
          [domainKey]: { logId: data.id, notes },
        }));
      }
      setTimeout(() => setAnimating(null), 600);
    }
    return { error: null };
  };

  // 완료 취소
  const undoDomain = async (domainKey) => {
    const supabase = createClient();
    if (!completedDomains[domainKey]) return;

    await supabase
      .from("watch_daily_logs")
      .delete()
      .eq("id", completedDomains[domainKey].logId);

    setCompletedDomains((prev) => {
      const next = { ...prev };
      delete next[domainKey];
      return next;
    });
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

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <p className="text-red-500 font-bold">문제 발생</p>
        <p className="text-sm text-gray-600 text-center">{debugInfo}</p>
        <button onClick={() => router.push("/login")} className="mt-4 px-6 py-2 bg-[#0D9488] text-white rounded-xl">
          로그인으로 돌아가기
        </button>
      </div>
    );
  }

  const completedCount = Object.keys(completedDomains).length;
  const progressPercent = (completedCount / WATCH_DOMAINS.length) * 100;
  const todayStr = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="bg-[#0D9488] text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-teal-100 text-sm">{todayStr}</p>
            <h1 className="text-xl font-bold mt-1">{profile.display_name}님, 안녕하세요!</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                <span className="text-base">🔥</span>
                <span className="text-white font-bold text-sm">{streak}일 연속</span>
              </div>
            )}
            <button onClick={handleLogout} className="text-xs text-teal-200 hover:text-white">로그아웃</button>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-teal-100 text-sm">오늘의 진행률</p>
            <p className="text-white font-bold text-sm">{completedCount} / {WATCH_DOMAINS.length}</p>
          </div>
          <div className="w-full h-2.5 bg-teal-700 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
          </div>
          {completedCount === WATCH_DOMAINS.length && (
            <p className="text-center text-white font-bold mt-3 text-sm">오늘의 WATCH를 모두 완료했어요!</p>
          )}
        </div>
      </header>

      {/* WATCH 카드 리스트 */}
      <div className="px-5 mt-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-800 mb-1">오늘의 WATCH</h2>
        {WATCH_DOMAINS.map((domain) => {
          const isCompleted = !!completedDomains[domain.key];
          const isAnimating = animating === domain.key;
          const completedInfo = completedDomains[domain.key];

          // 완료 시 요약 텍스트
          let summaryText = "";
          if (isCompleted && completedInfo?.notes) {
            if (domain.key === "heal") {
              const parts = completedInfo.notes.split("~");
              if (parts[0]) summaryText += `기상 ${parts[0]}`;
              if (parts[1]) summaryText += ` · 취침 ${parts[1]}`;
            } else if (domain.key === "think" || domain.key === "create") {
              const parts = completedInfo.notes.split("|");
              if (parts[0]) summaryText += `${parts[0]}분`;
              if (parts[1]) summaryText += ` · ${parts[1]}`;
            }
          }

          return (
            <div key={domain.key} className={`rounded-2xl shadow-sm border transition-all duration-300 ${
              isCompleted ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100"
            } ${isAnimating ? "scale-[1.02]" : ""}`}>
              <button
                onClick={() => handleCardClick(domain.key)}
                className="flex items-center gap-4 p-4 text-left w-full"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCompleted ? "opacity-40" : ""}`}
                  style={{ backgroundColor: domain.color }}
                >
                  <span className="text-white font-bold text-lg">{domain.letter}</span>
                </div>

                <div className={`flex-1 ${isCompleted ? "opacity-40" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{domain.label}</span>
                    <span className="text-xs text-gray-400">{domain.subtitle}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {summaryText || domain.desc}
                  </p>
                </div>

                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isCompleted ? "border-transparent" : "border-gray-300"
                  }`}
                  style={isCompleted ? { backgroundColor: domain.color } : {}}
                >
                  {isCompleted && (
                    <svg className={`w-5 h-5 text-white ${isAnimating ? "animate-bounce" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* 완료 취소 버튼 */}
              {isCompleted && (
                <div className="px-4 pb-3 flex justify-end">
                  <button
                    onClick={() => undoDomain(domain.key)}
                    className="text-xs text-gray-400 hover:text-red-400"
                  >
                    기록 취소
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 수면 모달 */}
      {activeModal === "heal" && (
        <Modal title="수면 기록" color="#059669" onClose={() => setActiveModal(null)} error={modalError}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">기상 시각</label>
                <input
                  type="time"
                  value={sleepData.wake_time}
                  onChange={(e) => setSleepData({ ...sleepData, wake_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">취침 시각</label>
                <input
                  type="time"
                  value={sleepData.sleep_time}
                  onChange={(e) => setSleepData({ ...sleepData, sleep_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">수면 질 평가</label>
              <div className="flex gap-2">
                {[
                  { q: 1, face: <SleepFace type="terrible" />, label: "최악" },
                  { q: 2, face: <SleepFace type="bad" />, label: "나쁨" },
                  { q: 3, face: <SleepFace type="neutral" />, label: "보통" },
                  { q: 4, face: <SleepFace type="good" />, label: "좋음" },
                  { q: 5, face: <SleepFace type="great" />, label: "최고" },
                ].map(({ q, face, label }) => (
                  <button
                    key={q}
                    onClick={() => setSleepData({ ...sleepData, sleep_quality: q })}
                    className={`flex-1 flex flex-col items-center py-3 rounded-2xl border-2 transition-all ${
                      sleepData.sleep_quality === q
                        ? "border-[#059669] bg-green-50 scale-105"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="text-3xl leading-none mb-1">{face}</span>
                    <span className={`text-xs font-medium ${sleepData.sleep_quality === q ? "text-[#059669]" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
              <input
                type="text"
                value={sleepData.notes}
                onChange={(e) => setSleepData({ ...sleepData, notes: e.target.value })}
                placeholder="수면 관련 메모 (선택)"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

            <button
              onClick={saveSleep}
              disabled={modalSaving}
              className="w-full py-3.5 rounded-xl bg-[#059669] text-white font-semibold disabled:opacity-50"
            >
              {modalSaving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </Modal>
      )}

      {/* 학습 모달 */}
      {activeModal === "think" && (
        <Modal title="학습 기록" color="#7C3AED" onClose={() => setActiveModal(null)} error={modalError}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학습 시간 (분)</label>
              <input
                type="number"
                value={thinkData.duration}
                onChange={(e) => setThinkData({ ...thinkData, duration: e.target.value })}
                placeholder="예: 60"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">어떤 학습을 했나요?</label>
              <textarea
                value={thinkData.notes}
                onChange={(e) => setThinkData({ ...thinkData, notes: e.target.value })}
                placeholder="예: 수학 문제집 30~40페이지 풀기"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>

            <button
              onClick={saveThink}
              disabled={modalSaving}
              className="w-full py-3.5 rounded-xl bg-[#7C3AED] text-white font-semibold disabled:opacity-50"
            >
              {modalSaving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </Modal>
      )}

      {/* 놀이 모달 */}
      {activeModal === "create" && (
        <Modal title="놀이 기록" color="#EA580C" onClose={() => setActiveModal(null)} error={modalError}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">활동 시간 (분)</label>
              <input
                type="number"
                value={createData.duration}
                onChange={(e) => setCreateData({ ...createData, duration: e.target.value })}
                placeholder="예: 30"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">어떤 활동을 했나요?</label>
              <textarea
                value={createData.notes}
                onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                placeholder="예: 축구, 레고 조립, 그림 그리기"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
            </div>

            <button
              onClick={saveCreate}
              disabled={modalSaving}
              className="w-full py-3.5 rounded-xl bg-[#EA580C] text-white font-semibold disabled:opacity-50"
            >
              {modalSaving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </Modal>
      )}

      {/* 성찰 모달 */}
      {activeModal === "wonder" && (
        <Modal title="성찰 기록" color="#0D9488" onClose={() => setActiveModal(null)} error={modalError}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">오늘 감사한 3가지</p>
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{num}</span>
                  </div>
                  <input
                    type="text"
                    value={wonderData[`gratitude_${num}`]}
                    onChange={(e) => setWonderData({ ...wonderData, [`gratitude_${num}`]: e.target.value })}
                    placeholder={`감사한 것 ${num}`}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">성찰 일기</label>
              <textarea
                value={wonderData.journal}
                onChange={(e) => setWonderData({ ...wonderData, journal: e.target.value })}
                placeholder="오늘은 어떤 하루였나요?"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <button
              onClick={saveWonder}
              disabled={modalSaving}
              className="w-full py-3.5 rounded-xl bg-[#0D9488] text-white font-semibold disabled:opacity-50"
            >
              {modalSaving ? "저장 중..." : wonderExistingId ? "수정하기" : "저장하기"}
            </button>
          </div>
        </Modal>
      )}

      {/* 독서 모달 */}
      {activeModal === "absorb" && (
        <Modal title="독서 기록" color="#0891B2" onClose={() => setActiveModal(null)} error={modalError}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">책 제목</label>
              <input
                type="text"
                value={absorbForm.book_title}
                onChange={(e) => setAbsorbForm({ ...absorbForm, book_title: e.target.value })}
                placeholder="읽은 책 제목"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">읽은 페이지</label>
                <input
                  type="number"
                  value={absorbForm.pages_read}
                  onChange={(e) => setAbsorbForm({ ...absorbForm, pages_read: e.target.value })}
                  placeholder="페이지"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">독서 시간 (분)</label>
                <input
                  type="number"
                  value={absorbForm.reading_minutes}
                  onChange={(e) => setAbsorbForm({ ...absorbForm, reading_minutes: e.target.value })}
                  placeholder="예: 30"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
              <textarea
                value={absorbForm.memo}
                onChange={(e) => setAbsorbForm({ ...absorbForm, memo: e.target.value })}
                placeholder="인상 깊은 내용이나 느낀 점"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              />
            </div>

            <button
              onClick={saveAbsorb}
              disabled={modalSaving}
              className="w-full py-3.5 rounded-xl bg-[#0891B2] text-white font-semibold disabled:opacity-50"
            >
              {modalSaving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </Modal>
      )}

      {/* 성장 나무 */}
      <div className="px-5 mt-4">
        <GrowthTree streak={streak} />
      </div>

      <BottomNav current="home" />
    </div>
  );
}

// 모달 컴포넌트
function Modal({ title, color, onClose, error, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl px-5 pt-6 pb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}>
              <span className="text-white font-bold text-sm">{title[0]}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {error && (
          <p className="text-red-500 text-sm mb-3 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}
        {children}
      </div>
    </div>
  );
}

// 수면 질 SVG 아이콘
function SleepFace({ type }) {
  const faces = {
    terrible: (
      <svg viewBox="0 0 36 36" className="w-8 h-8" fill="none">
        <circle cx="18" cy="18" r="17" fill="#FEE2E2" stroke="#FCA5A5" strokeWidth="1.5"/>
        <ellipse cx="12.5" cy="15" rx="2" ry="2.5" fill="#EF4444"/>
        <ellipse cx="23.5" cy="15" rx="2" ry="2.5" fill="#EF4444"/>
        <path d="M11 25 Q18 20 25 25" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M10 11 L14 13M26 11 L22 13" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    bad: (
      <svg viewBox="0 0 36 36" className="w-8 h-8" fill="none">
        <circle cx="18" cy="18" r="17" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="1.5"/>
        <ellipse cx="12.5" cy="15" rx="2" ry="2.5" fill="#D97706"/>
        <ellipse cx="23.5" cy="15" rx="2" ry="2.5" fill="#D97706"/>
        <path d="M12 24 Q18 21 24 24" stroke="#D97706" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    neutral: (
      <svg viewBox="0 0 36 36" className="w-8 h-8" fill="none">
        <circle cx="18" cy="18" r="17" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5"/>
        <ellipse cx="12.5" cy="15" rx="2" ry="2.5" fill="#6B7280"/>
        <ellipse cx="23.5" cy="15" rx="2" ry="2.5" fill="#6B7280"/>
        <path d="M12 24 L24 24" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    good: (
      <svg viewBox="0 0 36 36" className="w-8 h-8" fill="none">
        <circle cx="18" cy="18" r="17" fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="1.5"/>
        <ellipse cx="12.5" cy="15" rx="2" ry="2.5" fill="#059669"/>
        <ellipse cx="23.5" cy="15" rx="2" ry="2.5" fill="#059669"/>
        <path d="M12 22 Q18 27 24 22" stroke="#059669" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    great: (
      <svg viewBox="0 0 36 36" className="w-8 h-8" fill="none">
        <circle cx="18" cy="18" r="17" fill="#CFFAFE" stroke="#67E8F9" strokeWidth="1.5"/>
        <ellipse cx="12.5" cy="14" rx="2.5" ry="3" fill="#0E7490"/>
        <ellipse cx="23.5" cy="14" rx="2.5" ry="3" fill="#0E7490"/>
        <path d="M10 21 Q18 29 26 21" stroke="#0E7490" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M10 21 Q18 29 26 21 Q26 21 18 21 Q10 21 10 21Z" fill="#CFFAFE" opacity="0.5"/>
        <path d="M13 21 Q18 26 23 21" stroke="none" fill="#0E7490" opacity="0.15"/>
      </svg>
    ),
  };
  return faces[type] || null;
}
