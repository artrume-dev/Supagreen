import { useState, useMemo } from "react";
import { 
  useGetShoppingList, 
  useToggleShoppingItem, 
  useGetNearbyStores,
  useGetProfile
} from "@workspace/api-client-react";
import { getTodayStr, cn } from "@/lib/utils";
import { MapPin, Navigation, Share, CheckCircle2, Circle, ShoppingCart } from "lucide-react";
import { FullPageLoader } from "@/components/ui/spinner";

export function Shopping() {
  const today = getTodayStr();
  const { data: profileData } = useGetProfile();
  
  const { data: listData, isLoading: listLoading, refetch: refetchList } = useGetShoppingList({ date: today });
  const { mutateAsync: toggleItem } = useToggleShoppingItem();
  
  // Use profile coordinates if available, otherwise default to a major city for demo purposes
  const lat = profileData?.profile?.lat || 40.7128;
  const lng = profileData?.profile?.lng || -74.0060;
  
  const { data: storesData, isLoading: storesLoading } = useGetNearbyStores({ 
    lat, lng, radius: 5000 
  });

  const [activeStore, setActiveStore] = useState(0);

  const items = listData?.items || [];
  
  // Group items by category
  const sections = useMemo(() => {
    const map = new Map<string, typeof items>();
    items.forEach(item => {
      const cat = item.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries()).map(([section, items]) => ({ section, items }));
  }, [items]);

  if (listLoading) return <FullPageLoader />;

  const totalItems = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const progress = totalItems === 0 ? 0 : (checkedCount / totalItems) * 100;

  const handleToggle = async (itemName: string, checked: boolean) => {
    await toggleItem({ data: { date: today, itemName, checked: !checked } });
    refetchList();
  };

  return (
    <div className="pt-8 pb-10">
      {/* Header */}
      <div className="px-6 pb-6 bg-background/95 backdrop-blur-xl sticky top-0 z-40 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-white font-extrabold text-3xl font-display">Shopping</h1>
          <button className="text-primary bg-primary/10 p-2 rounded-xl">
            <Share className="w-5 h-5" />
          </button>
        </div>
        <p className="text-muted-foreground text-sm font-medium">
          <strong className="text-white">{checkedCount}</strong> of {totalItems} items checked · Today
        </p>

        {/* Progress */}
        <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Nearby stores */}
      {!storesLoading && storesData && storesData.stores.length > 0 && (
        <div className="px-6 py-6 border-b border-white/5 bg-card/30">
          <h2 className="text-white font-bold text-lg font-display mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" /> Nearby Stores
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {storesData.stores.map((store, i) => (
              <button
                key={i}
                onClick={() => setActiveStore(i)}
                className={cn(
                  "snap-center flex-shrink-0 rounded-3xl p-4 transition-all text-left w-56 border-2",
                  activeStore === i 
                    ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" 
                    : "bg-card border-transparent hover:border-white/10"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-bold text-base leading-tight font-display mb-1 truncate">{store.name}</p>
                    <p className="text-muted-foreground text-xs">{store.distance.toFixed(1)} mi away</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-bold uppercase tracking-wider", store.openNow ? "text-primary" : "text-muted-foreground")}>
                    {store.openNow ? "Open Now" : "Closed"}
                  </span>
                  {store.rating && <span className="text-white text-xs font-bold bg-white/10 px-2 py-1 rounded-md">★ {store.rating}</span>}
                </div>
              </button>
            ))}
          </div>
          
          {storesData.stores[activeStore] && (
            <a 
              href={storesData.stores[activeStore].mapsLink} 
              target="_blank" rel="noreferrer"
              className="mt-2 w-full bg-card hover:bg-white/5 border border-white/10 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              <Navigation className="w-4 h-4 text-primary" /> Navigate to {storesData.stores[activeStore].name}
            </a>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="py-6">
        {sections.length === 0 ? (
          <div className="px-6 text-center py-12">
            <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-white font-bold text-lg">List is empty</p>
            <p className="text-muted-foreground text-sm">Your ingredients will appear here.</p>
          </div>
        ) : (
          sections.map((section, sIdx) => (
            <div key={sIdx} className="px-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/90 text-lg font-bold font-display">{section.section}</h3>
                <span className="text-muted-foreground bg-card px-2 py-1 rounded-md text-xs font-bold">
                  {section.items.filter((i) => i.checked).length}/{section.items.length}
                </span>
              </div>
              <div className="space-y-3">
                {section.items.map((item, iIdx) => (
                  <button
                    key={iIdx}
                    onClick={() => handleToggle(item.name, item.checked || false)}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-2xl px-5 py-4 transition-all text-left border",
                      item.checked 
                        ? "bg-card/40 border-transparent opacity-60" 
                        : "bg-card border-white/5 hover:border-white/10 shadow-sm"
                    )}
                  >
                    <div className="flex-shrink-0">
                      {item.checked ? (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      ) : (
                        <Circle className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-base font-semibold transition-colors", item.checked ? "line-through text-muted-foreground" : "text-white")}>
                        {item.name}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-sm font-bold bg-background px-3 py-1 rounded-lg">
                      {item.amount} {item.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
