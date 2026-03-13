import { useState } from "react";

const steps = [
  {
    id: 1,
    title: "What's your diet?",
    subtitle: "We'll personalise your recipes around your lifestyle",
    type: "single",
    options: [
      { value: "vegan", label: "Vegan", emoji: "🌱" },
      { value: "vegetarian", label: "Vegetarian", emoji: "🥦" },
      { value: "pescatarian", label: "Pescatarian", emoji: "🐟" },
      { value: "flexitarian", label: "Flexitarian", emoji: "🍽" },
      { value: "omnivore", label: "Omnivore", emoji: "🥩" },
      { value: "keto", label: "Keto / Low-carb", emoji: "🥑" },
      { value: "paleo", label: "Paleo", emoji: "🍖" },
      { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
    ],
  },
  {
    id: 2,
    title: "Any allergies?",
    subtitle: "Select all that apply — we'll always keep you safe",
    type: "multi",
    options: [
      { value: "gluten", label: "Gluten", emoji: "🌾" },
      { value: "dairy", label: "Dairy", emoji: "🥛" },
      { value: "nuts", label: "Nuts", emoji: "🥜" },
      { value: "soy", label: "Soy", emoji: "🫘" },
      { value: "eggs", label: "Eggs", emoji: "🥚" },
      { value: "shellfish", label: "Shellfish", emoji: "🦐" },
      { value: "nightshades", label: "Nightshades", emoji: "🍅" },
      { value: "none", label: "None", emoji: "✅" },
    ],
  },
  {
    id: 3,
    title: "What's your goal?",
    subtitle: "Your AI chef will prioritise foods that support this",
    type: "single",
    options: [
      { value: "fat-loss", label: "Lose body fat", emoji: "🔥" },
      { value: "muscle", label: "Build muscle", emoji: "💪" },
      { value: "gut", label: "Improve gut health", emoji: "🌿" },
      { value: "energy", label: "Boost energy", emoji: "⚡" },
      { value: "inflammation", label: "Reduce inflammation", emoji: "🧊" },
      { value: "wellness", label: "General wellness", emoji: "✨" },
    ],
  },
  {
    id: 4,
    title: "Cooking skill?",
    subtitle: "Recipes will be tailored to fit your available time",
    type: "single",
    options: [
      { value: "beginner", label: "Beginner", emoji: "🟢", sub: "Under 20 min" },
      { value: "intermediate", label: "Intermediate", emoji: "🟡", sub: "20–40 min" },
      { value: "advanced", label: "Advanced", emoji: "🔴", sub: "40+ min" },
    ],
  },
  {
    id: 5,
    title: "Almost done!",
    subtitle: "Allow location to find seasonal ingredients & nearby stores",
    type: "location",
  },
];

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<number, string | string[]>>({});

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const isSelected = (value: string) => {
    const sel = selections[step.id];
    if (Array.isArray(sel)) return sel.includes(value);
    return sel === value;
  };

  const toggle = (value: string) => {
    if (step.type === "multi") {
      const prev = (selections[step.id] as string[]) || [];
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      setSelections({ ...selections, [step.id]: next });
    } else {
      setSelections({ ...selections, [step.id]: value });
    }
  };

  const canNext = step.type === "location" || !!selections[step.id];

  return (
    <div className="min-h-screen bg-[#0F1710] font-sans max-w-[390px] mx-auto flex flex-col px-6 py-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#22C55E] rounded-xl flex items-center justify-center text-white font-black text-sm">N</div>
        <span className="text-white font-bold text-lg">NutriSnap</span>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-white/40 mb-2">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#22C55E] to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i <= currentStep ? "bg-[#22C55E]" : "bg-white/20"}`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <h2 className="text-white font-bold text-2xl mb-2">{step.title}</h2>
      <p className="text-white/50 text-sm mb-6 leading-relaxed">{step.subtitle}</p>

      {/* Options */}
      {step.type === "location" ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-[#1C2B1E] rounded-3xl p-6 text-center mb-4">
            <div className="text-6xl mb-4">📍</div>
            <h3 className="text-white font-bold text-lg mb-2">Enable Location</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              We use your location to find seasonal ingredients and nearby stores. Your data is never shared with third parties.
            </p>
          </div>
          <div className="bg-[#1C2B1E] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#22C55E]/20 rounded-xl flex items-center justify-center">🔒</div>
            <div>
              <p className="text-white text-sm font-semibold">Privacy first</p>
              <p className="text-white/50 text-xs">Location is used locally only</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="space-y-3">
            <button
              className="w-full bg-[#22C55E] text-white font-bold py-4 rounded-2xl text-base"
              onClick={() => setCurrentStep(Math.min(currentStep + 1, steps.length - 1))}
            >
              📍 Allow Location
            </button>
            <button className="w-full text-white/40 text-sm py-2">Skip for now</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`grid gap-3 ${step.options && step.options.length <= 3 ? "grid-cols-1" : "grid-cols-2"}`}>
            {step.options?.map((opt) => {
              const selected = isSelected(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${
                    selected
                      ? "bg-[#22C55E]/15 border-[#22C55E] text-white"
                      : "bg-[#1C2B1E] border-white/10 text-white/70"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div>
                    <p className={`font-semibold text-sm ${selected ? "text-white" : "text-white/80"}`}>{opt.label}</p>
                    {"sub" in opt && opt.sub && <p className="text-xs text-white/40">{opt.sub as string}</p>}
                  </div>
                  {selected && <div className="ml-auto w-5 h-5 bg-[#22C55E] rounded-full flex items-center justify-center"><span className="text-white text-xs">✓</span></div>}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="flex gap-3 mt-8">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="w-12 h-14 bg-[#1C2B1E] rounded-2xl flex items-center justify-center text-white/60 text-lg"
              >
                ←
              </button>
            )}
            <button
              onClick={() => {
                if (currentStep < steps.length - 1) {
                  setCurrentStep(currentStep + 1);
                }
              }}
              disabled={!canNext}
              className={`flex-1 py-4 rounded-2xl font-bold text-base transition-all ${
                canNext
                  ? "bg-[#22C55E] text-white shadow-lg shadow-green-900/40"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              {currentStep === steps.length - 2 ? "Almost there →" : "Continue →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
