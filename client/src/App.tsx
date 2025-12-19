import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/auth/Login";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard";
import PropertiesPage from "@/pages/properties";
import TenantsPage from "@/pages/tenants";
import PaymentsPage from "@/pages/payments";
import SettingsPage from "@/pages/settings";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // Or a loading spinner
  
  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <PrivateRoute component={Dashboard} />}
      </Route>
      <Route path="/properties">
        {() => <PrivateRoute component={PropertiesPage} />}
      </Route>
      <Route path="/tenants">
        {() => <PrivateRoute component={TenantsPage} />}
      </Route>
      <Route path="/payments">
        {() => <PrivateRoute component={PaymentsPage} />}
      </Route>
      <Route path="/settings">
        {() => <PrivateRoute component={SettingsPage} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
