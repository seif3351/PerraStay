import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Search from "@/pages/search";
import PropertyDetail from "@/pages/property-detail";
import HostDashboard from "@/pages/host-dashboard";
import GuestDashboard from "@/pages/guest-dashboard";
import AddProperty from "@/pages/add-property";
import BookingDetail from "@/pages/booking-detail";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AuthPage from "./pages/auth";
import VerifyEmail from "./pages/verify-email";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/booking/:id" component={BookingDetail} />
      <Route path="/host-dashboard" component={HostDashboard} />
      <Route path="/guest-dashboard" component={GuestDashboard} />
      <Route path="/add-property" component={AddProperty} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Header />
          <Router />
          <Footer />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
