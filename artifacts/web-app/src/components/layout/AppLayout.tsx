import { Link, useLocation } from "wouter";
import { Home, ShoppingCart, User, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetCurrentUser, useGetProfile } from "@workspace/api-client-react";
import { FullPageLoader } from "../ui/spinner";
import { useEffect } from "react";

const NAV_ITEMS = [
  { id: "/app", icon: Home, label: "Home" },
  { id: "/app/shopping", icon: ShoppingCart, label: "Shop" },
  { id: "/app/profile", icon: User, label: "Profile" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: authData, isLoading: authLoading } = useGetCurrentUser();
  const { data: profileData, isLoading: profileLoading } = useGetProfile({
    query: { enabled: !!authData?.user }
  });

  useEffect(() => {
    if (!authLoading && !authData?.user) {
      setLocation("/");
      return;
    }
    
    if (!profileLoading && profileData && !profileData.profile?.dietType && location !== "/app/onboarding") {
      setLocation("/app/onboarding");
    }
  }, [authLoading, authData, profileLoading, profileData, location, setLocation]);

  if (authLoading || (authData?.user && profileLoading)) {
    return <FullPageLoader />;
  }

  if (!authData?.user) return null;

  // Don't show nav on onboarding or recipe detail pages
  const showNav = location === "/app" || location === "/app/shopping" || location === "/app/profile";

  return (
    <div className="min-h-screen bg-background font-sans max-w-[420px] mx-auto flex flex-col relative shadow-2xl shadow-black">
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 relative">
        {children}
      </main>

      {showNav && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-50">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none -top-10" />
          <nav className="relative glass-panel rounded-t-3xl px-6 py-4 flex justify-between items-center pb-safe">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.id;
              return (
                <Link key={item.id} href={item.id} className="relative group">
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "p-3 rounded-2xl transition-all duration-300",
                      isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"
                    )}>
                      <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
