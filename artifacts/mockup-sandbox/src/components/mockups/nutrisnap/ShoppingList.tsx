import { useState } from "react";

const stores = [
  { name: "Whole Foods Market", distance: "0.3 mi", open: "Open · Closes 10 PM", logo: "🌿", rating: 4.8 },
  { name: "Trader Joe's", distance: "0.7 mi", open: "Open · Closes 9 PM", logo: "🌺", rating: 4.7 },
  { name: "ALDI", distance: "1.1 mi", open: "Open · Closes 8 PM", logo: "🅰", rating: 4.5 },
];

const sections = [
  {
    section: "🥬 Produce",
    items: [
      { name: "Wild Atlantic salmon fillet", amount: "560g", meal: "Dinner", checked: false },
      { name: "Baby spinach", amount: "240g", meal: "Dinner", checked: false },
      { name: "Cherry tomatoes", amount: "300g", meal: "Dinner + Lunch", checked: true },
      { name: "Avocado", amount: "2 large", meal: "Breakfast", checked: true },
      { name: "Mixed berries (blueberry, raspberry)", amount: "200g", meal: "Breakfast", checked: false },
      { name: "Lemon", amount: "3 whole", meal: "All meals", checked: false },
      { name: "Fresh dill", amount: "1 bunch", meal: "Dinner", checked: false },
      { name: "Cucumber", amount: "1 large", meal: "Lunch", checked: false },
    ],
  },
  {
    section: "🥩 Protein",
    items: [
      { name: "Chickpeas (dried)", amount: "200g", meal: "Lunch", checked: false },
      { name: "Free-range eggs", amount: "6 pack", meal: "Breakfast", checked: true },
    ],
  },
  {
    section: "🌾 Grains & Legumes",
    items: [
      { name: "Quinoa", amount: "300g", meal: "Lunch", checked: false },
      { name: "Rolled oats (whole grain)", amount: "400g", meal: "Breakfast", checked: true },
    ],
  },
  {
    section: "🧴 Pantry",
    items: [
      { name: "Extra virgin olive oil", amount: "1 bottle", meal: "All meals", checked: false },
      { name: "Capers", amount: "1 jar", meal: "Dinner", checked: false },
      { name: "Kalamata olives", amount: "150g", meal: "Lunch", checked: true },
      { name: "Raw honey", amount: "1 jar", meal: "Breakfast", checked: false },
    ],
  },
];

export function ShoppingList() {
  const [items, setItems] = useState(sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) })));

  const toggleItem = (sIdx: number, iIdx: number) => {
    const next = items.map((s, si) => si !== sIdx ? s : {
      ...s,
      items: s.items.map((item, ii) => ii !== iIdx ? item : { ...item, checked: !item.checked }),
    });
    setItems(next);
  };

  const totalItems = items.reduce((s, sec) => s + sec.items.length, 0);
  const checkedCount = items.reduce((s, sec) => s + sec.items.filter((i) => i.checked).length, 0);

  return (
    <div className="min-h-screen bg-[#0F1710] font-sans max-w-[390px] mx-auto flex flex-col">
      <div className="px-5 pt-10 pb-4 bg-[#0F1710] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-white font-bold text-2xl">Shopping List</h1>
          <button className="text-[#22C55E] text-sm font-semibold">Share ↗</button>
        </div>
        <p className="text-white/40 text-sm">{checkedCount} of {totalItems} items checked · Today's 3 meals</p>

        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#22C55E] to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(checkedCount / totalItems) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="flex gap-2 px-5 mb-4">
          <button className="bg-[#1C2B1E] text-white/60 text-xs font-semibold py-2.5 px-4 rounded-xl">
            📋 Copy all
          </button>
        </div>

        {items.map((section, sIdx) => (
          <div key={sIdx} className="px-5 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/70 text-sm font-bold">{section.section}</h3>
              <span className="text-white/30 text-xs">
                {section.items.filter((i) => i.checked).length}/{section.items.length}
              </span>
            </div>
            <div className="space-y-2">
              {section.items.map((item, iIdx) => (
                <button
                  key={iIdx}
                  onClick={() => toggleItem(sIdx, iIdx)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all text-left ${item.checked ? "bg-[#1C2B1E]/50 opacity-60" : "bg-[#1C2B1E]"}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.checked ? "bg-[#22C55E] border-[#22C55E]" : "border-white/30"}`}>
                    {item.checked && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${item.checked ? "line-through text-white/40" : "text-white"}`}>
                      {item.name}
                    </p>
                    <p className="text-white/30 text-xs">{item.meal}</p>
                  </div>
                  <span className="text-white/40 text-xs font-medium">{item.amount}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="px-5 mb-5">
          <h2 className="text-white font-bold text-base mb-3">📍 Nearby Stores</h2>
          <div className="space-y-3">
            {stores.map((store, i) => (
              <div
                key={i}
                className="bg-[#1C2B1E] rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-[#22C55E]/20 rounded-xl flex items-center justify-center text-xl">
                  {store.logo}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">{store.name}</p>
                  <p className="text-[#22C55E] text-xs font-medium">{store.open}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-white/40 text-xs">{store.distance} · ★ {store.rating}</p>
                  <span className="text-[#22C55E] text-xs font-semibold">Navigate →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
