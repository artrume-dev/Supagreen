import { useState } from "react";

const weekData = [
  { day: "Mon", calories: 1820, protein: 95 },
  { day: "Tue", calories: 2050, protein: 112 },
  { day: "Wed", calories: 1950, protein: 105 },
  { day: "Thu", calories: 2100, protein: 120 },
  { day: "Fri", calories: 1780, protein: 88 },
  { day: "Sat", calories: 2200, protein: 130 },
  { day: "Sun", calories: 1900, protein: 98 },
];
const maxCal = Math.max(...weekData.map((d) => d.calories));

const milestones = [
  { days: 3, emoji: "🌱", label: "Sprout", achieved: true },
  { days: 7, emoji: "🔥", label: "On Fire", achieved: true },
  { days: 14, emoji: "⚡", label: "Charged", achieved: true },
  { days: 30, emoji: "🏆", label: "Champion", achieved: false },
];

const savedRecipes = [
  { title: "Açaí Power Bowl", emoji: "🫐", img: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=200&q=80", kcal: 380 },
  { title: "Turmeric Lentil Soup", emoji: "🍜", img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=200&q=80", kcal: 320 },
  { title: "Walnut & Oat Granola", emoji: "🌰", img: "https://images.unsplash.com/photo-1517093728677-a9e7e1b25b7c?w=200&q=80", kcal: 290 },
];

const profileInfo = {
  dietType: "Mediterranean",
  allergies: "None",
  healthGoal: "Build Muscle",
  skillLevel: "Intermediate",
  calorieTarget: "2,000 kcal",
};

export function Profile() {
  const [activeTab, setActiveTab] = useState<"week" | "saved">("week");

  return (
    <div className="min-h-screen bg-[#0F1710] font-sans max-w-[390px] mx-auto flex flex-col pb-24">
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-white font-bold text-2xl">Alex Rivera</h1>
            <p className="text-white/40 text-sm mt-0.5">Building muscle · Mediterranean</p>
          </div>
          <button className="w-10 h-10 bg-[#1C2B1E] rounded-xl flex items-center justify-center text-white/60">
            ⚙
          </button>
        </div>

        <div className="bg-gradient-to-br from-[#1C2B1E] to-[#0F1710] border border-white/10 rounded-3xl p-5 flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#22C55E] to-emerald-700 flex items-center justify-center text-4xl">
              👤
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#F97316] text-white text-xs font-bold px-2 py-1 rounded-lg">
              Pro
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-4xl">🔥</span>
              <div>
                <span className="text-white font-black text-3xl">14</span>
                <span className="text-white/40 text-sm ml-1">day streak</span>
              </div>
            </div>
            <p className="text-white/50 text-xs mb-2">Longest: 21 days · Keep it up!</p>
            <div className="flex gap-1">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i < 14 ? "bg-[#22C55E]" : "bg-white/10"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mb-5">
        <h2 className="text-white font-bold text-base mb-3">Milestones</h2>
        <div className="flex gap-3">
          {milestones.map((m) => (
            <div
              key={m.days}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border ${m.achieved ? "bg-[#22C55E]/10 border-[#22C55E]/30" : "bg-[#1C2B1E] border-white/5 opacity-40"}`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-white font-bold text-xs">{m.days}d</span>
              <span className="text-white/40 text-[10px]">{m.label}</span>
              {m.achieved && <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 px-5 mb-5">
        {[
          { label: "Meals cooked", value: "42", icon: "🍳" },
          { label: "Recipes saved", value: "18", icon: "❤" },
          { label: "Avg. protein", value: "107g", icon: "💪" },
        ].map((stat) => (
          <div key={stat.label} className="flex-1 bg-[#1C2B1E] rounded-2xl p-3 text-center">
            <span className="text-xl">{stat.icon}</span>
            <p className="text-white font-bold text-lg mt-1">{stat.value}</p>
            <p className="text-white/40 text-[10px]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 px-5 mb-4">
        <button
          onClick={() => setActiveTab("week")}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "week" ? "bg-[#22C55E] text-white" : "bg-[#1C2B1E] text-white/50"}`}
        >
          Weekly Macros
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "saved" ? "bg-[#22C55E] text-white" : "bg-[#1C2B1E] text-white/50"}`}
        >
          Saved Recipes
        </button>
      </div>

      {activeTab === "week" ? (
        <div className="px-5">
          <div className="bg-[#1C2B1E] rounded-2xl p-4">
            <div className="flex items-end gap-2 h-28">
              {weekData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg overflow-hidden" style={{ height: `${(d.calories / maxCal) * 96}px` }}>
                    <div
                      className="w-full h-full rounded-t-lg"
                      style={{
                        background: i === 6
                          ? "linear-gradient(to top, #22C55E, #4ade80)"
                          : "rgba(255,255,255,0.1)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              {weekData.map((d, i) => (
                <div key={i} className="flex-1 text-center">
                  <p className="text-white/40 text-[10px]">{d.day}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
              <div className="text-center">
                <p className="text-white font-bold">1,971</p>
                <p className="text-white/40 text-xs">avg kcal</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">107g</p>
                <p className="text-white/40 text-xs">avg protein</p>
              </div>
              <div className="text-center">
                <p className="text-[#22C55E] font-bold">↑ 12%</p>
                <p className="text-white/40 text-xs">vs last week</p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-[#1C2B1E] rounded-2xl p-4">
            <h3 className="text-white font-bold text-sm mb-3">My Profile</h3>
            <div className="space-y-3">
              {[
                { label: "Diet Type", value: profileInfo.dietType, icon: "🥗" },
                { label: "Allergies", value: profileInfo.allergies, icon: "⚠" },
                { label: "Health Goal", value: profileInfo.healthGoal, icon: "🎯" },
                { label: "Skill Level", value: profileInfo.skillLevel, icon: "👨‍🍳" },
                { label: "Calorie Target", value: profileInfo.calorieTarget, icon: "🔥" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-base">{row.icon}</span>
                  <span className="text-white/50 text-xs flex-1">{row.label}</span>
                  <span className="text-white text-xs font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full bg-[#22C55E]/15 text-[#22C55E] font-semibold text-sm py-2.5 rounded-xl">
              ✏ Edit Profile
            </button>
          </div>

          <button className="mt-3 w-full bg-gradient-to-r from-[#F97316]/20 to-transparent border border-[#F97316]/30 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Share my week</p>
              <p className="text-white/40 text-xs">Create a TikTok-ready summary card</p>
            </div>
            <span className="ml-auto text-[#F97316]">→</span>
          </button>
        </div>
      ) : (
        <div className="px-5 space-y-3">
          {savedRecipes.map((recipe, i) => (
            <div key={i} className="flex items-center gap-4 bg-[#1C2B1E] rounded-2xl p-3">
              <img src={recipe.img} alt={recipe.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{recipe.emoji} {recipe.title}</p>
                <p className="text-white/40 text-xs mt-0.5">{recipe.kcal} kcal per serving</p>
              </div>
              <button className="w-8 h-8 bg-[#22C55E]/20 rounded-xl flex items-center justify-center text-[#22C55E]">
                ❤
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 mt-6">
        <button className="w-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm py-3.5 rounded-2xl">
          Sign Out
        </button>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#1C2B1E]/90 backdrop-blur-xl border-t border-white/5 px-4 py-3 pb-6 flex justify-around">
        {[
          { id: "home", icon: "🏠", label: "Home" },
          { id: "shopping", icon: "🛒", label: "Shop" },
          { id: "profile", icon: "👤", label: "Profile" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`flex flex-col items-center gap-1 transition-all ${tab.id === "profile" ? "opacity-100" : "opacity-40"}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className={`text-[10px] font-semibold ${tab.id === "profile" ? "text-[#22C55E]" : "text-white"}`}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
