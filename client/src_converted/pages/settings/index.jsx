import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Bell, Lock, User, Building2, CreditCard, Shield, Trash2, Save, ArrowRight } from "lucide-react";
export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("account");
    const handleSave = async () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast({ title: "Settings Saved", description: "Your preferences have been updated." });
        }, 1000);
    };
    return (<div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account, preferences, and system configuration.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-12">
          <TabsTrigger value="account" className="text-sm">
            <User className="w-4 h-4 mr-2"/> Account
          </TabsTrigger>
          <TabsTrigger value="organization" className="text-sm">
            <Building2 className="w-4 h-4 mr-2"/> Organization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-sm">
            <Bell className="w-4 h-4 mr-2"/> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="text-sm">
            <Shield className="w-4 h-4 mr-2"/> Security
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details and contact information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue={user?.name.split(' ')[0] || ''}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue={user?.name.split(' ').slice(1).join(' ') || ''}/>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue={user?.email || ''}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+254700000000"/>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 flex justify-between">
              <p className="text-sm text-muted-foreground">Changes are auto-saved</p>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> Save Changes
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Account Preferences</CardTitle>
              <CardDescription>Customize your RentalManager experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="africa-nairobi">
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="africa-nairobi">Africa/Nairobi (EAT)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme across the app</p>
                </div>
                <Switch defaultChecked/>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Manage your rental business information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="orgName">Business Name</Label>
                <Input id="orgName" placeholder="Your Property Management Company"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgEmail">Business Email</Label>
                <Input id="orgEmail" type="email" placeholder="contact@property.com"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgPhone">Business Phone</Label>
                <Input id="orgPhone" type="tel" placeholder="+254700000000"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgAddress">Business Address</Label>
                <Textarea id="orgAddress" placeholder="123 Business St, City, Country" rows={3}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / Registration Number</Label>
                <Input id="taxId" placeholder="P001234567"/>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> Save Details
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Manage your billing and payment settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="space-y-1">
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">Professional Plan</p>
                </div>
                <Badge className="bg-primary text-primary-foreground">Active</Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingEmail">Billing Email</Label>
                <Input id="billingEmail" type="email" placeholder="billing@company.com"/>
              </div>
              <Button variant="outline" className="w-full">
                <CreditCard className="w-4 h-4 mr-2"/> Update Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Control what notifications you receive via email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Rent Payment Reminders</p>
                  <p className="text-xs text-muted-foreground mt-1">Notify when rent is due</p>
                </div>
                <Switch defaultChecked/>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Overdue Rent Alerts</p>
                  <p className="text-xs text-muted-foreground mt-1">Alert when rent is overdue</p>
                </div>
                <Switch defaultChecked/>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Payment Receipts</p>
                  <p className="text-xs text-muted-foreground mt-1">Send payment confirmation emails</p>
                </div>
                <Switch defaultChecked/>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Monthly Reports</p>
                  <p className="text-xs text-muted-foreground mt-1">Send monthly performance summary</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">New Tenant Registration</p>
                  <p className="text-xs text-muted-foreground mt-1">Notify when new tenants are added</p>
                </div>
                <Switch defaultChecked/>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> Save Notification Settings
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>SMS Notifications</CardTitle>
              <CardDescription>Receive critical alerts via SMS (if available).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Critical Alerts Only</p>
                  <p className="text-xs text-muted-foreground mt-1">Receive SMS for urgent issues</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="space-y-2 mt-4">
                <Label htmlFor="smsPhone">SMS Phone Number</Label>
                <Input id="smsPhone" type="tel" placeholder="+254700000000"/>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Password & Authentication</CardTitle>
              <CardDescription>Secure your account with strong authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                <Lock className="w-4 h-4 mr-2"/> Change Password
              </Button>
              <Separator />
              <div className="pt-2 space-y-4">
                <div>
                  <p className="font-medium text-sm mb-3">Two-Factor Authentication</p>
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/20">
                    Not Enabled
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account. You'll need to enter a code from your authenticator app or phone in addition to your password when logging in.</p>
                <Button>
                  Enable 2FA <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active login sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Current Session</p>
                  <p className="text-xs text-muted-foreground mt-1">Your current browser</p>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">Active</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions. Please be careful.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:text-destructive hover:bg-destructive/5">
                    <Trash2 className="w-4 h-4 mr-2"/> Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Your account and all associated data will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);
}
