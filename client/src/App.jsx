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
import PaymentsPage from "@/pages/payments";
import SettingsPage from "@/pages/settings";
import RemindersPage from "@/pages/reminders";
import ReportsPage from "@/pages/reports";
import ActivityLogsPage from "@/pages/activity-logs";
import DocumentsPage from "@/pages/documents";
import PrivacyPolicy from "@/pages/support/Privacy";
import TermsOfService from "@/pages/support/Terms";
import Support from "@/pages/support/Support";
import ExpensesPage from "@/pages/expenses";
function PrivateRoute({ component: Component, ...rest }) {
    const { user, isLoading } = useAuth();
    if (isLoading)
        return null;
    if (!user) {
        return <Redirect to="/login"/>;
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
      <Route path="/properties">
        {() => <PrivateRoute component={PropertiesPage}/>}
      </Route>
      <Route path="/tenants">
        {() => <PrivateRoute component={TenantsPage}/>}
      </Route>
      <Route path="/payments">
        {() => <PrivateRoute component={PaymentsPage}/>}
      </Route>
      <Route path="/expenses">
        {() => <PrivateRoute component={ExpensesPage}/>}
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
        {() => <PrivateRoute component={ReportsPage}/>}
      </Route>
      <Route path="/activity-logs">
        {() => <PrivateRoute component={ActivityLogsPage}/>}
      </Route>
      <Route path="/documents">
        {() => <PrivateRoute component={DocumentsPage}/>}
      </Route>
      <Route path="/privacy">
        {() => <PrivateRoute component={PrivacyPolicy}/>}
      </Route>
      <Route path="/terms">
        {() => <PrivateRoute component={TermsOfService}/>}
      </Route>
      <Route path="/support">
        {() => <PrivateRoute component={Support}/>}
      </Route>

      <Route component={NotFound}/>
    </Switch>);
}
function App() {
    return (<QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <AuthProvider>
            <Router />
            <Toaster />
            </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>);
}
export default App;
