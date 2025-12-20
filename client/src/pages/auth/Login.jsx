import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
export default function LoginPage() {
    const { login } = useAuth();
    const [, setLocation] = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    // Default Credentials
    const [adminEmail, setAdminEmail] = useState("admin@rental.com");
    const [caretakerEmail, setCaretakerEmail] = useState("john@rental.com");
    const handleLogin = async (role) => {
        setIsLoading(true);
        try {
            await login(role === "admin" ? adminEmail : caretakerEmail, role);
            setLocation("/");
        }
        catch (error) {
            // Error handled in auth context
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-sm">
                <img src={logo} alt="Logo" className="w-12 h-12 object-contain mix-blend-multiply dark:mix-blend-screen opacity-90"/>
            </div>
            <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white tracking-tight">Dwello</h1>
            <p className="text-muted-foreground">Sign in to manage your properties</p>
        </div>

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 h-12">
            <TabsTrigger value="admin" className="text-base">Admin / Landlord</TabsTrigger>
            <TabsTrigger value="caretaker" className="text-base">Caretaker</TabsTrigger>
          </TabsList>
          
          <TabsContent value="admin">
            <Card className="border-border shadow-lg">
              <CardHeader>
                <CardTitle>Admin Access</CardTitle>
                <CardDescription>Full access to all system features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@rental.com"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-pass">Password</Label>
                  <Input id="admin-pass" type="password" value="password" disabled/>
                  <p className="text-xs text-muted-foreground">Any password works for demo</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full h-11 text-base shadow-md transition-all hover:shadow-lg active:scale-[0.98]" onClick={() => handleLogin("admin")} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  Sign In as Admin
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="caretaker">
            <Card className="border-border shadow-lg">
              <CardHeader>
                <CardTitle>Caretaker Access</CardTitle>
                <CardDescription>Limited access to assigned properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="caretaker-email">Email</Label>
                  <Input id="caretaker-email" type="email" value={caretakerEmail} onChange={(e) => setCaretakerEmail(e.target.value)} placeholder="john@rental.com"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caretaker-pass">Password</Label>
                  <Input id="caretaker-pass" type="password" value="password" disabled/>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full h-11 text-base shadow-md transition-all hover:shadow-lg active:scale-[0.98]" onClick={() => handleLogin("caretaker")} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  Sign In as Caretaker
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>);
}
