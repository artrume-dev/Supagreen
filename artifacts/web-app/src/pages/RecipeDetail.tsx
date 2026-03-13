import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetTodayRecipes, 
  useSaveRecipe, 
  useDeleteSavedRecipe, 
  useGetSavedRecipes,
  useUpsertShoppingList,
  useUpdateStreak,
  getShoppingList,
  getGetShoppingListQueryKey
} from "@workspace/api-client-react";
import { getTodayStr, cn } from "@/lib/utils";
import { ArrowLeft, Heart, Clock, ChefHat, Star, CheckCircle2, Share, ShoppingCart, Info, Flame } from "lucide-react";
import { Spinner, FullPageLoader } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import type { RecipeObject } from "@workspace/api-client-react";

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex-1 bg-background/50 rounded-xl p-3 border border-white/5">
      <div className="text-center mb-2">
        <span className="text-white font-black text-lg font-display">{value}g</span>
        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-0.5">{label}</p>
      </div>
      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export function RecipeDetail() {
  const [, params] = useRoute("/app/recipe/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;
  const today = getTodayStr();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todayData, isLoading: todayLoading } = useGetTodayRecipes({ date: today });
  const { data: savedData, isLoading: savedLoading } = useGetSavedRecipes();
  
  const { mutateAsync: saveRecipe, isPending: isSaving } = useSaveRecipe();
  const { mutateAsync: unsaveRecipe, isPending: isUnsaving } = useDeleteSavedRecipe();
  const { mutateAsync: addToShopping, isPending: isAddingToShopping } = useUpsertShoppingList();
  const { mutateAsync: updateStreak, isPending: isUpdatingStreak } = useUpdateStreak();

  const [recipe, setRecipe] = useState<RecipeObject | null>(null);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!id) return;
    
    // Check today's recipes
    const todayItem = todayData?.recipes.find(r => r.id === id);
    if (todayItem) {
      setRecipe(todayItem.recipe);
    } else {
      // Check saved recipes
      const savedItem = savedData?.recipes.find(r => r.id === id);
      if (savedItem) {
        setRecipe(savedItem.recipe);
      }
    }

    // Check if it's currently saved (by matching title as a simple heuristic since IDs differ between daily and saved tables)
    if (recipe && savedData) {
      const match = savedData.recipes.find(r => r.recipe.title === recipe.title);
      setSavedRecipeId(match?.id || null);
    }

  }, [id, todayData, savedData, recipe]);

  if (todayLoading || savedLoading) return <FullPageLoader />;
  
  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4 border border-white/5">
          <ChefHat className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Recipe not found</h2>
        <p className="text-muted-foreground text-sm mb-6">This recipe may have been regenerated or removed.</p>
        <button onClick={() => setLocation("/app")} className="bg-primary text-white font-bold py-3 px-8 rounded-2xl">
          Back to Home
        </button>
      </div>
    );
  }

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

  const handleSaveToggle = async () => {
    try {
      if (savedRecipeId) {
        await unsaveRecipe({ id: savedRecipeId });
        setSavedRecipeId(null);
        toast({ title: "Removed from saved recipes" });
      } else {
        const result = await saveRecipe({ data: { recipeJson: recipe } });
        setSavedRecipeId(result.id);
        toast({ title: "Saved to favorites ❤️" });
      }
    } catch (e) {
      toast({ title: "Error saving recipe", variant: "destructive" });
    }
  };

  const handleAddShoppingList = async () => {
    try {
      const newItems = (recipe.ingredients || []).map(ing => ({
        name: ing.name || 'Unknown',
        amount: ing.amount || '1',
        unit: ing.unit || '',
        category: 'Grocery',
      }));

      let existingItems: typeof newItems = [];
      try {
        const existing = await getShoppingList({ date: today });
        existingItems = (existing.items || []).map(i => ({
          name: i.name,
          amount: i.amount,
          unit: i.unit || '',
          category: i.category || 'Grocery',
        }));
      } catch {
        // No existing list is fine
      }

      const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));
      const merged = [
        ...existingItems,
        ...newItems.filter(i => !existingNames.has(i.name.toLowerCase())),
      ];

      await addToShopping({ data: { date: today, items: merged } });
      queryClient.invalidateQueries({ queryKey: getGetShoppingListQueryKey({ date: today }) });
      toast({ title: "Added to Shopping List 🛒", description: "You can view it in the Shop tab." });
    } catch (e) {
      toast({ title: "Error adding to list", variant: "destructive" });
    }
  };

  const handleLogMeal = async () => {
    if (!id) return;
    try {
      await updateStreak({ data: { recipeId: id } });
      toast({ title: "Meal Logged! 🍳", description: "Your streak has been updated." });
    } catch(e) {
      toast({ title: "Already logged", description: "You can only log a meal once.", variant: "destructive" });
    }
  }

  const fallbackImg = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80";

  return (
    <div className="min-h-screen bg-background font-sans max-w-[420px] mx-auto flex flex-col relative">
      {/* Hero */}
      <div className="relative h-72 flex-shrink-0">
        <img
          src={recipe.imageUrl || fallbackImg}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90" />
        
        <div className="absolute top-4 left-4 z-10">
          <button onClick={() => setLocation("/app")} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={handleSaveToggle}
            disabled={isSaving || isUnsaving}
            className={cn(
              "w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/10",
              savedRecipeId ? "bg-primary/20 text-primary border-primary/50" : "bg-black/40 text-white hover:bg-black/60"
            )}
          >
            {(isSaving || isUnsaving) ? <Spinner className="w-4 h-4" /> : <Heart className="w-5 h-5" fill={savedRecipeId ? "currentColor" : "none"} />}
          </button>
        </div>
        
        <div className="absolute bottom-4 left-6 right-6">
          <div className="flex gap-2 mb-3">
            {recipe.meal && (
              <span className="bg-primary/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg capitalize shadow-lg">
                {recipe.meal}
              </span>
            )}
            <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-white/10">
              <Clock className="w-3 h-3" /> {recipe.prepTime} min
            </span>
          </div>
          <h1 className="text-white font-extrabold text-2xl leading-tight font-display drop-shadow-lg">
            {recipe.emoji} {recipe.title}
          </h1>
        </div>
      </div>

      <div className="flex-1 bg-background -mt-4 relative z-20 rounded-t-3xl pt-6 pb-32 px-6">
        
        {/* Goal alignment banner */}
        {recipe.goalAlignment && (
          <div className="mb-6 bg-gradient-to-r from-accent/20 to-transparent border border-accent/30 rounded-2xl p-4 flex gap-3 items-start">
            <div className="bg-accent/20 p-2 rounded-xl text-accent"><Flame className="w-5 h-5" /></div>
            <div>
              <p className="text-accent text-xs font-extrabold uppercase tracking-wider mb-1">Goal Alignment</p>
              <p className="text-white/90 text-sm leading-relaxed">{recipe.goalAlignment}</p>
            </div>
          </div>
        )}

        {/* Health Score & Servings */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary text-primary-foreground font-black text-xl px-4 py-2 rounded-xl shadow-lg shadow-primary/20 border border-primary-foreground/10 flex items-center gap-1">
            <Star className="w-5 h-5" fill="currentColor" /> {recipe.healthScore}
          </div>
          <div>
            <p className="text-white font-bold">Excellent nutritional score</p>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <ChefHat className="w-4 h-4" /> {recipe.servings} servings
            </p>
          </div>
        </div>

        {/* Macros */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg font-display">Macros per serving</h2>
            <div className="text-right">
              <span className="text-white font-black text-xl font-display">{recipe.macros?.calories || 0}</span>
              <span className="text-muted-foreground text-sm ml-1">kcal</span>
            </div>
          </div>
          <div className="flex gap-3">
            <MacroBar label="Protein" value={recipe.macros?.protein || 0} max={60} color="var(--color-primary)" />
            <MacroBar label="Carbs" value={recipe.macros?.carbs || 0} max={100} color="var(--color-accent)" />
            <MacroBar label="Fat" value={recipe.macros?.fat || 0} max={60} color="#60A5FA" />
          </div>
        </div>

        {/* Ingredients */}
        <div className="mb-8">
          <h2 className="text-white font-bold text-lg font-display mb-4">Ingredients</h2>
          <div className="space-y-2">
            {recipe.ingredients?.map((ing, i) => (
              <button
                key={i}
                onClick={() => toggleIngredient(i)}
                className={cn(
                  "w-full flex items-center gap-4 bg-card rounded-2xl px-4 py-3.5 transition-all border border-transparent",
                  checkedIngredients.has(i) ? "opacity-50 bg-card/50" : "hover:border-white/5"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  checkedIngredients.has(i) ? "bg-primary border-primary" : "border-white/20"
                )}>
                  {checkedIngredients.has(i) && <CheckCircle2 className="w-4 h-4 text-background" />}
                </div>
                <div className="flex-1 text-left">
                  <span className={cn("text-base font-medium", checkedIngredients.has(i) ? "line-through text-muted-foreground" : "text-white")}>
                    {ing.name}
                  </span>
                  {ing.isKeyIngredient && <span className="ml-2 text-primary text-xs font-bold uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">Key</span>}
                </div>
                <span className="text-muted-foreground font-semibold text-sm">{ing.amount} {ing.unit}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="mb-8">
          <h2 className="text-white font-bold text-lg font-display mb-4">Method</h2>
          <div className="space-y-3">
            {recipe.steps?.map((stepStr, i) => (
              <button
                key={i}
                onClick={() => toggleStep(i)}
                className={cn(
                  "w-full flex gap-4 bg-card rounded-2xl p-4 text-left transition-all border border-transparent",
                  completedSteps.has(i) ? "opacity-50 bg-card/50" : "hover:border-white/5"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 transition-colors",
                  completedSteps.has(i) ? "bg-primary text-background" : "bg-white/5 text-muted-foreground"
                )}>
                  {completedSteps.has(i) ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <p className={cn(
                  "text-base leading-relaxed pt-0.5", 
                  completedSteps.has(i) ? "line-through text-muted-foreground" : "text-white/90"
                )}>
                  {stepStr}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Health benefits */}
        {recipe.healthBenefits && recipe.healthBenefits.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg font-display mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" /> Health Benefits
            </h2>
            <div className="flex flex-col gap-2">
              {recipe.healthBenefits.map((b, i) => (
                <div key={i} className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3 flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-primary/90 text-sm font-medium leading-relaxed">{b}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Swap suggestion */}
        {recipe.swapSuggestion && (
          <div className="mb-4 bg-accent/5 border border-accent/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
            <p className="text-accent text-xs font-extrabold tracking-wider uppercase mb-2">💡 Smart Swap</p>
            <p className="text-white/80 text-sm leading-relaxed relative z-10">{recipe.swapSuggestion}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-background/80 backdrop-blur-2xl border-t border-white/5 px-6 py-4 pb-safe flex gap-3 z-50">
        <button 
          onClick={handleAddShoppingList}
          disabled={isAddingToShopping}
          className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {isAddingToShopping ? <Spinner className="text-white w-5 h-5" /> : <><ShoppingCart className="w-5 h-5" /> Add to List</>}
        </button>
        <button 
          onClick={handleLogMeal}
          disabled={isUpdatingStreak}
          className="w-14 h-14 bg-card border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/5 transition-colors flex-shrink-0"
        >
          {isUpdatingStreak ? <Spinner /> : <Flame className="w-6 h-6 text-accent" />}
        </button>
      </div>
    </div>
  );
}
