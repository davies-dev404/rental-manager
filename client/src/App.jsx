import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/auth/Login";
import LandingPage from "@/pages/landing";
import FeaturesPage from "@/pages/public/FeaturesPage";
import PricingPage from "@/pages/public/PricingPage";
import FaqsPage from "@/pages/public/FaqsPage";
import LandlordPage from "@/pages/public/LandlordPage";
import PropertyManagersPage from "@/pages/public/PropertyManagersPage";
import AppLayout from "@/components/layout/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";
import { initMetaPixel, trackPageView } from "@/lib/metaPixel";
import Dashboard from "@/pages/dashboard";
import PropertiesPage from "@/pages/properties";
import { ThemeProvider } from "@/components/theme-provider";
import TenantsPage from "@/pages/tenants";
import PaymentsPageLegacy from "@/pages/payments";
import SettingsPage from "@/pages/settings";
import RemindersPage from "@/pages/reminders";
import ReportsPage from "@/pages/reports";
import ActivityLogsPage from "@/pages/activity-logs";
import DocumentsPage from "@/pages/documents";
import PrivacyPolicy from "@/pages/support/Privacy";
import TermsOfService from "@/pages/support/Terms";
import Support from "@/pages/support/Support";
import ExpensesPageLegacy from "@/pages/expenses";
import InvoicesPage from "@/pages/financials/InvoicesPage";
import PaymentsPage from "@/pages/financials/PaymentsPage";
import ExpensesPage from "@/pages/financials/ExpensesPage";
import UtilitiesPage from "@/pages/properties/UtilitiesPage";
import PropertyGroupingPage from "@/pages/properties/PropertyGroupingPage";
import MaintenancePage from "@/pages/properties/MaintenancePage";
import UnitsPage from "@/pages/properties/UnitsPage";
import StatementsPage from "@/pages/reports/StatementsPage";
import InsightsPage from "@/pages/reports/InsightsPage";
import BillingDashboardPage from "@/pages/billing";
import SuperAdminDashboardPage from "@/pages/super-admin";

function PrivateRoute({ component: Component, ...rest }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f4f6fa] dark:bg-slate-950 text-slate-600 dark:text-slate-300 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#2546e8]" />
          <p className="text-sm font-medium">Loading workspace...</p>
        </div>
      );
    }

    if (!user) {
        return <Redirect to="/login" />;
    }

    // Block full user interface until onboarding questions are answered
    if (user.hasCompletedOnboarding === false) {
      return (
        <ErrorBoundary>
          <OnboardingWizard
            onComplete={() => {
              queryClient.invalidateQueries();
            }}
          />
        </ErrorBoundary>
      );
    }
    
    return (
      <AppLayout>
        <ErrorBoundary>
          <Component />
        </ErrorBoundary>
      </AppLayout>
    );
}
function Router() {
    const [location] = useLocation();

    useEffect(() => {
      trackPageView(location);
    }, [location]);

    return (<Switch>
      {/* Public Marketing & Auth Pages */}
      <Route path="/" component={LandingPage}/>
      <Route path="/home" component={LandingPage}/>
      <Route path="/features" component={FeaturesPage}/>
      <Route path="/pricing" component={PricingPage}/>
      <Route path="/faqs" component={FaqsPage}/>
      <Route path="/landlord" component={LandlordPage}/>
      <Route path="/property-managers" component={PropertyManagersPage}/>
      <Route path="/login" component={LoginPage}/>
      <Route path="/signup" component={LoginPage}/>
      <Route path="/register" component={LoginPage}/>
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        {() => <PrivateRoute component={Dashboard}/>}
      </Route>
      <Route path="/financials/invoices">
        {() => <PrivateRoute component={InvoicesPage}/>}
      </Route>
      <Route path="/financials/payments">
        {() => <PrivateRoute component={PaymentsPage}/>}
      </Route>
      <Route path="/financials/expenses">
        {() => <PrivateRoute component={ExpensesPage}/>}
      </Route>
      <Route path="/properties">
        {() => <PrivateRoute component={PropertiesPage}/>}
      </Route>
      <Route path="/units">
        {() => <PrivateRoute component={UnitsPage}/>}
      </Route>
      <Route path="/utilities">
        {() => <PrivateRoute component={UtilitiesPage}/>}
      </Route>
      <Route path="/property-grouping">
        {() => <PrivateRoute component={PropertyGroupingPage}/>}
      </Route>
      <Route path="/maintenance">
        {() => <PrivateRoute component={MaintenancePage}/>}
      </Route>
      <Route path="/tenants">
        {() => <PrivateRoute component={TenantsPage}/>}
      </Route>
      <Route path="/payments">
        {() => <PrivateRoute component={PaymentsPageLegacy}/>}
      </Route>
      <Route path="/expenses">
        {() => <PrivateRoute component={ExpensesPageLegacy}/>}
      </Route>
      <Route path="/settings">
        {() => <PrivateRoute component={SettingsPage}/>}
      </Route>
      <Route path="/reminders">
        {() => <PrivateRoute component={RemindersPage}/>}
      </Route>
      <Route path="/activity-logs">
        {() => <PrivateRoute component={ActivityLogsPage}/>}
      </Route>
      <Route path="/reports">
        {() => <PrivateRoute component={StatementsPage}/>}
      </Route>
      <Route path="/reports/statements">
        {() => <PrivateRoute component={StatementsPage}/>}
      </Route>
      <Route path="/reports/insights">
        {() => <PrivateRoute component={InsightsPage}/>}
      </Route>
      <Route path="/activity-logs">
        {() => <PrivateRoute component={ActivityLogsPage}/>}
      </Route>
      <Route path="/documents">
        {() => <PrivateRoute component={DocumentsPage}/>}
      </Route>
      <Route path="/privacy" component={PrivacyPolicy}/>
      <Route path="/terms" component={TermsOfService}/>
      <Route path="/support">
        {() => <PrivateRoute component={Support}/>}
      </Route>
      <Route path="/billing">
        {() => <PrivateRoute component={BillingDashboardPage}/>}
      </Route>
      <Route path="/super-admin">
        {() => <PrivateRoute component={SuperAdminDashboardPage}/>}
      </Route>

      <Route component={NotFound}/>
    </Switch>);
}
function App() {
    useEffect(() => {
      initMetaPixel();
    }, []);

    return (<ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>);
}
export default App;
