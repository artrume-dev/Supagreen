import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin h-5 w-5 text-primary", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-black text-sm">N</div>
        </div>
        <Spinner className="absolute -bottom-8 left-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}
