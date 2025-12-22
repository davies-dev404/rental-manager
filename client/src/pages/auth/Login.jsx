import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import logo from "@/assets/logo.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function LoginPage() {
    const { login } = useAuth();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [isSignup, setIsSignup] = useState(false);
    
    // Login State
    const [adminEmail, setAdminEmail] = useState("admin@rental.com");
    const [caretakerEmail, setCaretakerEmail] = useState("john@rental.com");
    
    // Signup State
    const [signupData, setSignupData] = useState({ name: "", email: "", password: "", role: "admin" });
    const [showOTP, setShowOTP] = useState(false);
    const [otp, setOtp] = useState("");

    const handleLogin = async (role) => {
        setIsLoading(true);
        try {
            await login(role === "admin" ? adminEmail : caretakerEmail, role);
            setLocation("/");
        } catch (error) {
            // Error handled in auth context
        } finally {
            setIsLoading(false);
        }
    };

    const initiateSignup = async () => {
        if (!signupData.name || !signupData.email || !signupData.password) {
            toast({ variant: "destructive", title: "Error", description: "Please fill in all fields" });
            return;
        }
        setIsLoading(true);
        // Simulate sending OTP
        await new Promise(r => setTimeout(r, 1000));
        setIsLoading(false);
        setShowOTP(true);
        toast({ title: "Verification Code Sent", description: "Please check your email for the code (use 123456)" });
    };

    const verifyOTP = async () => {
        if (otp !== "123456") {
            toast({ variant: "destructive", title: "Invalid Code", description: "Please try again" });
            return;
        }
        setIsLoading(true);
        try {
            const newUser = await api.registerUser(signupData);
            await login(newUser.email, newUser.role); // Auto login
            toast({ title: "Account Created", description: "Welcome to Dwello!" });
            setLocation("/");
        } catch (error) {
            toast({ variant: "destructive", title: "Signup Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSignup) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="w-full max-w-md space-y-6">
                    <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent" onClick={() => setIsSignup(false)}>
                        <ArrowLeft className="w-4 h-4 mr-2"/> Back to Login
                    </Button>
                    <div className="text-center space-y-2">
                         <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">Create Account</h1>
                         <p className="text-muted-foreground">Join Dwello to manage your properties</p>
                    </div>

                    <Card className="border-border shadow-lg">
                        <CardHeader>
                            <CardTitle>Sign Up</CardTitle>
                            <CardDescription>Enter your details below</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input placeholder="John Doe" value={signupData.name} onChange={(e) => setSignupData({...signupData, name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" placeholder="john@example.com" value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input type="password" placeholder="••••••••" value={signupData.password} onChange={(e) => setSignupData({...signupData, password: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Tabs defaultValue="admin" onValueChange={(v) => setSignupData({...signupData, role: v})}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="admin">Landlord</TabsTrigger>
                                        <TabsTrigger value="caretaker">Caretaker</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={initiateSignup} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Verify Email
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                
                {/* OTP Dialog */}
                <Dialog open={showOTP} onOpenChange={setShowOTP}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Verify Email</DialogTitle>
                            <DialogDescription>
                                We sent a code to {signupData.email}. Enter it below to verify your account.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center justify-center py-4">
                             <div className="space-y-2">
                                <Input className="text-center text-2xl tracking-widest font-mono" maxLength={6} placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} />
                                <p className="text-xs text-center text-muted-foreground">Use code 123456</p>
                             </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={verifyOTP} disabled={isLoading || otp.length < 6} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>}
                                Verify & Create Account
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
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
                  <CardFooter className="flex flex-col gap-3">
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
                  <CardFooter className="flex flex-col gap-3">
                    <Button className="w-full h-11 text-base shadow-md transition-all hover:shadow-lg active:scale-[0.98]" onClick={() => handleLogin("caretaker")} disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      Sign In as Caretaker
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="text-center">
                <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button className="text-primary hover:underline font-medium" onClick={() => setIsSignup(true)}>
                        Sign up
                    </button>
                </p>
            </div>
          </div>
        </div>);
}
