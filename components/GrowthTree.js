"use client";

const STAGES = [
  { max: 0, name: "씨앗", message: "첫 루틴을 시작해보세요!", bg: "bg-amber-50", border: "border-amber-200" },
  { max: 3, name: "새싹", message: "잘하고 있어요! 계속해봐요 🌱", bg: "bg-green-50", border: "border-green-200" },
  { max: 7, name: "묘목", message: "루틴이 자라고 있어요! 🌿", bg: "bg-green-50", border: "border-green-300" },
  { max: 14, name: "나무", message: "꾸준함이 빛을 발하고 있어요 🌳", bg: "bg-emerald-50", border: "border-emerald-300" },
  { max: 21, name: "큰나무", message: "습관이 완전히 자리잡았어요! 🌲", bg: "bg-teal-50", border: "border-teal-300" },
  { max: Infinity, name: "거목", message: "당신은 진정한 WATCH 마스터! 🏆", bg: "bg-teal-50", border: "border-teal-400" },
];

// SVG Trees for each stage
const TreeSeed = () => (
  <svg viewBox="0 0 120 100" className="w-full h-full" fill="none">
    <line x1="20" y1="90" x2="100" y2="90" stroke="#A16207" strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="60" cy="87" rx="10" ry="6" fill="#A16207"/>
    <ellipse cx="60" cy="84" rx="7" ry="5" fill="#D97706"/>
  </svg>
);

const TreeSprout = () => (
  <svg viewBox="0 0 120 100" className="w-full h-full" fill="none">
    <line x1="20" y1="90" x2="100" y2="90" stroke="#15803D" strokeWidth="2" strokeLinecap="round"/>
    <line x1="60" y1="90" x2="60" y2="65" stroke="#15803D" strokeWidth="3" strokeLinecap="round"/>
    <ellipse cx="48" cy="72" rx="10" ry="7" fill="#22C55E" transform="rotate(-20 48 72)"/>
    <ellipse cx="72" cy="70" rx="10" ry="7" fill="#16A34A" transform="rotate(20 72 70)"/>
    <circle cx="60" cy="62" r="5" fill="#22C55E"/>
  </svg>
);

const TreeSapling = () => (
  <svg viewBox="0 0 120 110" className="w-full h-full" fill="none">
    <line x1="15" y1="98" x2="105" y2="98" stroke="#15803D" strokeWidth="2" strokeLinecap="round"/>
    <rect x="56" y="70" width="8" height="28" rx="3" fill="#92400E"/>
    <ellipse cx="45" cy="62" rx="14" ry="10" fill="#22C55E" transform="rotate(-15 45 62)"/>
    <ellipse cx="75" cy="58" rx="14" ry="10" fill="#16A34A" transform="rotate(15 75 58)"/>
    <ellipse cx="60" cy="52" rx="16" ry="14" fill="#15803D"/>
    <ellipse cx="60" cy="50" rx="14" ry="12" fill="#22C55E"/>
  </svg>
);

const TreeMedium = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
    <line x1="10" y1="108" x2="110" y2="108" stroke="#166534" strokeWidth="2" strokeLinecap="round"/>
    <rect x="53" y="72" width="14" height="36" rx="4" fill="#92400E"/>
    <ellipse cx="60" cy="40" rx="38" ry="40" fill="#16A34A"/>
    <ellipse cx="60" cy="36" rx="34" ry="36" fill="#22C55E"/>
    <ellipse cx="45" cy="60" rx="18" ry="14" fill="#15803D"/>
    <ellipse cx="75" cy="58" rx="18" ry="14" fill="#15803D"/>
    <ellipse cx="60" cy="28" rx="26" ry="24" fill="#22C55E"/>
    <ellipse cx="60" cy="26" rx="20" ry="18" fill="#4ADE80" opacity="0.6"/>
  </svg>
);

