import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-gradient-to-b from-teal-50 to-white">
      {/* 로고 영역 */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <Image
          src="/logo.png"
          alt="WATCH 로고"
          width={200}
          height={100}
          className="object-contain"
          priority
        />
        <p className="text-center text-gray-500 text-sm leading-relaxed">
          매일의 생활습관을 루틴으로 만들어요
        </p>
      </div>

      {/* 5영역 아이콘 */}
      <div className="flex gap-3 mb-12">
        {[
          { letter: "W", color: "bg-[#0D9488]", label: "성찰" },
          { letter: "A", color: "bg-[#0891B2]", label: "독서" },
          { letter: "T", color: "bg-[#7C3AED]", label: "학습" },
          { letter: "C", color: "bg-[#EA580C]", label: "놀이" },
          { letter: "H", color: "bg-[#059669]", label: "수면" },
        ].map((item) => (
          <div key={item.letter} className="flex flex-col items-center gap-1">
            <div
              className={`w-11 h-11 rounded-full ${item.color} flex items-center justify-center`}
            >
              <span className="text-white font-bold text-sm">{item.letter}</span>
            </div>
            <span className="text-xs text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* 버튼 */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <Link
          href="/login"
          className="w-full py-3.5 rounded-xl bg-[#0D9488] text-white text-center font-semibold text-base shadow-md hover:bg-teal-700 transition-colors"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="w-full py-3.5 rounded-xl border-2 border-[#0D9488] text-[#0D9488] text-center font-semibold text-base hover:bg-teal-50 transition-colors"
        >
          회원가입
        </Link>
      </div>

      <div className="mt-8 flex flex-col items-center gap-0.5">
        <p className="text-xs text-gray-400">바람나무숲 교육연구소</p>
        <p className="text-xs text-gray-300">Wind and Tree, Creative Hub</p>
      </div>
    </div>
  );
}
