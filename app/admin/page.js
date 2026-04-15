"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const DOMAINS = [
  { key: "heal",   letter: "H", label: "수면",  color: "#059669" },
  { key: "think",  letter: "T", label: "학습",  color: "#7C3AED" },
  { key: "absorb", letter: "A", label: "독서",  color: "#0891B2" },
  { key: "create", letter: "C", label: "놀이",  color: "#EA580C" },
  { key: "wonder", letter: "W", label: "성찰",  color: "#0D9488" },
];

const ROLE_LABELS = { student: "학생", parent: "학부모", teacher: "교사", admin: "관리자" };
const ROLE_COLORS = { student: "bg-teal-50 text-teal-600", parent: "bg-blue-50 text-blue-600", teacher: "bg-purple-50 text-purple-600", admin: "bg-red-50 text-red-600" };
const AVATAR_COLORS = { student: "bg-[#0D9488]", parent: "bg-blue-500", teacher: "bg-purple-500", admin: "bg-red-500" };

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [selectedUser, setSelectedUser] = useState(null);

  // 비밀번호 초기화
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // 회원 삭제
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { checkAdminAndLoad(); }, []);

  async function checkAdminAndLoad() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("watch_profiles").select("is_admin").eq("user_id", user.id).single();
    if (!profile?.is_admin) { router.push("/dashboard"); return; }

    await loadUsers();
    setLoading(false);
  }

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    if (json.error) { console.error(json.error); return; }
    setUsers(json.users || []);
  }

  useEffect(() => {
    let result = [...users];
    if (roleFilter !== "all") result = result.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.grade?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === "today") return b.todayCount - a.todayCount;
      if (sortBy === "total") return b.totalCount - a.totalCount;
      if (sortBy === "streak") return b.streak - a.streak;
      return (a.display_name || "").localeCompare(b.display_name || "", "ko");
    });
    setFiltered(result);
  }, [users, search, roleFilter, sortBy]);

  const [savedScroll, setSavedScroll] = useState(0);

  function openUser(u) {
    setSavedScroll(window.scrollY);
    setSelectedUser(u);
    setNewPassword(""); setPwMsg("");
    setDeleteConfirm(false); setDeleteMsg("");
  }

  function closeModal() {
    setSelectedUser(null);
    setTimeout(() => window.scrollTo({ top: savedScroll }), 0);
  }

  async function resetPassword() {
    if (!newPassword || newPassword.length < 6) { setPwMsg("6자 이상 입력하세요"); return; }
    setPwSaving(true); setPwMsg("");
    const res = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser.user_id, newPassword }),
    });
    const json = await res.json();
    setPwSaving(false);
    setPwMsg(json.error ? "❌ " + json.error : "✅ 비밀번호가 변경되었습니다");
    if (!json.error) setNewPassword("");
  }

  async function deleteUser() {
    setDeleting(true); setDeleteMsg("");
    const res = await fetch("/api/admin/delete-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser.user_id }),
    });
    const json = await res.json();
    setDeleting(false);
    if (json.error) { setDeleteMsg("❌ " + json.error); return; }
    // 로컬 상태에서 즉시 제거 (API 재호출 없음)
    const deletedId = selectedUser.id;
    setUsers(prev => prev.filter(u => u.id !== deletedId));
    setSelectedUser(null);
    setTimeout(() => window.scrollTo({ top: savedScroll }), 0);
  }

  const todayStr = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  const activeToday = users.filter(u => u.todayCount > 0).length;
  const students = users.filter(u => u.role === "student").length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-gray-900 text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-gray-400 text-xs">{todayStr}</p>
            <h1 className="text-xl font-bold mt-1">WATCH 관리자</h1>
          </div>
          <button onClick={() => router.push("/dashboard")}
            className="text-xs text-gray-400 hover:text-white px-3 py-1.5 border border-gray-700 rounded-lg">
            대시보드로
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "전체 사용자", value: users.length },
            { label: "학생 수", value: students },
            { label: "오늘 활동", value: `${activeToday}명` },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 flex flex-col gap-3">
        {/* 검색 */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이름, 이메일, 학년 검색"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />

        {/* 역할 필터 + 정렬 */}
        <div className="flex gap-2 flex-wrap">
          {["all","student","parent","teacher"].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}>
              {r === "all" ? "전체" : ROLE_LABELS[r]}
            </button>
          ))}
          <div className="flex-1" />
          {[["name","이름"],["today","오늘"],["streak","스트릭"],["total","누적"]].map(([v,l]) => (
            <button key={v} onClick={() => setSortBy(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === v ? "bg-[#0D9488] text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}>
              {l}
            </button>
          ))}
        </div>

        {/* 사용자 목록 */}
        <p className="text-xs text-gray-400">{filtered.length}명</p>
        <div className="flex flex-col gap-2">
          {filtered.map(u => (
            <button key={u.id} onClick={() => openUser(u)}
              className="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 text-left shadow-sm hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${AVATAR_COLORS[u.role] || "bg-gray-400"}`}>
                  {u.display_name?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{u.display_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-500"}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                    {u.grade && <span className="text-xs text-gray-400">{u.grade}</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                  {/* 오늘 WATCH 도메인 현황 */}
                  <div className="flex items-center gap-1 mt-2">
                    {DOMAINS.map(d => {
                      const done = u.todayDomains?.includes(d.key);
                      return (
                        <div key={d.key}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: done ? d.color : "#F3F4F6", color: done ? "#fff" : "#9CA3AF" }}>
                          {d.letter}
                        </div>
                      );
                    })}
                    {u.streak > 0 && (
                      <span className="ml-1 text-xs text-orange-400 font-medium">🔥{u.streak}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-700">{u.todayCount}/5</p>
                  <p className="text-xs text-gray-400">누적 {u.totalCount}</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">검색 결과가 없습니다</div>
          )}
        </div>
      </div>

      {/* 사용자 상세 모달 */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl px-5 pt-6 pb-10 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* 유저 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${AVATAR_COLORS[selectedUser.role] || "bg-gray-400"}`}>
                  {selectedUser.display_name?.[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{selectedUser.display_name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[selectedUser.role]}`}>
                      {ROLE_LABELS[selectedUser.role]}
                    </span>
                    {selectedUser.grade && <span className="text-xs text-gray-400">{selectedUser.grade}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 통계 요약 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-orange-500">🔥{selectedUser.streak}</p>
                <p className="text-xs text-gray-500 mt-0.5">연속</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-[#0D9488]">{selectedUser.todayCount}/5</p>
                <p className="text-xs text-gray-500 mt-0.5">오늘</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-700">{selectedUser.totalCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">누적</p>
              </div>
            </div>

            {/* 오늘 WATCH 현황 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">오늘 WATCH 현황</p>
              <div className="flex gap-2 justify-around">
                {DOMAINS.map(d => {
                  const done = selectedUser.todayDomains?.includes(d.key);
                  return (
                    <div key={d.key} className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: done ? d.color : "#E5E7EB", color: done ? "#fff" : "#9CA3AF" }}>
                        {d.letter}
                      </div>
                      <span className="text-xs text-gray-400">{d.label}</span>
                      <span className={`text-xs font-medium ${done ? "text-green-500" : "text-gray-300"}`}>
                        {done ? "✓" : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 비밀번호 초기화 */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-2">비밀번호 초기화</p>
              <div className="flex gap-2">
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (6자 이상)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <button onClick={resetPassword} disabled={pwSaving}
                  className="px-4 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-semibold disabled:opacity-50">
                  {pwSaving ? "처리중" : "변경"}
                </button>
              </div>
              {pwMsg && <p className="text-xs mt-2 text-gray-600">{pwMsg}</p>}
            </div>

            {/* 회원 삭제 */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">회원 삭제</p>
              {!deleteConfirm ? (
                <button onClick={() => setDeleteConfirm(true)}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                  이 회원 삭제
                </button>
              ) : (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-700 font-semibold mb-1">정말 삭제하시겠습니까?</p>
                  <p className="text-xs text-red-500 mb-3">
                    <strong>{selectedUser.display_name}</strong>의 모든 데이터(루틴, 기록 등)가 영구 삭제됩니다.
                  </p>
                  {deleteMsg && <p className="text-xs mb-2 text-red-600">{deleteMsg}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm">
                      취소
                    </button>
                    <button onClick={deleteUser} disabled={deleting}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
                      {deleting ? "삭제 중..." : "삭제 확인"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
