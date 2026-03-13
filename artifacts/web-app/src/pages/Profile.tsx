import { useState } from "react";
import { Link } from "wouter";
import { useGetProfile, useGetStreak, useGetSavedRecipes } from "@workspace/api-client-react";
import { Settings, Flame, Trophy, Utensils, Heart, Activity, Share } from "lucide-react";
import { FullPageLoader } from "@/components/ui/spinner";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

// Mock data since we don't have a historical macros endpoint
const weekData = [
  { day: "M", calories: 1820, protein: 95 },
  { day: "T", calories: 2050, protein: 112 },
  { day: "W", calories: 1950, protein: 105 },
  { day: "T", calories: 2100, protein: 120 },
  { day: "F", calories: 1780, protein: 88 },
  { day: "S", calories: 2200, protein: 130 },
  { day: "S", calories: 1900, protein: 98 },
];

const milestones = [
  { days: 3, label: "Sprout", achieved: true },
  { days: 7, label: "On Fire", achieved: true },
  { days: 14, label: "Charged", achieved: true },
  { days: 30, label: "Champion", achieved: false },
];

export function Profile() {
  const [activeTab, setActiveTab] = useState<"week" | "saved">("week");
  const { data: profileData, isLoading: profileLoading } = useGetProfile();
  const { data: streakData, isLoading: streakLoading } = useGetStreak();
  const { data: savedData, isLoading: savedLoading } = useGetSavedRecipes();

  if (profileLoading || streakLoading || savedLoading) return <FullPageLoader />;

  const user = profileData?.profile;
  const streak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;
  const savedList = savedData?.recipes || [];

  return (
    <div className="pt-8 pb-10">
      {/* Header */}
      <div className="px-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-white font-extrabold text-3xl font-display">Profile</h1>
            <p className="text-primary text-sm font-semibold tracking-wide uppercase mt-1">
              {user?.healthGoal?.replace('-', ' ')} · {user?.dietType}
            </p>
          </div>
          <button className="w-12 h-12 bg-card border border-white/5 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Streak Hero Card */}
        <div className="relative bg-gradient-to-br from-card to-background border border-white/10 rounded-[32px] p-6 shadow-2xl overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center text-white shadow-xl shadow-primary/20 border border-white/10">
                <span className="font-display font-black text-3xl">{(user?.userId || "A").charAt(0).toUpperCase()}</span>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg border-2 border-card shadow-lg whitespace-nowrap">
                Level {Math.floor(streak / 5) + 1}
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-8 h-8 text-accent fill-accent" />
                <div className="flex items-baseline gap-1">
                  <span className="text-white font-black text-4xl font-display leading-none">{streak}</span>
                  <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Day Streak</span>
                </div>
              </div>
              <p className="text-white/60 text-sm font-medium mb-3">Longest: {longestStreak} days</p>
              
              {/* Mini activity grid */}
              <div className="flex gap-1.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 h-3 rounded-sm", 
                      i < Math.min(streak, 10) ? "bg-primary" : "bg-white/5"
                    )} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex gap-4 px-6 mb-8">
        {[
          { label: "Meals Logged", value: streak * 3, icon: Utensils, color: "text-blue-400" },
          { label: "Saved Recipes", value: savedList.length, icon: Heart, color: "text-rose-400" },
          { label: "Daily Goal", value: `${user?.caloriesTarget || 2000}`, icon: Activity, color: "text-primary" },
        ].map((stat, i) => (
          <div key={i} className="flex-1 bg-card border border-white/5 rounded-3xl p-4 text-center">
            <stat.icon className={cn("w-6 h-6 mx-auto mb-2", stat.color)} />
            <p className="text-white font-black text-xl font-display">{stat.value}</p>
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-6 mb-6">
        <div className="flex p-1 bg-card rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab("week")}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              activeTab === "week" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-muted-foreground hover:text-white"
            )}
          >
            Weekly Macros
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
              activeTab === "saved" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-muted-foreground hover:text-white"
            )}
          >
            Saved Recipes
          </button>
        </div>
      </div>

      {activeTab === "week" ? (
        <div className="px-6">
          <div className="bg-card border border-white/5 rounded-3xl p-6 mb-6 shadow-xl">
            <h3 className="text-white font-bold font-display mb-6">Calorie Intake (7 Days)</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    contentStyle={{ backgroundColor: '#1C2B1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]} fill="var(--color-primary)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 }} dy={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
              <div className="text-center">
                <p className="text-white font-black text-xl font-display">1,971</p>
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Avg Kcal</p>
              </div>
              <div className="text-center">
                <p className="text-white font-black text-xl font-display">107g</p>
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Avg Protein</p>
              </div>
              <div className="text-center">
                <p className="text-primary font-black text-xl font-display">↑ 12%</p>
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Vs Last Week</p>
              </div>
            </div>
          </div>

          <button className="w-full bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-2xl px-5 py-4 flex items-center gap-4 transition-colors group">
            <div className="bg-accent/20 p-3 rounded-xl text-accent group-hover:scale-110 transition-transform">
              <Share className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold font-display">Share my week</p>
              <p className="text-muted-foreground text-sm">Create a TikTok-ready summary card</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="px-6 space-y-4">
          {savedList.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Heart className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-white font-bold text-lg">No saved recipes</p>
              <p className="text-muted-foreground text-sm">Recipes you favorite will appear here.</p>
            </div>
          ) : (
            savedList.map((item) => (
              <Link key={item.id} href={`/app/recipe/${item.id}`} className="flex items-center gap-4 bg-card hover:bg-card/80 border border-white/5 rounded-3xl p-3 transition-colors cursor-pointer group">
                <img 
                  src={item.recipe.imageUrl || "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=200&q=80"} 
                  alt={item.recipe.title} 
                  className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform" 
                />
                <div className="flex-1">
                  <p className="text-white font-bold font-display line-clamp-2 leading-tight">{item.recipe.emoji} {item.recipe.title}</p>
                  <p className="text-muted-foreground text-xs font-semibold mt-1 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-accent" /> {item.recipe.macros?.calories} kcal
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-2">
                  <Heart className="w-5 h-5 text-primary" fill="currentColor" />
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
