"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const DOMAIN_LABELS = { heal:"수면", think:"학습", absorb:"독서", create:"놀이", wonder:"성찰" };
const ROLE_LABELS = { student:"학생", parent:"학부모", admin:"관리자" };

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [sortBy, setSortBy] = useState("name"); // name | today | total

  useEffect(() => { checkAdminAndLoad(); }, []);

  async function checkAdminAndLoad() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("watch_profiles").select("is_admin").eq("user_id", user.id).single();

    if (!profile?.is_admin) { router.push("/dashboard"); return; }

    const res = await fetch("/api/admin/users");
    const json = await res.json();
    if (json.error) { alert(json.error); setLoading(false); return; }
    setUsers(json.users || []);
    setFiltered(json.users || []);
    setLoading(false);
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
      return (a.display_name || "").localeCompare(b.display_name || "", "ko");
    });
    setFiltered(result);
  }, [users, search, roleFilter, sortBy]);

  async function resetPassword() {
    if (!newPassword || newPassword.length < 6) { setPwMsg("6자 이상 입력하세요"); return; }
    setPwSaving(true); setPwMsg("");
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser.user_id, newPassword }),
    });
    const json = await res.json();
    setPwSaving(false);
    if (json.error) { setPwMsg("❌ " + json.error); return; }
    setPwMsg("✅ 비밀번호가 변경되었습니다");
    setNewPassword("");
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

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "전체 사용자", value: users.length },
            { label: "학생 수", value: students },
            { label: "오늘 활동", value: `${activeToday}명` },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 flex flex-col gap-3">
        {/* 검색 + 필터 */}
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 이메일, 학년 검색"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
        <div className="flex gap-2">
          {["all","student","parent"].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}>
              {r === "all" ? "전체" : ROLE_LABELS[r]}
            </button>
          ))}
          <div className="flex-1" />
          {[["name","이름순"],["today","오늘순"],["total","누적순"]].map(([v,l]) => (
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
            <button key={u.id} onClick={() => { setSelectedUser(u); setNewPassword(""); setPwMsg(""); }}
              className="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 text-left shadow-sm hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                  u.role === "parent" ? "bg-blue-500" : u.role === "admin" ? "bg-red-500" : "bg-[#0D9488]"
                }`}>
                  {u.display_name?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{u.display_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      u.role === "parent" ? "bg-blue-50 text-blue-600" :
                      u.role === "admin"  ? "bg-red-50 text-red-600" :
                      "bg-teal-50 text-teal-600"
                    }`}>{ROLE_LABELS[u.role] || u.role}</span>
                    {u.grade && <span className="text-xs text-gray-400">{u.grade}</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i < u.todayCount ? "bg-[#0D9488]" : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">누적 {u.totalCount}</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">검색 결과가 없습니다</div>
          )}
        </div>
      </div>

      {/* 사용자 상세 / 비밀번호 초기화 모달 */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelectedUser(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl px-5 pt-6 pb-10"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  selectedUser.role === "parent" ? "bg-blue-500" : "bg-[#0D9488]"
                }`}>
                  {selectedUser.display_name?.[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedUser.display_name}</p>
                  <p className="text-xs text-gray-400">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 오늘 실천 현황 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">오늘 실천 현황</p>
              <div className="flex gap-3 justify-center">
                {Object.entries(DOMAIN_LABELS).map(([key, label]) => {
                  const done = (selectedUser.todayCount || 0) > Object.keys(DOMAIN_LABELS).indexOf(key);
                  return (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${done ? "bg-[#0D9488] text-white" : "bg-gray-200 text-gray-400"}`}>
                        {key[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-400">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 justify-center mt-3 text-center">
                <div><p className="text-lg font-bold text-[#0D9488]">{selectedUser.todayCount}/5</p><p className="text-xs text-gray-400">오늘</p></div>
                <div><p className="text-lg font-bold text-gray-700">{selectedUser.totalCount}</p><p className="text-xs text-gray-400">누적</p></div>
              </div>
            </div>

            {/* 비밀번호 초기화 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">비밀번호 초기화</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
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
          </div>
        </div>
      )}
    </div>
  );
}
