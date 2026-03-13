import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Landing } from "@/pages/Landing";
import { Onboarding } from "@/pages/Onboarding";
import { Home } from "@/pages/Home";
import { RecipeDetail } from "@/pages/RecipeDetail";
import { Shopping } from "@/pages/Shopping";
import { Profile } from "@/pages/Profile";
import { AppLayout } from "@/components/layout/AppLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ProtectedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/app/onboarding" component={Onboarding} />
        <Route path="/app" component={Home} />
        <Route path="/app/recipe/:id" component={RecipeDetail} />
        <Route path="/app/shopping" component={Shopping} />
        <Route path="/app/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/app" component={ProtectedRoutes} />
      <Route path="/app/:rest*" component={ProtectedRoutes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
