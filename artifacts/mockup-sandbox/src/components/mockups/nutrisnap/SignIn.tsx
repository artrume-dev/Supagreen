import { useState } from "react";

type Screen = "welcome" | "signin" | "signup" | "forgot";

export function SignIn() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-[#0F1710] font-sans flex flex-col max-w-[390px] mx-auto overflow-hidden relative">
        {/* Background hero image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80"
            alt="Healthy food"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1710] via-[#0F1710]/70 to-[#0F1710]/40" />
        </div>

        {/* Content */}
        <div className="relative flex flex-col flex-1 px-6 pt-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-auto">
            <div className="w-9 h-9 bg-[#22C55E] rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-green-900/50">
              N
            </div>
            <span className="text-white font-bold text-xl">NutriSnap</span>
          </div>

          {/* Hero text */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <span>✨</span>
              <span>100% whole foods · AI-powered</span>
            </div>
            <h1 className="text-white font-black text-4xl leading-tight mb-4">
              Eat well,<br />
              <span className="bg-gradient-to-r from-[#22C55E] to-emerald-400 bg-clip-text text-transparent">
                every day.
              </span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              Your AI nutritionist generates 3 personalised whole-food recipes every morning — tailored to your goals and what's in season near you.
            </p>
          </div>

          {/* Social stats */}
          <div className="flex gap-6 mb-8">
            {[
              { val: "50k+", label: "Users" },
              { val: "4.9★", label: "Rating" },
              { val: "2.1M", label: "Recipes" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white font-black text-lg">{s.val}</p>
                <p className="text-white/40 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-3 pb-10">
            {/* Google OAuth */}
            <button className="w-full bg-white text-[#0F1710] font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl text-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Apple */}
            <button className="w-full bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 text-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span>Continue with Apple</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              onClick={() => setScreen("signup")}
              className="w-full bg-[#22C55E] text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-green-900/30"
            >
              Sign up with email
            </button>

            <p className="text-center text-white/50 text-sm">
              Already have an account?{" "}
              <button onClick={() => setScreen("signin")} className="text-[#22C55E] font-semibold">
                Sign in
              </button>
            </p>

            <p className="text-center text-white/20 text-xs pb-2">
              By continuing, you agree to our Terms & Privacy Policy
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "forgot") {
    return (
      <div className="min-h-screen bg-[#0F1710] font-sans flex flex-col max-w-[390px] mx-auto px-6 py-10">
        <button onClick={() => setScreen("signin")} className="text-white/50 text-sm flex items-center gap-2 mb-8">
          ← Back
        </button>
        <div className="w-14 h-14 bg-[#22C55E]/15 rounded-2xl flex items-center justify-center text-3xl mb-6">✉️</div>
        <h2 className="text-white font-black text-3xl mb-2">Reset password</h2>
        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          Enter your email and we'll send you a magic link to sign back in — no password needed.
        </p>

        {magicSent ? (
          <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-3">📬</div>
            <p className="text-white font-bold mb-1">Check your inbox</p>
            <p className="text-white/50 text-sm">We sent a magic link to <span className="text-[#22C55E]">{email || "your email"}</span></p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1C2B1E] border border-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-4 text-sm outline-none focus:border-[#22C55E]/50 transition-colors"
              />
            </div>
            <button
              onClick={() => setMagicSent(true)}
              className="w-full bg-[#22C55E] text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-green-900/30"
            >
              Send magic link ✨
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1710] font-sans flex flex-col max-w-[390px] mx-auto px-6 py-10">
      {/* Back button */}
      <button onClick={() => setScreen("welcome")} className="text-white/50 text-sm flex items-center gap-2 mb-8 w-fit">
        ← Back
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#22C55E] rounded-xl flex items-center justify-center font-black text-white text-sm">N</div>
        <span className="text-white font-bold text-lg">NutriSnap</span>
      </div>

      {/* Title */}
      <h2 className="text-white font-black text-3xl mb-1">
        {screen === "signin" ? "Welcome back 👋" : "Create account"}
      </h2>
      <p className="text-white/50 text-sm mb-8">
        {screen === "signin"
          ? "Sign in to access your personalised recipes"
          : "Start your whole-food journey today — it's free"}
      </p>

      {/* OAuth */}
      <div className="space-y-3 mb-6">
        <button className="w-full bg-white text-[#0F1710] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 shadow-xl text-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>
        <button className="w-full bg-white/8 border border-white/10 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 text-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <span>Continue with Apple</span>
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-xs">or with email</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Form */}
      <div className="space-y-4 mb-6">
        {screen === "signup" && (
          <div>
            <label className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2 block">Full name</label>
            <input
              type="text"
              placeholder="Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1C2B1E] border border-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-4 text-sm outline-none focus:border-[#22C55E]/50 transition-colors"
            />
          </div>
        )}

        <div>
          <label className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2 block">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#1C2B1E] border border-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-4 text-sm outline-none focus:border-[#22C55E]/50 transition-colors"
          />
        </div>

        <div>
          <label className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2 block">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={screen === "signup" ? "Min. 8 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1C2B1E] border border-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-4 pr-12 text-sm outline-none focus:border-[#22C55E]/50 transition-colors"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-lg"
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {screen === "signup" && (
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-md border-2 border-white/20 flex items-center justify-center mt-0.5 flex-shrink-0 bg-[#22C55E] border-[#22C55E]">
              <span className="text-white text-xs">✓</span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              I agree to the <span className="text-[#22C55E]">Terms of Service</span> and <span className="text-[#22C55E]">Privacy Policy</span>. My location is never shared with third parties.
            </p>
          </div>
        )}
      </div>

      {screen === "signin" && (
        <button
          onClick={() => setScreen("forgot")}
          className="text-[#22C55E] text-xs font-semibold text-right mb-4 block w-full"
        >
          Forgot password?
        </button>
      )}

      {/* Submit */}
      <button className="w-full bg-[#22C55E] text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-green-900/30 mb-4">
        {screen === "signin" ? "Sign in →" : "Create my account →"}
      </button>

      {/* Magic link option */}
      <div className="bg-[#1C2B1E] border border-white/5 rounded-2xl p-4 flex items-center gap-3 mb-6">
        <span className="text-2xl">✨</span>
        <div className="flex-1">
          <p className="text-white text-xs font-semibold">Prefer a magic link?</p>
          <p className="text-white/40 text-xs">Sign in without a password — we'll email you a secure link</p>
        </div>
        <button
          onClick={() => setScreen("forgot")}
          className="text-[#22C55E] text-xs font-semibold flex-shrink-0"
        >
          Use it →
        </button>
      </div>

      <p className="text-center text-white/40 text-sm">
        {screen === "signin" ? "New here? " : "Already have an account? "}
        <button
          onClick={() => setScreen(screen === "signin" ? "signup" : "signin")}
          className="text-[#22C55E] font-semibold"
        >
          {screen === "signin" ? "Create account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
