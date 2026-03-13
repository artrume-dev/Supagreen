import { useState } from "react";
import { Link } from "wouter";
import { useGetTodayRecipes, useGetStreak, useGetCurrentUser, useRegenerateRecipe } from "@workspace/api-client-react";
import { getTodayStr } from "@/lib/utils";
import { Flame, Clock, Sparkles, RefreshCw, ChefHat, CakeSlice } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { DailyRecipeItem } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

function MacroRing({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min(value / max, 1);
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="40" height="40" viewBox="0 0 40 40" className="drop-shadow-md">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
          className="transition-all duration-1000 ease-out"
        />
        <text x="20" y="24" textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{value}g</text>
      </svg>
      <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}

const MEAL_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, treat: 3 };

function sortRecipesByMealOrder(recipes: DailyRecipeItem[]): DailyRecipeItem[] {
  return [...recipes].sort((a, b) => (MEAL_ORDER[a.mealType] ?? 99) - (MEAL_ORDER[b.mealType] ?? 99));
}

function RecipeCard({ item, onRegenerate, isRegenerating }: { item: DailyRecipeItem, onRegenerate: () => void, isRegenerating: boolean }) {
  const recipe = item.recipe;
  const fallbackImg = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
  const isTreat = item.mealType === "treat";

  return (
    <div className={`relative rounded-[32px] overflow-hidden flex-shrink-0 w-[280px] sm:w-[300px] shadow-2xl shadow-black/50 border bg-card group ${isTreat ? "border-pink-500/30" : "border-white/5"}`}>
      <Link href={`/app/recipe/${item.id}`} className="block relative h-48 overflow-hidden cursor-pointer">
        <img 
          src={recipe.imageUrl || fallbackImg} 
          alt={recipe.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90" />
        
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full capitalize border shadow-lg flex items-center gap-1.5 ${isTreat ? "bg-pink-500/40 border-pink-400/30" : "bg-background/40 border-white/10"}`}>
            {isTreat && <CakeSlice className="w-3 h-3" />}
            {item.mealType}
          </span>
        </div>
        <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-lg shadow-primary/20">
          ★ {recipe.healthScore}
        </div>
        
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-white font-bold text-xl leading-tight mb-1.5 drop-shadow-lg font-display">
            {recipe.emoji} {recipe.title}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-white/90 text-xs font-medium flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm">
              <Clock className="w-3 h-3" /> {recipe.prepTime} min
            </span>
            <span className="bg-accent/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm">
              {recipe.goalAlignment?.split('—')[0] || "Optimized"}
            </span>
          </div>
        </div>
      </Link>
      
      <div className="px-5 py-4 flex items-center justify-between bg-card relative z-10 border-t border-white/5">
        <div className="flex gap-3">
          <MacroRing value={recipe.macros?.protein || 0} max={60} color="var(--color-primary)" label="Pro" />
          <MacroRing value={recipe.macros?.carbs || 0} max={100} color="var(--color-accent)" label="Carb" />
          <MacroRing value={recipe.macros?.fat || 0} max={60} color="#60A5FA" label="Fat" />
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-white font-black text-2xl font-display leading-none">{recipe.macros?.calories || 0}</span>
          <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mt-1">Kcal</span>
          <button 
            onClick={(e) => { e.preventDefault(); onRegenerate(); }}
            disabled={isRegenerating}
            className="mt-2 text-primary hover:text-primary-foreground hover:bg-primary px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            {isRegenerating ? <Spinner className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
            Swap
          </button>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const today = getTodayStr();
  const { data: user } = useGetCurrentUser();
  const { data: recipesData, isLoading: recipesLoading, refetch: refetchRecipes } = useGetTodayRecipes({ date: today });
  const { data: streakData } = useGetStreak();
  const { mutateAsync: regenerate, isPending: isRegenerating } = useRegenerateRecipe();
  const { toast } = useToast();
  
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null);

  const displayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  
  const recipesList = sortRecipesByMealOrder(recipesData?.recipes || []);
  const totalCals = recipesList.reduce((s, r) => s + (r.recipe.macros?.calories || 0), 0);
  const totalProtein = recipesList.reduce((s, r) => s + (r.recipe.macros?.protein || 0), 0);

  const handleRegenerate = async (mealType: string) => {
    setRegeneratingMeal(mealType);
    try {
      await regenerate({ data: { mealType, date: today } });
      await refetchRecipes();
      toast({ title: "Recipe swapped!", description: "NutriAI generated a new recipe for you." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "You may have reached your daily limit.";
      toast({ title: "Could not swap recipe", description: message, variant: "destructive" });
    } finally {
      setRegeneratingMeal(null);
    }
  };

  return (
    <div className="pt-8 pb-10">
      {/* Header */}
      <div className="px-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary text-sm font-semibold tracking-wide uppercase mb-1">{displayDate}</p>
            <h1 className="text-white text-3xl font-extrabold font-display leading-tight">
              Hello, {user?.user?.firstName || 'Chef'} 👋
            </h1>
          </div>
          <div className="flex flex-col items-center bg-card border border-white/5 rounded-2xl px-4 py-2.5 shadow-lg shadow-black/20">
            <Flame className="w-6 h-6 text-accent mb-0.5" fill="currentColor" />
            <span className="text-white font-bold text-sm">{streakData?.currentStreak || 0}</span>
            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Streak</span>
          </div>
        </div>

        {/* Daily summary pill */}
        <div className="mt-6 bg-gradient-to-br from-card to-background border border-white/5 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-bold font-display">Today's Nutrition</span>
            <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
              <ChefHat className="w-3 h-3" /> {recipesList.length} Meals Set
            </span>
          </div>
          <div className="flex gap-6 items-center">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-muted-foreground">Calories</span>
                <span className="text-white">{totalCals} <span className="text-muted-foreground">/ 2000</span></span>
              </div>
              <div className="h-2.5 bg-background rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full relative" 
                  style={{ width: `${Math.min((totalCals / 2000) * 100, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="text-right pl-4 border-l border-white/10">
              <p className="text-white font-black text-2xl font-display">{totalProtein}g</p>
              <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Protein</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recipes Section */}
      <div className="px-6 flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-xl font-display">Your Menu</h2>
        <Sparkles className="w-5 h-5 text-primary" />
      </div>

      {recipesLoading ? (
        <div className="px-6 flex gap-4 overflow-x-auto pb-8 pt-2 scrollbar-hide">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-[280px] h-[320px] bg-card/50 animate-pulse rounded-[32px] flex-shrink-0 border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="px-6 flex gap-4 overflow-x-auto pb-8 pt-2 scrollbar-hide snap-x">
          {recipesList.map((item) => (
            <div key={item.id} className="snap-center">
              <RecipeCard 
                item={item} 
                onRegenerate={() => handleRegenerate(item.mealType)}
                isRegenerating={regeneratingMeal === item.mealType}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
