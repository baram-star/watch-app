"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      {/* 헤더 */}
      <div className="flex flex-col items-center gap-2 mb-10">
        <div className="w-14 h-14 rounded-xl bg-[#0D9488] flex items-center justify-center">
          <span className="text-white text-2xl font-bold">W</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
      </div>

      {/* 폼 */}
      <form onSubmit={handleLogin} className="w-full max-w-xs flex flex-col gap-4">
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
            placeholder="비밀번호 입력"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#0D9488] text-white font-semibold text-base shadow-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-[#0D9488] font-medium hover:underline">
          회원가입
        </Link>
      </p>

      <Link
        href="/"
        className="mt-4 text-sm text-gray-400 hover:text-gray-600"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
