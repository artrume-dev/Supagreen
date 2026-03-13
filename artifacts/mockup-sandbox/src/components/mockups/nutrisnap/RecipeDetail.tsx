import { useState } from "react";

const recipe = {
  meal: "dinner",
  emoji: "🐟",
  title: "Herb Baked Salmon & Greens",
  prepTime: 25,
  servings: 2,
  healthScore: 9.8,
  goalAlignment: "Optimised for muscle building — high omega-3s reduce inflammation post-workout",
  macros: { calories: 580, protein: 42, carbs: 28, fat: 32 },
  ingredients: [
    { name: "Wild Atlantic salmon fillet", amount: "280", unit: "g", isKey: true },
    { name: "Fresh dill", amount: "2", unit: "tbsp", isKey: false },
    { name: "Lemon", amount: "1", unit: "whole", isKey: false },
    { name: "Garlic cloves", amount: "3", unit: "cloves", isKey: false },
    { name: "Olive oil (extra virgin)", amount: "2", unit: "tbsp", isKey: true },
    { name: "Baby spinach", amount: "120", unit: "g", isKey: false },
    { name: "Cherry tomatoes", amount: "150", unit: "g", isKey: false },
    { name: "Capers", amount: "1", unit: "tbsp", isKey: false },
    { name: "Sea salt & black pepper", amount: "to", unit: "taste", isKey: false },
  ],
  steps: [
    "Preheat oven to 200°C (400°F). Line a baking tray with parchment paper.",
    "Pat salmon dry and place on tray. Drizzle with olive oil, season generously with salt and pepper.",
    "Scatter minced garlic and fresh dill over the salmon. Lay lemon slices on top.",
    "Bake for 18-20 minutes until salmon flakes easily with a fork.",
    "While salmon bakes, halve cherry tomatoes and wilt spinach in a pan with 1 tsp olive oil.",
    "Plate greens first, top with salmon, and finish with capers and lemon zest.",
  ],
  benefits: [
    "Rich in omega-3 fatty acids for heart health & anti-inflammation",
    "42g complete protein to support muscle repair and growth",
    "Vitamin D and B12 from salmon support energy and immunity",
  ],
  swap: "Swap salmon for mackerel or trout — same omega-3 benefits at lower cost",
};

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="text-center mb-1">
        <span className="text-white font-bold text-base">{value}g</span>
        <p className="text-white/50 text-[10px]">{label}</p>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export function RecipeDetail() {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleIngredient = (i: number) => {
    const next = new Set(checkedIngredients);
    next.has(i) ? next.delete(i) : next.add(i);
    setCheckedIngredients(next);
  };

  const toggleStep = (i: number) => {
    const next = new Set(completedSteps);
    next.has(i) ? next.delete(i) : next.add(i);
    setCompletedSteps(next);
  };

  return (
    <div className="min-h-screen bg-[#0F1710] font-sans max-w-[390px] mx-auto flex flex-col overflow-hidden">
      {/* Hero */}
      <div className="relative h-64 flex-shrink-0">
        <img
          src="https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80"
          alt="Salmon"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1710] via-[#0F1710]/30 to-transparent" />
        <div className="absolute top-4 left-4">
          <button className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
            ←
          </button>
        </div>
        <div className="absolute top-4 right-4">
          <button className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
            ♡
          </button>
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex gap-2 mb-2">
            <span className="bg-[#22C55E]/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">
              {recipe.meal}
            </span>
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
              ⏱ {recipe.prepTime} min
            </span>
          </div>
          <h1 className="text-white font-bold text-xl leading-tight">{recipe.emoji} {recipe.title}</h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Goal alignment banner */}
        <div className="mx-5 mt-4 bg-gradient-to-r from-[#F97316]/20 to-transparent border border-[#F97316]/30 rounded-2xl p-3.5">
          <p className="text-[#F97316] text-xs font-bold mb-0.5">💪 GOAL ALIGNMENT</p>
          <p className="text-white/80 text-xs leading-relaxed">{recipe.goalAlignment}</p>
        </div>

        {/* Health Score */}
        <div className="flex items-center gap-3 mx-5 mt-4">
          <div className="bg-[#22C55E] text-white font-black text-lg px-3 py-1 rounded-xl">★ {recipe.healthScore}</div>
          <div>
            <p className="text-white font-semibold text-sm">Excellent nutritional score</p>
            <p className="text-white/50 text-xs">{recipe.servings} servings</p>
          </div>
        </div>

        {/* Macros */}
        <div className="mx-5 mt-4 bg-[#1C2B1E] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold">Macros per serving</span>
            <span className="text-white font-bold text-lg">{recipe.macros.calories} <span className="text-white/50 text-sm font-normal">kcal</span></span>
          </div>
          <div className="flex gap-4">
            <MacroBar label="Protein" value={recipe.macros.protein} max={60} color="#22C55E" />
            <MacroBar label="Carbs" value={recipe.macros.carbs} max={100} color="#F97316" />
            <MacroBar label="Fat" value={recipe.macros.fat} max={60} color="#60A5FA" />
          </div>
        </div>

        {/* Ingredients */}
        <div className="mx-5 mt-5">
          <h2 className="text-white font-bold text-base mb-3">Ingredients</h2>
          <div className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <button
                key={i}
                onClick={() => toggleIngredient(i)}
                className={`w-full flex items-center gap-3 bg-[#1C2B1E] rounded-xl px-4 py-3 transition-all ${checkedIngredients.has(i) ? "opacity-50" : ""}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checkedIngredients.has(i) ? "bg-[#22C55E] border-[#22C55E]" : "border-white/30"}`}>
                  {checkedIngredients.has(i) && <span className="text-white text-xs">✓</span>}
                </div>
                <span className={`flex-1 text-left text-sm text-white ${checkedIngredients.has(i) ? "line-through" : ""}`}>
                  {ing.name}
                  {ing.isKey && <span className="ml-2 text-[#22C55E] text-xs">★</span>}
                </span>
                <span className="text-white/40 text-xs">{ing.amount} {ing.unit}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="mx-5 mt-5">
          <h2 className="text-white font-bold text-base mb-3">Method</h2>
          <div className="space-y-3">
            {recipe.steps.map((step, i) => (
              <button
                key={i}
                onClick={() => toggleStep(i)}
                className={`w-full flex gap-3 bg-[#1C2B1E] rounded-xl p-4 text-left transition-all ${completedSteps.has(i) ? "opacity-50" : ""}`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${completedSteps.has(i) ? "bg-[#22C55E] text-white" : "bg-[#22C55E]/20 text-[#22C55E]"}`}>
                  {completedSteps.has(i) ? "✓" : i + 1}
                </div>
                <p className={`text-sm text-white/80 leading-relaxed ${completedSteps.has(i) ? "line-through text-white/40" : ""}`}>{step}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Health benefits */}
        <div className="mx-5 mt-5">
          <h2 className="text-white font-bold text-base mb-3">Health Benefits</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.benefits.map((b, i) => (
              <div key={i} className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl px-3 py-2">
                <p className="text-[#22C55E] text-xs font-medium">{b}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Swap suggestion */}
        <div className="mx-5 mt-4 mb-4 bg-[#F97316]/10 border border-[#F97316]/20 rounded-2xl p-4">
          <p className="text-[#F97316] text-xs font-bold mb-1">💡 SMART SWAP</p>
          <p className="text-white/70 text-xs">{recipe.swap}</p>
        </div>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-[#1C2B1E]/95 backdrop-blur-xl border-t border-white/5 px-5 py-4 pb-8 flex gap-3">
        <button className="flex-1 bg-[#22C55E] text-white font-semibold py-3.5 rounded-2xl text-sm">
          🛒 Add to Shopping List
        </button>
        <button className="w-12 h-12 bg-[#0F1710] border border-white/10 rounded-2xl flex items-center justify-center text-white text-lg">
          ↗
        </button>
      </div>
    </div>
  );
}
