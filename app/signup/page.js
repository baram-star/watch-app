"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase";

const ROLES = [
  {
    key: "student",
    letter: "S",
    label: "학생 모드",
    desc: "스스로 루틴을 설정하고 기록해요",
    color: "#0D9488",
  },
  {
    key: "parent",
    letter: "P",
    label: "학부모 모드",
    desc: "자녀의 루틴을 함께 관리해요",
    color: "#059669",
  },
  {
    key: "teacher",
    letter: "T",
    label: "교사 모드",
    desc: "학생의 루틴을 함께 관리해요",
    color: "#7C3AED",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const studentGrades = ["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3"];
  const parentGrades  = ["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3"];
  const grades = role === "student" ? studentGrades : role === "parent" ? parentGrades : [];

  const roleInfo = ROLES.find(r => r.key === role);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    const { error: profileError } = await supabase
      .from("watch_profiles")
      .insert({ user_id: authData.user.id, role, display_name: displayName, grade: grade || null });

    if (profileError) { setError("프로필 생성에 실패했습니다. 다시 시도해주세요."); setLoading(false); return; }

    router.push("/dashboard");
  };

  // Step 1: 역할 선택
  if (step === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
        <div className="flex flex-col items-center gap-2 mb-10">
          <Image src="/logo.png" alt="WATCH 로고" width={160} height={80} className="object-contain" priority />
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="text-sm text-gray-500">사용 모드를 선택해주세요</p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-4">
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => { setRole(r.key); setStep(2); }}
              className="w-full p-5 rounded-2xl border-2 border-gray-200 hover:border-[#0D9488] hover:bg-teal-50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: r.color }}>
                  <span className="text-white text-xl font-bold">{r.letter}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{r.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Link href="/" className="mt-8 text-sm text-gray-400 hover:text-gray-600">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  // Step 2: 정보 입력
  const nameLabel = role === "student" ? "이름 (별명)" : role === "parent" ? "부모님 이름" : "선생님 이름";
  const namePlaceholder = role === "student" ? "이름 또는 별명" : role === "parent" ? "부모님 이름" : "선생님 이름";
  const gradeLabel = role === "student" ? "학년" : role === "parent" ? "자녀 학년" : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: roleInfo?.color }}>
          <span className="text-white text-2xl font-bold">{roleInfo?.letter}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{roleInfo?.label} 회원가입</h1>
      </div>

      <form onSubmit={handleSignup} className="w-full max-w-xs flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com" required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상 입력" required minLength={6}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{nameLabel}</label>
          <input
            type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder={namePlaceholder} required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
          />
        </div>

        {gradeLabel && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{gradeLabel}</label>
            <div className="grid grid-cols-3 gap-2">
              {grades.map((g) => (
                <button
                  key={g} type="button" onClick={() => setGrade(g)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    grade === g ? "bg-[#0D9488] text-white border-[#0D9488]" : "border-gray-300 text-gray-600 hover:border-[#0D9488]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || (!grade && role !== "teacher")}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-base shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          style={{ backgroundColor: roleInfo?.color }}
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>
      </form>

      <button
        onClick={() => { setStep(1); setRole(""); setGrade(""); setError(""); }}
        className="mt-6 text-sm text-gray-500 hover:text-gray-700"
      >
        이전 단계로
      </button>

      <p className="mt-3 text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-[#0D9488] font-medium hover:underline">로그인</Link>
      </p>
    </div>
  );
}
