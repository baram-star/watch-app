"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: 역할 선택, 2: 정보 입력
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const grades =
    role === "student"
      ? ["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3"]
      : ["초1", "초2", "초3", "초4"]; // 학부모: 자녀 학년 선택

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    // 1. Auth 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. 프로필 생성
    const { error: profileError } = await supabase
      .from("watch_profiles")
      .insert({
        user_id: authData.user.id,
        role,
        display_name: displayName,
        grade,
      });

    if (profileError) {
      setError("프로필 생성에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  // Step 1: 역할 선택
  if (step === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
        <div className="flex flex-col items-center gap-2 mb-10">
          <div className="w-14 h-14 rounded-xl bg-[#0D9488] flex items-center justify-center">
            <span className="text-white text-2xl font-bold">W</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="text-sm text-gray-500">사용 모드를 선택해주세요</p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-4">
          {/* 학생 모드 */}
          <button
            onClick={() => {
              setRole("student");
              setStep(2);
            }}
            className="w-full p-5 rounded-2xl border-2 border-gray-200 hover:border-[#0D9488] hover:bg-teal-50 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">T</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">학생 모드</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  초등 5학년 ~ 중등 학생
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  스스로 루틴을 설정하고 기록해요
                </p>
              </div>
            </div>
          </button>

          {/* 학부모 모드 */}
          <button
            onClick={() => {
              setRole("parent");
              setStep(2);
            }}
            className="w-full p-5 rounded-2xl border-2 border-gray-200 hover:border-[#0D9488] hover:bg-teal-50 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#059669] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">H</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">학부모 모드</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  초등 1~4학년 자녀의 부모님
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  자녀의 루틴을 함께 관리해요
                </p>
              </div>
            </div>
          </button>
        </div>

        <Link
          href="/"
          className="mt-8 text-sm text-gray-400 hover:text-gray-600"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  // Step 2: 정보 입력
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-14 h-14 rounded-xl bg-[#0D9488] flex items-center justify-center">
          <span className="text-white text-2xl font-bold">W</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {role === "student" ? "학생" : "학부모"} 회원가입
        </h1>
      </div>

      <form onSubmit={handleSignup} className="w-full max-w-xs flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상 입력"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {role === "student" ? "이름 (별명)" : "부모님 이름"}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={role === "student" ? "이름 또는 별명" : "부모님 이름"}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {role === "student" ? "학년" : "자녀 학년"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {grades.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  grade === g
                    ? "bg-[#0D9488] text-white border-[#0D9488]"
                    : "border-gray-300 text-gray-600 hover:border-[#0D9488]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !grade}
          className="w-full py-3.5 rounded-xl bg-[#0D9488] text-white font-semibold text-base shadow-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>
      </form>

      <button
        onClick={() => {
          setStep(1);
          setRole("");
          setGrade("");
          setError("");
        }}
        className="mt-6 text-sm text-gray-500 hover:text-gray-700"
      >
        이전 단계로
      </button>

      <p className="mt-3 text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-[#0D9488] font-medium hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
