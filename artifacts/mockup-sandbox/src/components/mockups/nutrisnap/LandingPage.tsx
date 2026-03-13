import { useState } from "react";

const features = [
  {
    icon: "🤖",
    title: "AI-Personalised Daily Recipes",
    desc: "Claude AI generates 3 whole-food recipes every morning — breakfast, lunch, and dinner — tailored to your diet, goals, allergies, and local seasonal produce.",
    color: "from-green-500/20 to-emerald-600/10",
    border: "border-green-500/20",
  },
  {
    icon: "📍",
    title: "Nearby Store Finder",
    desc: "Instantly see which local supermarkets carry every ingredient. Get walking or driving directions to Whole Foods, Trader Joe's, ALDI, and more — all in one tap.",
    color: "from-orange-500/20 to-amber-600/10",
    border: "border-orange-500/20",
  },
  {
    icon: "💪",
    title: "Goal-Aligned Nutrition",
    desc: "Every recipe is engineered for your specific health goal — fat loss, muscle gain, gut health, or anti-inflammation — with macro breakdowns per serving.",
    color: "from-blue-500/20 to-cyan-600/10",
    border: "border-blue-500/20",
  },
  {
    icon: "🔥",
    title: "Streak & Gamification",
    desc: "Build healthy habits with a Duolingo-style streak system. Earn milestone badges, unlock challenges, and share your wins on TikTok and Instagram.",
    color: "from-rose-500/20 to-pink-600/10",
    border: "border-rose-500/20",
  },
  {
    icon: "🛒",
    title: "Smart Shopping List",
    desc: "Every ingredient from all 3 meals is auto-grouped by store section — Produce, Protein, Grains, Pantry. Check items off as you shop and share with a tap.",
    color: "from-violet-500/20 to-purple-600/10",
    border: "border-violet-500/20",
  },
  {
    icon: "💬",
    title: "NutriChat AI Assistant",
    desc: "Got a nutrition question? Ask your AI nutritionist anything — from calorie counts to ingredient substitutions — available on every screen, 24/7.",
    color: "from-teal-500/20 to-green-600/10",
    border: "border-teal-500/20",
  },
];

const steps = [
  {
    num: "01",
    title: "Tell us about yourself",
    desc: "Complete a quick 5-step onboarding: your diet type, allergies, health goal, cooking skill level, and location. Takes under 60 seconds.",
    img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
    accent: "#22C55E",
  },
  {
    num: "02",
    title: "Get your daily recipes",
    desc: "Every morning, 3 fully personalised whole-food recipes appear — ready to cook, with macros, step-by-step instructions, and seasonal ingredient sourcing.",
    img: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
    accent: "#F97316",
  },
  {
    num: "03",
    title: "Cook, track & thrive",
    desc: "Check off ingredients, follow the method, and mark meals as cooked. Your streak grows, macros are tracked, and your AI chef gets smarter every day.",
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
    accent: "#60A5FA",
  },
];

