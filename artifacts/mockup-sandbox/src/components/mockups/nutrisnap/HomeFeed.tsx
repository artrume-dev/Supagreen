import { useState } from "react";

const recipes = [
  {
    id: 1,
    meal: "breakfast",
    emoji: "🥑",
    title: "Avocado Berry Power Bowl",
    prepTime: 12,
    healthScore: 9.4,
    macros: { calories: 420, protein: 18, carbs: 48, fat: 22 },
    highlight: "18g protein",
    color: "from-green-400 to-emerald-600",
    img: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80",
    goalTag: "⚡ Energy boost",
  },
  {
    id: 2,
    meal: "lunch",
    emoji: "🥗",
    title: "Mediterranean Quinoa Salad",
    prepTime: 18,
    healthScore: 9.7,
    macros: { calories: 510, protein: 22, carbs: 58, fat: 18 },
    highlight: "22g protein",
    color: "from-orange-400 to-rose-500",
    img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",
    goalTag: "🔥 Fat loss",
  },
  {
    id: 3,
    meal: "dinner",
    emoji: "🐟",
    title: "Herb Baked Salmon & Greens",
    prepTime: 25,
    healthScore: 9.8,
    macros: { calories: 580, protein: 42, carbs: 28, fat: 32 },
    highlight: "42g protein",
    color: "from-blue-400 to-cyan-600",
    img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
    goalTag: "💪 Muscle build",
  },
  {
    id: 4,
    meal: "treat",
    emoji: "🧁",
    title: "Date & Cacao Energy Bites",
    prepTime: 10,
    healthScore: 8.5,
    macros: { calories: 180, protein: 5, carbs: 24, fat: 8 },
    highlight: "No refined sugar",
    color: "from-pink-400 to-purple-600",
    img: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80",
    goalTag: "🍫 Guilt-free treat",
  },
];

function MacroRing({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min(value / max, 1);
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
        <text x="22" y="26" textAnchor="middle" fontSize="9" fill="white" fontWeight="600">{value}g</text>
      </svg>
      <span className="text-[10px] text-white/60 font-medium">{label}</span>
    </div>
  );
}

function RecipeCard({ recipe, onClick }: { recipe: typeof recipes[0]; onClick: () => void }) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden cursor-pointer flex-shrink-0 w-72 shadow-xl active:scale-95 transition-transform"
      onClick={onClick}
    >
      <div className="relative h-44">
        <img src={recipe.img} alt={recipe.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">
            {recipe.meal}
          </span>
        </div>
        <div className="absolute top-3 right-3 bg-[#22C55E] text-white text-xs font-bold px-2 py-1 rounded-xl flex items-center gap-1">
          ★ {recipe.healthScore}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-bold text-lg leading-tight">{recipe.emoji} {recipe.title}</p>
          <div className="flex gap-3 mt-1.5">
            <span className="text-white/80 text-xs flex items-center gap-1">⏱ {recipe.prepTime} min</span>
            <span className="bg-[#F97316] text-white text-xs font-semibold px-2 py-0.5 rounded-full">{recipe.highlight}</span>
          </div>
        </div>
      </div>
      <div className="bg-[#0F1710] px-4 py-3 flex items-center justify-between">
        <div className="flex gap-3">
          <MacroRing value={recipe.macros.protein} max={60} color="#22C55E" label="Protein" />
          <MacroRing value={recipe.macros.carbs} max={100} color="#F97316" label="Carbs" />
          <MacroRing value={recipe.macros.fat} max={60} color="#60A5FA" label="Fat" />
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-xl">{recipe.macros.calories}</p>
          <p className="text-white/50 text-xs">kcal</p>
        </div>
      </div>
      <div className="bg-[#1C2B1E] px-4 py-2.5">
        <span className="text-[#22C55E] text-xs font-semibold">{recipe.goalTag}</span>
      </div>
    </div>
  );
}

export function HomeFeed() {
  const [activeTab, setActiveTab] = useState("home");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const totalCals = recipes.reduce((s, r) => s + r.macros.calories, 0);
  const totalProtein = recipes.reduce((s, r) => s + r.macros.protein, 0);

  return (
    <div className="min-h-screen bg-[#0F1710] flex flex-col font-sans max-w-[390px] mx-auto relative overflow-hidden">
      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-4 pb-0">
        <span className="text-white/40 text-xs">9:41</span>
        <div className="flex gap-1 items-center">
          <div className="w-4 h-2.5 border border-white/30 rounded-sm relative"><div className="absolute left-0 top-0 bottom-0 w-3/4 bg-white/50 rounded-sm" /></div>
          <svg className="w-3 h-3 text-white/40" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
        </div>
      </div>

      {/* Header */}
      <div className="px-6 pt-3 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/50 text-sm">{today}</p>
            <h1 className="text-white text-2xl font-bold mt-0.5">Good morning, Alex 👋</h1>
          </div>
          <div className="flex flex-col items-center bg-[#1C2B1E] rounded-2xl px-3 py-2">
            <span className="text-2xl">🔥</span>
            <span className="text-[#F97316] font-bold text-sm">14d</span>
            <span className="text-white/40 text-[10px]">streak</span>
          </div>
        </div>

        {/* Daily summary pill */}
        <div className="mt-4 bg-[#1C2B1E] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/70 text-sm font-medium">Today's plan</span>
            <span className="text-[#22C55E] text-xs font-semibold">4 meals ready ✓</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>Calories</span>
                <span>{totalCals} / 2000</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#F97316] rounded-full" style={{ width: `${(totalCals / 2000) * 100}%` }} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-base">{totalProtein}g</p>
              <p className="text-white/40 text-[10px]">protein</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section header */}
      <div className="px-6 flex items-center justify-between mb-3">
        <h2 className="text-white font-bold text-lg">Today's Recipes</h2>
        <button className="text-[#22C55E] text-sm font-semibold">Regenerate</button>
      </div>

      {/* Recipe cards horizontal scroll */}
      <div className="flex gap-4 px-6 overflow-x-auto pb-2 scrollbar-hide">
        {recipes.map((r) => (
          <RecipeCard key={r.id} recipe={r} onClick={() => {}} />
        ))}
      </div>

      {/* NutriChat button */}
      <div className="flex-1" />
      <div className="px-6 py-4">
        <button className="w-full bg-gradient-to-r from-[#22C55E] to-emerald-600 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/40">
          <span className="text-xl">🤖</span>
          <span>Ask NutriAI about your meals</span>
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="bg-[#1C2B1E]/90 backdrop-blur-xl border-t border-white/5 px-4 py-3 pb-6 flex justify-around">
        {[
          { id: "home", icon: "🏠", label: "Home" },
          { id: "explore", icon: "🔍", label: "Explore" },
          { id: "shopping", icon: "🛒", label: "Shop" },
          { id: "profile", icon: "👤", label: "Profile" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? "opacity-100" : "opacity-40"}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className={`text-[10px] font-semibold ${activeTab === tab.id ? "text-[#22C55E]" : "text-white"}`}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
