import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Activity, MapPin, Zap } from "lucide-react";
import { useGetCurrentUser } from "@workspace/api-client-react";

export function Landing() {
  const { data: authData } = useGetCurrentUser();
  const isLoggedIn = !!authData?.user;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground overflow-hidden selection:bg-primary/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/20">N</div>
            <span className="font-display font-bold text-xl tracking-tight">NutriSnap</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link href="/app" className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95">
                Open App
              </Link>
            ) : (
              <>
                <a href="/api/login" className="hidden sm:block px-4 py-2 text-muted-foreground hover:text-white font-medium transition-colors">Log In</a>
                <a href="/api/login" className="px-6 py-2.5 bg-white text-black hover:bg-white/90 font-semibold rounded-xl transition-all active:scale-95">
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
              alt="Background" 
              className="w-full h-full object-cover opacity-40 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background to-background" />
          </div>
          
          <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div 
              className="flex-1 text-center lg:text-left"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold tracking-wide uppercase">AI-Powered Nutrition</span>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6">
                Eat exactly <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">what your body needs.</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Personalised healthy recipes generated daily. Tailored to your diet, allergies, goals, and the ingredients available at your local stores.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                {isLoggedIn ? (
                  <Link href="/app" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(34,197,94,0.5)] hover:shadow-[0_0_60px_-15px_rgba(34,197,94,0.6)] flex items-center justify-center gap-3 group text-lg">
                    Go to Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <a href="/api/login" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(34,197,94,0.5)] hover:shadow-[0_0_60px_-15px_rgba(34,197,94,0.6)] flex items-center justify-center gap-3 group text-lg">
                    Start Your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                )}
                <p className="text-sm text-muted-foreground sm:ml-4">No credit card required.</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex-1 relative w-full max-w-sm mx-auto"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            >
              <div className="absolute -inset-10 bg-primary/15 blur-[80px] rounded-full" />
              <div className="relative z-10">
                <img 
                  src={`${import.meta.env.BASE_URL}images/app-mockup.png`} 
                  alt="NutriSnap mobile app showing personalized recipe cards" 
                  className="w-full h-auto drop-shadow-[0_20px_60px_rgba(34,197,94,0.25)]"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-card/30 border-y border-white/5 relative z-10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Your personal AI chef takes care of the meal planning, so you can focus on the cooking and eating.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Activity, title: "Goal-Oriented", desc: "Recipes optimised for fat loss, muscle gain, or general wellness with exact macro breakdowns.", color: "text-accent", bg: "bg-accent/10" },
                { icon: MapPin, title: "Store Aware", desc: "We map ingredients to nearby grocery stores so you never have to hunt for obscure items.", color: "text-blue-400", bg: "bg-blue-400/10" },
                { icon: Zap, title: "Daily Generation", desc: "Get 3 fresh recipes every single day. Don't like one? Swap it out with a tap.", color: "text-primary", bg: "bg-primary/10" }
              ].map((feature, i) => (
                <div key={i} className="bg-card border border-white/5 rounded-3xl p-8 hover:-translate-y-1 transition-transform duration-300">
                  <div className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold font-display mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t border-white/5 py-12 text-center text-muted-foreground">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary font-black text-sm">N</div>
            <span className="font-display font-bold text-white">NutriSnap</span>
          </div>
          <p>© {new Date().getFullYear()} NutriSnap. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