const testimonials = [
  {
    name: "Sophia K.",
    handle: "@sophiaeats",
    avatar: "🧑‍🦰",
    goal: "Fat loss",
    text: "I've tried every meal plan app and nothing stuck. NutriSnap feels like texting a nutritionist friend. I lost 8 lbs in 6 weeks without counting a single calorie manually.",
    streak: "42d streak 🔥",
  },
  {
    name: "Marcus T.",
    handle: "@marcustrains",
    avatar: "🧔",
    goal: "Muscle building",
    text: "The recipes are legitimately delicious and actually hit my macros. 42g protein in a dinner that tastes like a restaurant meal? Sold. Been on a 30-day streak.",
    streak: "30d streak ⚡",
  },
  {
    name: "Aisha M.",
    handle: "@aishaglows",
    avatar: "👩‍🦱",
    goal: "Gut health",
    text: "As someone with multiple intolerances, finding compliant recipes was exhausting. NutriSnap removes all that friction. Every single recipe is safe and genuinely exciting.",
    streak: "21d streak 🌱",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Start your journey with personalised daily recipes",
    features: [
      "3 AI recipes per day",
      "Basic store finder",
      "5 recipe regenerations/week",
      "Shopping list",
      "Streak tracking",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$4.99",
    period: "per month",
    desc: "Everything you need to fully optimise your nutrition",
    features: [
      "Unlimited regenerations",
      "Fridge mode (use what you have)",
      "Ingredient camera scanner",
      "NutriChat AI assistant",
      "Weekly meal prep guide",
      "Advanced macro tracking",
      "Ad-free experience",
    ],
    cta: "Start 7-day free trial",
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Creator",
    price: "$9.99",
    period: "per month",
    desc: "For food creators who want to grow their audience",
    features: [
      "Everything in Pro",
      "Custom branded share cards",
      "Recipe collections",
      "Shareable profile page",
      "TikTok-optimised export",
      "Priority AI response",
    ],
    cta: "Go Creator",
    highlight: false,
  },
];

const navLinks = ["Features", "How it works", "Pricing", "Blog"];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "What does 'whole food' mean in NutriSnap?",
      a: "Every ingredient in every recipe must be unprocessed and natural — no protein powders, artificial sweeteners, seed oils (canola, soybean), white flour, refined sugar, or ultra-processed ingredients. If it has more than one ingredient on the label, it doesn't make the cut.",
    },
    {
      q: "How does the seasonal sourcing work?",
      a: "We detect your location and current season, then instruct our AI to use only ingredients that are naturally in season in your region. This means fresher produce, better flavour, and lower cost at the supermarket.",
    },
    {
      q: "Can I use NutriSnap if I have multiple dietary restrictions?",
      a: "Absolutely. During onboarding you select your diet type (vegan, keto, paleo, etc.) AND any allergies or intolerances. The AI respects all of them simultaneously — every recipe it generates is fully compliant.",
    },
    {
      q: "Is my location data private?",
      a: "Your location is used solely to find seasonal produce and nearby stores. It is never sold, shared with advertisers, or stored beyond what's needed to generate your recipes.",
    },
    {
      q: "How many times can I regenerate a recipe?",
      a: "Free users can regenerate individual meals up to 5 times per week total. Pro and Creator users get unlimited regenerations — swap any meal as many times as you like.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F1710] font-sans text-white overflow-x-hidden">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 bg-[#0F1710]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#22C55E] rounded-xl flex items-center justify-center font-black text-sm text-white shadow-lg shadow-green-900/50">
              N
            </div>
            <span className="font-bold text-lg text-white">NutriSnap</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l} href="#" className="text-white/60 hover:text-white text-sm transition-colors">
                {l}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="text-white/60 hover:text-white text-sm transition-colors px-3 py-2">
              Log in
            </button>
            <button className="bg-[#22C55E] hover:bg-green-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-green-900/30">
              Start free →
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white/60 text-xl"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#22C55E]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#F97316]/6 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-semibold px-4 py-2 rounded-full mb-6">
                <span>✨</span>
                <span>Powered by AI · 100% whole foods</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-6">
                Your AI nutritionist,{" "}
                <span className="bg-gradient-to-r from-[#22C55E] to-emerald-400 bg-clip-text text-transparent">
                  in your pocket.
                </span>
              </h1>

              <p className="text-white/60 text-lg lg:text-xl leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                NutriSnap generates 3 personalised, whole-food recipes every morning — based on your diet, goals, and what's in season near you. No meal plans. No tracking hell. Just real food, made simple.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
                <button className="bg-[#22C55E] hover:bg-green-400 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-xl shadow-green-900/30 flex items-center justify-center gap-2">
                  <span>Start free — no card needed</span>
                  <span>→</span>
                </button>
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2">
                  <span>▶</span>
                  <span>Watch 60s demo</span>
                </button>
              </div>

              {/* Social proof numbers */}
              <div className="flex gap-8 justify-center lg:justify-start">
                {[
                  { val: "50k+", label: "Active users" },
                  { val: "4.9★", label: "App Store" },
                  { val: "2.1M", label: "Recipes made" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-white font-black text-xl">{s.val}</p>
                    <p className="text-white/40 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: phone mockup trio */}
            <div className="flex-1 flex justify-center lg:justify-end relative">
              <div className="relative w-80 h-[580px]">
                {/* Back card */}
                <div className="absolute -left-14 top-10 w-52 h-[420px] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 rotate-[-8deg] opacity-60">
                  <img
                    src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80"
                    alt="Healthy food"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1710] to-transparent" />
                </div>

                {/* Main phone */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-64 h-[540px] bg-[#0F1710] rounded-[44px] border-4 border-white/20 shadow-2xl overflow-hidden z-10">
                  <img
                    src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80"
                    alt="App preview"
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-white/50 text-[10px]">Friday, March 13</p>
                        <p className="text-white font-bold text-sm">Today's Recipes ✓</p>
                      </div>
                      <div className="bg-[#1C2B1E] rounded-xl px-2 py-1.5 text-center">
                        <p className="text-xl">🔥</p>
                        <p className="text-[#F97316] text-[10px] font-bold">14d</p>
                      </div>
                    </div>

                    {/* Mini recipe cards */}
                    {[
                      { emoji: "🥑", title: "Avocado Power Bowl", time: "12 min", score: "9.4" },
                      { emoji: "🥗", title: "Mediterranean Salad", time: "18 min", score: "9.7" },
                    ].map((r, i) => (
                      <div key={i} className="bg-[#1C2B1E] rounded-xl p-2.5 mb-2 flex items-center gap-2.5">
                        <span className="text-xl">{r.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[11px] font-semibold truncate">{r.title}</p>
                          <p className="text-white/40 text-[10px]">⏱ {r.time}</p>
                        </div>
                        <span className="bg-[#22C55E] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg">★ {r.score}</span>
                      </div>
                    ))}

                    <div className="mt-3 bg-gradient-to-r from-[#22C55E] to-emerald-600 rounded-xl py-2.5 text-center">
                      <p className="text-white text-[11px] font-bold">🤖 Ask NutriAI</p>
                    </div>
                  </div>
                </div>

                {/* Right card */}
                <div className="absolute -right-14 top-10 w-52 h-[420px] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 rotate-[8deg] opacity-60">
                  <img
                    src="https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80"
                    alt="Salmon dinner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1710] to-transparent" />
                </div>

                {/* Floating badges */}
                <div className="absolute -right-6 top-32 bg-[#1C2B1E] border border-white/10 rounded-2xl px-3 py-2 shadow-xl z-20">
                  <p className="text-white text-xs font-bold">🏆 30-day streak!</p>
                  <p className="text-white/40 text-[10px]">+1 this week</p>
                </div>
                <div className="absolute -left-6 bottom-28 bg-[#22C55E]/90 rounded-2xl px-3 py-2 shadow-xl z-20">
                  <p className="text-white text-xs font-bold">42g protein 💪</p>
                  <p className="text-white/80 text-[10px]">Herb Baked Salmon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ─── LOGO BAR ─── */}
      <div className="border-y border-white/5 py-6">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-white/30 text-xs uppercase tracking-widest mb-5 font-semibold">
            Ingredients sourced from stores near you
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {["🌿 Whole Foods", "🌺 Trader Joe's", "🅰 ALDI", "🏪 Tesco", "🛒 Sainsbury's", "🌿 Waitrose"].map((s) => (
              <span key={s} className="text-white/30 text-sm font-semibold hover:text-white/60 transition-colors cursor-default">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* ─── FEATURES ─── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#22C55E] text-sm font-bold uppercase tracking-widest mb-3">Why NutriSnap</p>
            <h2 className="text-4xl font-black mb-4">Everything your nutrition needs.</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              From AI recipe generation to in-store navigation — NutriSnap is the only tool you need to eat well, consistently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className={`bg-gradient-to-br ${f.color} border ${f.border} rounded-3xl p-6 hover:scale-[1.02] transition-transform cursor-default`}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24 bg-[#1C2B1E]/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#F97316] text-sm font-bold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl font-black mb-4">Three steps to eating well.</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              NutriSnap removes every friction point between you and a healthy meal on the table.
            </p>
          </div>

          <div className="space-y-20">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12`}
              >
                <div className="flex-1">
                  <div
                    className="text-8xl font-black mb-4 leading-none"
                    style={{ color: step.accent, opacity: 0.3 }}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-white font-black text-3xl mb-4">{step.title}</h3>
                  <p className="text-white/60 text-lg leading-relaxed max-w-md">{step.desc}</p>
                </div>

                <div className="flex-1 relative">
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                    <img
                      src={step.img}
                      alt={step.title}
                      className="w-full h-72 object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(to top, ${step.accent}30, transparent)` }}
                    />
                  </div>
                  <div
                    className="absolute -bottom-4 -right-4 w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-2xl border border-white/10"
                    style={{ background: step.accent }}
                  >
                    {["🥗", "🍳", "✅"][i]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ─── SOCIAL PROOF ─── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#22C55E] text-sm font-bold uppercase tracking-widest mb-3">Loved by thousands</p>
            <h2 className="text-4xl font-black mb-4">Real results, real food.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-[#1C2B1E] rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#22C55E]/20 flex items-center justify-center text-2xl">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.handle} · {t.goal}</p>
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <span className="bg-[#F97316]/10 text-[#F97316] text-xs font-bold px-3 py-1.5 rounded-full">
                    {t.streak}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-[#F97316] text-xs">★</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Big stat */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { val: "50,000+", label: "Active users worldwide", icon: "👥" },
              { val: "2.1M+", label: "Whole-food recipes generated", icon: "🍽" },
              { val: "94%", label: "Report improved energy in 2 weeks", icon: "⚡" },
              { val: "4.9 / 5", label: "Average App Store rating", icon: "★" },
            ].map((s) => (
              <div key={s.label} className="bg-[#1C2B1E] rounded-2xl p-5 text-center border border-white/5">
                <div className="text-3xl mb-2">{s.icon}</div>
                <p className="text-white font-black text-2xl mb-1">{s.val}</p>
                <p className="text-white/40 text-xs leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ─── PRICING ─── */}
      <section className="py-24 bg-[#1C2B1E]/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-[#22C55E] text-sm font-bold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-black mb-4">Simple, honest pricing.</h2>
            <p className="text-white/50 text-lg max-w-lg mx-auto">
              Start free forever. Upgrade when you're ready for the full experience.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-semibold ${!billingAnnual ? "text-white" : "text-white/40"}`}>Monthly</span>
            <button
              onClick={() => setBillingAnnual(!billingAnnual)}
              className={`relative w-12 h-6 rounded-full transition-all ${billingAnnual ? "bg-[#22C55E]" : "bg-white/20"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${billingAnnual ? "left-7" : "left-1"}`} />
            </button>
            <span className={`text-sm font-semibold ${billingAnnual ? "text-white" : "text-white/40"}`}>
              Annual <span className="bg-[#22C55E]/20 text-[#22C55E] text-xs font-bold px-2 py-0.5 rounded-full ml-1">Save 30%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-6 border transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-b from-[#22C55E]/15 to-[#1C2B1E] border-[#22C55E]/40 shadow-2xl shadow-green-900/20 scale-105"
                    : "bg-[#1C2B1E] border-white/10"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#22C55E] text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-white/50 text-sm mb-4">{plan.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-white font-black text-4xl">
                      {billingAnnual && plan.price !== "$0"
                        ? `$${(parseFloat(plan.price.slice(1)) * 0.7).toFixed(2)}`
                        : plan.price}
                    </span>
                    <span className="text-white/40 text-sm mb-1">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <span className="text-[#22C55E] mt-0.5 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
                    plan.highlight
                      ? "bg-[#22C55E] hover:bg-green-400 text-white shadow-lg shadow-green-900/30"
                      : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ─── FAQ ─── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">Common questions.</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-[#1C2B1E] border border-white/5 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-white font-semibold text-sm">{faq.q}</span>
                  <span className={`text-[#22C55E] text-lg transition-transform ml-4 flex-shrink-0 ${activeFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {activeFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-white/60 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ─── FINAL CTA ─── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/10 via-transparent to-[#F97316]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#22C55E]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="text-7xl mb-6">🥗</div>
          <h2 className="text-5xl font-black mb-4">
            Start eating well{" "}
            <span className="bg-gradient-to-r from-[#22C55E] to-emerald-400 bg-clip-text text-transparent">
              today.
            </span>
          </h2>
          <p className="text-white/50 text-xl mb-8 max-w-lg mx-auto">
            Join 50,000+ people who've made whole-food eating effortless with NutriSnap.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="bg-[#22C55E] hover:bg-green-400 text-white font-bold px-10 py-4 rounded-2xl text-base transition-all shadow-2xl shadow-green-900/30">
              Get started free →
            </button>
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-10 py-4 rounded-2xl text-base transition-all">
              See how it works
            </button>
          </div>
          <p className="text-white/30 text-xs mt-5">No credit card required · Cancel anytime · GDPR compliant</p>
        </div>
      </section>
      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#22C55E] rounded-lg flex items-center justify-center font-black text-xs text-white">N</div>
                <span className="font-bold text-white">NutriSnap</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                AI-powered whole-food recipes personalised to your body, goals, and location. Eat well, every day.
              </p>
              <div className="flex gap-3 mt-4">
                {["𝕏", "📸", "🎵"].map((s) => (
                  <button key={s} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-sm transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Download", "Changelog"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { title: "Legal", links: ["Privacy", "Terms", "Cookies", "GDPR"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-white font-semibold text-sm mb-3">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-white/40 hover:text-white text-sm transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/30 text-xs">© 2026 NutriSnap. All rights reserved. Made with 🥗</p>
            <p className="text-white/30 text-xs">Powered by Claude AI · 100% whole foods, always.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
