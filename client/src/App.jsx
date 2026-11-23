import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
import { isMsimamiziHost, isLocalDevHost } from "@/admin/utils/msimamiziMode";
const AdminLogin = lazy(() => import("@/admin/pages/AdminLogin"));
const AdminLayout = lazy(() => import("@/admin/layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("@/admin/pages/AdminDashboard"));
const AdminUsers = lazy(() => import("@/admin/pages/AdminUsers"));
const AdminProperties = lazy(() => import("@/admin/pages/AdminProperties"));
const AdminTenants = lazy(() => import("@/admin/pages/AdminTenants"));
const AdminPayments = lazy(() => import("@/admin/pages/AdminPayments"));
const AdminSubscriptions = lazy(() => import("@/admin/pages/AdminSubscriptions"));
const AdminReports = lazy(() => import("@/admin/pages/AdminReports"));
const AdminSupport = lazy(() => import("@/admin/pages/AdminSupport"));
const AdminSettings = lazy(() => import("@/admin/pages/AdminSettings"));
const AdminActivityLogs = lazy(() => import("@/admin/pages/AdminActivityLogs"));

function AdminRoute({ component: Component }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f4f6fa] dark:bg-slate-950 text-slate-600 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#00a99d]" />
          <p className="text-sm font-medium">Loading Msimamizi module...</p>
        </div>
      }
    >
      <AdminLayout>
        <ErrorBoundary>
          <Component />
        </ErrorBoundary>
      </AdminLayout>
    </Suspense>
  );
}

function AdminLoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f6fa] dark:bg-slate-950">
          <Loader2 className="w-7 h-7 animate-spin text-[#00a99d]" />
        </div>
      }
    >
      <ErrorBoundary>
        <AdminLogin />
      </ErrorBoundary>
    </Suspense>
  );
}

function renderMsimamiziRoutes(prefix = "") {
  const p = (sub) => {
    if (!prefix) return sub;
    return sub === "/" ? prefix : `${prefix}${sub}`;
  };
  return [
    <Route key={`${prefix}-login`} path={p("/login")} component={AdminLoginRoute} />,
    <Route key={`${prefix}-home`} path={p("/")}>{() => <AdminRoute component={AdminDashboard} />}</Route>,
    <Route key={`${prefix}-users`} path={p("/users")}>{() => <AdminRoute component={AdminUsers} />}</Route>,
    <Route key={`${prefix}-props`} path={p("/properties")}>{() => <AdminRoute component={AdminProperties} />}</Route>,
    <Route key={`${prefix}-tenants`} path={p("/tenants")}>{() => <AdminRoute component={AdminTenants} />}</Route>,
    <Route key={`${prefix}-payments`} path={p("/payments")}>{() => <AdminRoute component={AdminPayments} />}</Route>,
    <Route key={`${prefix}-subs`} path={p("/subscriptions")}>{() => <AdminRoute component={AdminSubscriptions} />}</Route>,
    <Route key={`${prefix}-reports`} path={p("/reports")}>{() => <AdminRoute component={AdminReports} />}</Route>,
    <Route key={`${prefix}-support`} path={p("/support")}>{() => <AdminRoute component={AdminSupport} />}</Route>,
    <Route key={`${prefix}-settings`} path={p("/settings")}>{() => <AdminRoute component={AdminSettings} />}</Route>,
    <Route key={`${prefix}-activity`} path={p("/activity")}>{() => <AdminRoute component={AdminActivityLogs} />}</Route>
  ];
}

function PrivateRoute({ component: Component, ...rest }) {
    const { user, isLoading } = useAuth();
    const [location] = useLocation();

    const isSuperAdmin = Boolean(user?.isSuperAdmin || user?.role === "superadmin");
    const { data: subState } = useQuery({
      queryKey: ["my-subscription"],
      queryFn: api.getMySubscription,
      enabled: Boolean(user && user.hasCompletedOnboarding !== false && !isSuperAdmin && user.role !== "tenant"),
      staleTime: 60_000,
      retry: false
    });

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

    // Lock system after 14-day trial / subscription expires until paid in Billing
    if (subState?.isLocked && !location.startsWith("/billing")) {
      return <Redirect to="/billing" />;
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
    if (isMsimamiziHost()) {
      return (
        <Switch>
          {renderMsimamiziRoutes("")}
          <Route>{() => <Redirect to="/" />}</Route>
        </Switch>
      );
    }

    return (<Switch>
      {/* Local dev mount for standalone msimamizi testing */}
      {isLocalDevHost() && renderMsimamiziRoutes("/msimamizi")}

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

      <Route component={NotFound}/>
    </Switch>);
}
function App() {
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
