import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Lock, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { useUpdateProfile } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "diet",
    title: "What's your diet?",
    subtitle: "We'll personalise your recipes around your lifestyle",
    type: "single",
    options: [
      { value: "vegan", label: "Vegan", emoji: "🌱" },
      { value: "vegetarian", label: "Vegetarian", emoji: "🥦" },
      { value: "pescatarian", label: "Pescatarian", emoji: "🐟" },
      { value: "flexitarian", label: "Flexitarian", emoji: "🍽" },
      { value: "omnivore", label: "Omnivore", emoji: "🥩" },
      { value: "keto", label: "Keto", emoji: "🥑" },
      { value: "paleo", label: "Paleo", emoji: "🍖" },
      { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
    ],
  },
  {
    id: "allergies",
    title: "Any allergies?",
    subtitle: "Select all that apply — we'll always keep you safe",
    type: "multi",
    options: [
      { value: "gluten", label: "Gluten", emoji: "🌾" },
      { value: "dairy", label: "Dairy", emoji: "🥛" },
      { value: "nuts", label: "Nuts", emoji: "🥜" },
      { value: "soy", label: "Soy", emoji: "🫘" },
      { value: "eggs", label: "Eggs", emoji: "🥚" },
      { value: "shellfish", label: "Shellfish", emoji: "🦐" },
      { value: "nightshades", label: "Nightshades", emoji: "🍅" },
      { value: "none", label: "None", emoji: "✅" },
    ],
  },
  {
    id: "goal",
    title: "What's your goal?",
    subtitle: "Your AI chef will prioritise foods that support this",
    type: "single",
    options: [
      { value: "fat-loss", label: "Lose body fat", emoji: "🔥" },
      { value: "muscle", label: "Build muscle", emoji: "💪" },
      { value: "gut", label: "Improve gut health", emoji: "🌿" },
      { value: "energy", label: "Boost energy", emoji: "⚡" },
      { value: "inflammation", label: "Reduce inflammation", emoji: "🧊" },
      { value: "wellness", label: "General wellness", emoji: "✨" },
    ],
  },
  {
    id: "skill",
    title: "Cooking skill?",
    subtitle: "Recipes will be tailored to fit your available time",
    type: "single",
    options: [
      { value: "beginner", label: "Beginner", emoji: "🟢", sub: "Under 20 min" },
      { value: "intermediate", label: "Intermediate", emoji: "🟡", sub: "20–40 min" },
      { value: "advanced", label: "Advanced", emoji: "🔴", sub: "40+ min" },
    ],
  },
  {
    id: "location",
    title: "Almost done!",
    subtitle: "Allow location to find seasonal ingredients & nearby stores",
    type: "location",
  },
];

export function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentIdx, setCurrentIdx] = useState(0);
  
  const [dietType, setDietType] = useState<string>("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [healthGoal, setHealthGoal] = useState<string>("");
  const [skillLevel, setSkillLevel] = useState<string>("");
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);

  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const step = STEPS[currentIdx];
  const progress = ((currentIdx + 1) / STEPS.length) * 100;

  const isSelected = (value: string) => {
    if (step.id === "diet") return dietType === value;
    if (step.id === "allergies") return allergies.includes(value);
    if (step.id === "goal") return healthGoal === value;
    if (step.id === "skill") return skillLevel === value;
    return false;
  };

  const toggle = (value: string) => {
    if (step.id === "diet") setDietType(value);
    if (step.id === "allergies") {
      if (value === "none") {
        setAllergies(["none"]);
      } else {
        const next = allergies.includes(value) 
          ? allergies.filter(v => v !== value) 
          : [...allergies.filter(v => v !== "none"), value];
        setAllergies(next);
      }
    }
    if (step.id === "goal") setHealthGoal(value);
    if (step.id === "skill") setSkillLevel(value);
  };

  const canNext = () => {
    if (step.id === "diet") return !!dietType;
    if (step.id === "allergies") return allergies.length > 0;
    if (step.id === "goal") return !!healthGoal;
    if (step.id === "skill") return !!skillLevel;
    return true; // Location is optional
  };

  const handleNext = async () => {
    if (currentIdx < STEPS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async (coords = locationCoords) => {
    try {
      await updateProfile({
        data: {
          dietType,
          allergies: allergies.includes("none") ? [] : allergies,
          healthGoal,
          skillLevel,
          lat: coords?.lat,
          lng: coords?.lng,
        }
      });
      setLocation("/app");
    } catch (e) {
      console.error("Failed to update profile", e);
    }
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setLocationCoords(coords);
          finishOnboarding(coords);
        },
        () => {
          finishOnboarding(); // Proceed without location if denied
        }
      );
    } else {
      finishOnboarding();
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans max-w-[420px] mx-auto flex flex-col px-6 py-8 relative shadow-2xl shadow-black">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-black text-sm">N</div>
        <span className="text-white font-bold text-lg font-display tracking-tight">NutriSnap</span>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-muted-foreground mb-2 font-medium">
          <span>Step {currentIdx + 1} of {STEPS.length}</span>
          <span className="text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <h2 className="text-white font-bold text-3xl mb-3 font-display">{step.title}</h2>
          <p className="text-muted-foreground text-base mb-8 leading-relaxed">{step.subtitle}</p>

          {step.type === "location" ? (
            <div className="flex-1 flex flex-col">
              <div className="bg-card rounded-[32px] p-8 text-center mb-4 border border-white/5 shadow-xl">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-white font-bold text-xl mb-3 font-display">Enable Location</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We use your location to find seasonal ingredients and check availability at nearby stores like Whole Foods and Trader Joe's.
                </p>
              </div>
              <div className="bg-card rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Privacy first</p>
                  <p className="text-muted-foreground text-xs">Location is used locally only</p>
                </div>
              </div>
              <div className="flex-1" />
              <div className="space-y-4 mt-8">
                <button
                  onClick={requestLocation}
                  disabled={isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                >
                  {isPending ? <Spinner className="text-white" /> : <><MapPin className="w-5 h-5" /> Allow Location</>}
                </button>
                <button 
                  onClick={() => finishOnboarding()}
                  disabled={isPending}
                  className="w-full text-muted-foreground hover:text-white text-sm py-2 transition-colors font-medium"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className={cn(
                "grid gap-3",
                step.options && step.options.length <= 4 ? "grid-cols-1" : "grid-cols-2"
              )}>
                {step.options?.map((opt) => {
                  const selected = isSelected(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all text-left",
                        selected
                          ? "bg-primary/10 border-primary text-white shadow-lg shadow-primary/10"
                          : "bg-card border-transparent text-white/80 hover:bg-card/80"
                      )}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <p className={cn("font-semibold text-sm", selected ? "text-white" : "text-white/80")}>{opt.label}</p>
                        {"sub" in opt && opt.sub && <p className="text-xs text-muted-foreground mt-0.5">{opt.sub as string}</p>}
                      </div>
                      {selected && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1" />

              <div className="flex gap-3 mt-8 pb-4">
                {currentIdx > 0 && (
                  <button
                    onClick={() => setCurrentIdx(currentIdx - 1)}
                    className="w-14 h-14 bg-card hover:bg-white/10 rounded-2xl flex items-center justify-center text-muted-foreground transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={!canNext()}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2",
                    canNext()
                      ? "bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5"
                      : "bg-white/5 text-white/30 cursor-not-allowed"
                  )}
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
