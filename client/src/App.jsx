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
function PrivateRoute({ component: Component, ...rest }) {
    const { user, isLoading } = useAuth();

    if (isLoading)
        return null;

    if (!user) {
        return <Redirect to="/login" />;
    }
    
    return (<AppLayout>
      <Component />
    </AppLayout>);
}
function Router() {
    return (<Switch>
      <Route path="/login" component={LoginPage}/>
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <PrivateRoute component={Dashboard}/>}
      </Route>
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

      <Route component={NotFound}/>
    </Switch>);
}
function App() {
    return (<QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>);
}
export default App;
