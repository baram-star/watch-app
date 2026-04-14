"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

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

  // 모달 상태
  const [activeModal, setActiveModal] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  // 수면 기록
  const [sleepData, setSleepData] = useState({ wake_time: "", sleep_time: "", sleep_quality: 3, notes: "" });
  // 학습 기록
  const [thinkData, setThinkData] = useState({ duration: "", notes: "" });
  // 놀이 기록
  const [createData, setCreateData] = useState({ duration: "", notes: "" });

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

      if (!routineData || routineData.length === 0) {
        const defaultRoutines = WATCH_DOMAINS.map((d, i) => ({
          user_id: profileData.id,
          domain: d.key,
          title: `${d.label} 루틴`,
          sort_order: i,
          is_active: true,
        }));
        const { data: inserted } = await supabase
          .from("watch_routines")
          .insert(defaultRoutines)
          .select();
        routineData = inserted || [];
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
  const handleCardClick = (domainKey) => {
    if (domainKey === "wonder") {
      router.push("/wonder");
      return;
    }
    if (domainKey === "absorb") {
      router.push("/absorb");
      return;
    }
    // heal, think, create는 모달 열기
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
  };

  // 수면 저장
  const saveSleep = async () => {
    setModalSaving(true);
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
    await markDomainComplete("heal", `${sleepData.wake_time || ""}~${sleepData.sleep_time || ""}`);
    setModalSaving(false);
    setActiveModal(null);
  };

  // 학습 저장
  const saveThink = async () => {
    setModalSaving(true);
    const notes = `${thinkData.duration}|${thinkData.notes}`;
    await markDomainComplete("think", notes);
    setModalSaving(false);
    setActiveModal(null);
  };

  // 놀이 저장
  const saveCreate = async () => {
    setModalSaving(true);
    const notes = `${createData.duration}|${createData.notes}`;
    await markDomainComplete("create", notes);
    setModalSaving(false);
    setActiveModal(null);
  };

  // 영역 완료 처리
  const markDomainComplete = async (domainKey, notes) => {
    const supabase = createClient();
    const routine = routines.find((r) => r.domain === domainKey);
    if (!routine) return;

    // 기존 기록이 있으면 업데이트, 없으면 생성
    if (completedDomains[domainKey]) {
      await supabase
        .from("watch_daily_logs")
        .update({ notes, completed: true, completed_at: new Date().toISOString() })
        .eq("id", completedDomains[domainKey].logId);

      setCompletedDomains((prev) => ({
        ...prev,
        [domainKey]: { ...prev[domainKey], notes },
      }));
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
          notes,
        })
        .select()
        .single();

      if (data) {
        setCompletedDomains((prev) => ({
          ...prev,
          [domainKey]: { logId: data.id, notes },
        }));
      }
      setTimeout(() => setAnimating(null), 600);
    }
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
          <button onClick={handleLogout} className="text-sm text-teal-200 hover:text-white">로그아웃</button>
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
        <Modal title="수면 기록" color="#059669" onClose={() => setActiveModal(null)}>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">수면 질 평가</label>
              <div className="flex gap-2 justify-between">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    onClick={() => setSleepData({ ...sleepData, sleep_quality: q })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      sleepData.sleep_quality === q
                        ? "bg-[#059669] text-white border-[#059669]"
                        : "border-gray-300 text-gray-500"
                    }`}
                  >
                    {q === 1 ? "😫" : q === 2 ? "😕" : q === 3 ? "😐" : q === 4 ? "😊" : "😴"}
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
        <Modal title="학습 기록" color="#7C3AED" onClose={() => setActiveModal(null)}>
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
        <Modal title="놀이 기록" color="#EA580C" onClose={() => setActiveModal(null)}>
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

      <BottomNav current="home" />
    </div>
  );
}

// 모달 컴포넌트
function Modal({ title, color, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-5 pt-6 pb-8 animate-slide-up">
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
        {children}
      </div>
    </div>
  );
}