const TreeLarge = () => (
  <svg viewBox="0 0 140 130" className="w-full h-full" fill="none">
    <line x1="10" y1="118" x2="130" y2="118" stroke="#166534" strokeWidth="2" strokeLinecap="round"/>
    <rect x="62" y="78" width="16" height="40" rx="5" fill="#78350F"/>
    <ellipse cx="70" cy="42" rx="48" ry="48" fill="#15803D"/>
    <ellipse cx="40" cy="72" rx="22" ry="16" fill="#166534"/>
    <ellipse cx="100" cy="68" rx="22" ry="16" fill="#166534"/>
    <ellipse cx="70" cy="34" rx="40" ry="38" fill="#22C55E"/>
    <ellipse cx="55" cy="50" rx="24" ry="18" fill="#16A34A"/>
    <ellipse cx="85" cy="48" rx="24" ry="18" fill="#16A34A"/>
    <ellipse cx="70" cy="22" rx="28" ry="24" fill="#4ADE80"/>
    <ellipse cx="70" cy="20" rx="20" ry="16" fill="#86EFAC" opacity="0.7"/>
  </svg>
);

const TreeAncient = () => (
  <svg viewBox="0 0 160 140" className="w-full h-full" fill="none">
    <line x1="5" y1="128" x2="155" y2="128" stroke="#14532D" strokeWidth="2" strokeLinecap="round"/>
    <rect x="68" y="82" width="24" height="46" rx="6" fill="#78350F"/>
    <rect x="52" y="100" width="12" height="28" rx="4" fill="#92400E"/>
    <rect x="96" y="104" width="12" height="24" rx="4" fill="#92400E"/>
    <ellipse cx="80" cy="44" rx="58" ry="54" fill="#14532D"/>
    <ellipse cx="38" cy="80" rx="26" ry="18" fill="#166534"/>
    <ellipse cx="122" cy="76" rx="26" ry="18" fill="#166534"/>
    <ellipse cx="80" cy="34" rx="50" ry="46" fill="#15803D"/>
    <ellipse cx="55" cy="56" rx="28" ry="22" fill="#16A34A"/>
    <ellipse cx="105" cy="52" rx="28" ry="22" fill="#16A34A"/>
    <ellipse cx="80" cy="20" rx="34" ry="28" fill="#22C55E"/>
    <ellipse cx="62" cy="32" rx="20" ry="16" fill="#4ADE80" opacity="0.8"/>
    <ellipse cx="98" cy="28" rx="20" ry="16" fill="#4ADE80" opacity="0.8"/>
    <ellipse cx="80" cy="12" rx="22" ry="18" fill="#86EFAC"/>
  </svg>
);

const TREE_COMPONENTS = [TreeSeed, TreeSprout, TreeSapling, TreeMedium, TreeLarge, TreeAncient];

export default function GrowthTree({ streak }) {
  const stageIndex = STAGES.findIndex(s => streak <= s.max);
  const stage = STAGES[stageIndex];
  const TreeComponent = TREE_COMPONENTS[stageIndex];

  return (
    <div className={`rounded-2xl border ${stage.bg} ${stage.border} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">나의 성장 나무</h3>
        <span className="text-xs font-bold text-[#0D9488] bg-white rounded-full px-3 py-1 border border-[#0D9488]/20">
          {stage.name}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 flex-shrink-0">
          <TreeComponent />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-700 font-medium">{stage.message}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {stageIndex < STAGES.length - 1
                  ? `다음 단계까지 ${STAGES[stageIndex].max - streak + 1}일`
                  : "최고 단계 달성!"}
              </span>
              <span className="text-xs font-bold text-[#0D9488]">{streak}일 연속</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200">
              <div
                className="h-full bg-[#0D9488] rounded-full transition-all duration-700"
                style={{
                  width: stageIndex < STAGES.length - 1
                    ? `${((streak - (stageIndex > 0 ? STAGES[stageIndex - 1].max + 1 : 0)) / (STAGES[stageIndex].max - (stageIndex > 0 ? STAGES[stageIndex - 1].max : 0))) * 100}%`
                    : "100%"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
