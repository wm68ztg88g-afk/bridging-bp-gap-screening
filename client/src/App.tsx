import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import VolunteerHome from "@/pages/VolunteerHome";
import NewScreening from "@/pages/NewScreening";
import Admin from "@/pages/Admin";
import { StoreProvider } from "@/lib/store";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={VolunteerHome} />
      <Route path="/screening/new" component={NewScreening} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
