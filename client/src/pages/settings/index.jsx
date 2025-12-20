
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/lib/currency";
import { Loader2, User, Building2, Bell, Smartphone, Shield, Save, CreditCard, Lock, ArrowRight, Trash2, Coins } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export default function Settings() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const { currency, changeCurrency, currencies, timezone, changeTimezone } = usePreferences();
    const timezones = Intl.supportedValuesOf('timeZone');
    const [activeTab, setActiveTab] = useState("account");
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await api.getSettings();
                setSettings(data);
            } catch (error) {
                console.error("Failed to load settings:", error);
                toast({ variant: "destructive", title: "Error", description: "Failed to load settings." });
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, [toast]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateSettings(settings);
            // Simulate other update calls for profile if needed, but here we focus on the settings object
            toast({ title: "Settings Saved", description: "Your preferences have been updated." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
        } finally {
            setIsSaving(false);
        }
    };

    const updateIntegration = (category, provider, field, value) => {
        setSettings(prev => {
            const newSettings = { ...prev };
            if (!newSettings.integrations) newSettings.integrations = {};
            if (!newSettings.integrations[category]) newSettings.integrations[category] = {};

            // If a specific provider sub-config is targeted (e.g. email -> smtp -> host)
            if (provider && field !== 'provider') {
                if (!newSettings.integrations[category][provider]) newSettings.integrations[category][provider] = {};
                newSettings.integrations[category][provider][field] = value;
            } else {
                // Top-level category setting (e.g. email -> provider, or mpesa -> enabled)
                newSettings.integrations[category][field] = value;
            }
            return newSettings;
        });
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (<div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('settings')}</h2>
        <p className="text-muted-foreground mt-1">{t('settings_desc')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-12">
          <TabsTrigger value="account" className="text-sm">
            <User className="w-4 h-4 mr-2"/> {t('account')}
          </TabsTrigger>
          <TabsTrigger value="organization" className="text-sm">
            <Building2 className="w-4 h-4 mr-2"/> {t('organization')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-sm">
            <Bell className="w-4 h-4 mr-2"/> {t('notifications')}
          </TabsTrigger>
          <TabsTrigger value="rent_collection" className="text-sm">
            <Smartphone className="w-4 h-4 mr-2"/> {t('rent_collection')}
          </TabsTrigger>
          <TabsTrigger value="security" className="text-sm">
            <Shield className="w-4 h-4 mr-2"/> {t('security')}
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('personal_information')}</CardTitle>
              <CardDescription>{t('personal_information_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('first_name')}</Label>
                  <Input id="firstName" defaultValue={user?.name.split(' ')[0] || ''}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('last_name')}</Label>
                  <Input id="lastName" defaultValue={user?.name.split(' ').slice(1).join(' ') || ''}/>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email_address')}</Label>
                <Input id="email" type="email" defaultValue={user?.email || ''}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone_number')}</Label>
                <Input id="phone" type="tel" placeholder="+254700000000"/>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 flex justify-between">
              <p className="text-sm text-muted-foreground">{t('changes_auto_saved')}</p>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> {t('save_changes')}
              </Button>
            </CardFooter>
          </Card>

            <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('account_preferences')}</CardTitle>
              <CardDescription>{t('settings')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language">{t('preferred_language')}</Label>
                <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Kiswahili</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{t('currency')}</Label>
                <Select value={currency} onValueChange={changeCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(curr => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{t('timezone') || "Timezone"}</Label>
                <Select 
                    value={timezone}
                    onValueChange={changeTimezone}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-72">
                        {timezones.map(tz => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>{t('dark_mode')}</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme across the app</p>
                </div>
                <Switch defaultChecked/>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> {t('save_changes')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('organization_details')}</CardTitle>
              <CardDescription>{t('organization_desc')}</CardDescription>
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
              <CardTitle>{t('billing_information')}</CardTitle>
              <CardDescription>{t('billing_desc')}</CardDescription>
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
              <CardTitle>{t('email_notifications')}</CardTitle>
              <CardDescription>{t('email_notifications_desc')}</CardDescription>
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
              <div className="pt-4">
                  <h4 className="text-sm font-medium mb-3">Service Provider Configuration</h4>
                  <Tabs defaultValue="smtp" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="smtp">SMTP</TabsTrigger>
                        <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
                        <TabsTrigger value="gmail">Gmail API</TabsTrigger>
                      </TabsList>
                      <TabsContent value="smtp" className="space-y-4 mt-4 p-4 border rounded-md">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Host</Label>
                                <Input 
                                    placeholder="smtp.example.com" 
                                    value={settings?.integrations?.email?.smtp?.host || ''} 
                                    onChange={(e) => updateIntegration('email', 'smtp', 'host', e.target.value)}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>Port</Label>
                                <Input 
                                    placeholder="587" 
                                    value={settings?.integrations?.email?.smtp?.port || ''}
                                    onChange={(e) => updateIntegration('email', 'smtp', 'port', e.target.value)}
                                />
                             </div>
                          </div>
                          <div className="space-y-2">
                                <Label>Username</Label>
                                <Input 
                                    placeholder="user@example.com" 
                                    value={settings?.integrations?.email?.smtp?.user || ''}
                                    onChange={(e) => updateIntegration('email', 'smtp', 'user', e.target.value)}
                                />
                             </div>
                          <div className="space-y-2">
                                <Label>Password</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={settings?.integrations?.email?.smtp?.pass || ''}
                                    onChange={(e) => updateIntegration('email', 'smtp', 'pass', e.target.value)}
                                />
                          </div>
                          <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('email', 'smtp', 'provider', 'smtp')}>
                                    Activate SMTP
                                </Button>
                          </div>
                      </TabsContent>
                      <TabsContent value="sendgrid" className="space-y-4 mt-4 p-4 border rounded-md">
                          <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input 
                                    type="password" 
                                    placeholder="SG.xxxxxxxx..." 
                                    value={settings?.integrations?.email?.sendgrid?.apiKey || ''}
                                    onChange={(e) => updateIntegration('email', 'sendgrid', 'apiKey', e.target.value)}
                                />
                          </div>
                          <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('email', 'sendgrid', 'provider', 'sendgrid')}>
                                    Activate SendGrid
                                </Button>
                          </div>
                      </TabsContent>
                      <TabsContent value="gmail" className="space-y-4 mt-4 p-4 border rounded-md">
                           <div className="space-y-2">
                                <Label>Client ID</Label>
                                <Input 
                                    placeholder="xxxx.apps.googleusercontent.com" 
                                    value={settings?.integrations?.email?.gmail?.clientId || ''}
                                    onChange={(e) => updateIntegration('email', 'gmail', 'clientId', e.target.value)}
                                />
                          </div>
                          <div className="space-y-2">
                                <Label>Client Secret</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={settings?.integrations?.email?.gmail?.clientSecret || ''}
                                    onChange={(e) => updateIntegration('email', 'gmail', 'clientSecret', e.target.value)}
                                />
                          </div>
                           <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('email', 'gmail', 'provider', 'gmail')}>
                                    Activate Gmail
                                </Button>
                          </div>
                      </TabsContent>
                  </Tabs>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> {t('save_notification_settings')}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('sms_notifications')}</CardTitle>
              <CardDescription>{t('sms_notifications_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Enable SMS Integration</p>
                  <p className="text-xs text-muted-foreground mt-1">Send SMS via 3rd party providers</p>
                </div>
                <Switch 
                    checked={settings?.integrations?.sms?.enabled || false}
                    onCheckedChange={(checked) => updateIntegration('sms', null, 'enabled', checked)}
                />
              </div>
              <Separator />
               <div className="pt-4">
                  <h4 className="text-sm font-medium mb-3">SMS Provider Configuration</h4>
                  <Tabs defaultValue="twilio" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="twilio">Twilio</TabsTrigger>
                        <TabsTrigger value="africastalking">Africa's Talking</TabsTrigger>
                        <TabsTrigger value="aws">AWS SNS</TabsTrigger>
                      </TabsList>
                      <TabsContent value="twilio" className="space-y-4 mt-4 p-4 border rounded-md">
                          <div className="space-y-2">
                                <Label>Account SID</Label>
                                <Input 
                                    placeholder="ACxxxxxxxx..." 
                                    value={settings?.integrations?.sms?.twilio?.accountSid || ''}
                                    onChange={(e) => updateIntegration('sms', 'twilio', 'accountSid', e.target.value)}
                                />
                          </div>
                          <div className="space-y-2">
                                <Label>Auth Token</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={settings?.integrations?.sms?.twilio?.authToken || ''}
                                    onChange={(e) => updateIntegration('sms', 'twilio', 'authToken', e.target.value)}
                                />
                          </div>
                          <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('sms', 'twilio', 'provider', 'twilio')}>
                                    Activate Twilio
                                </Button>
                          </div>
                      </TabsContent>
                       <TabsContent value="africastalking" className="space-y-4 mt-4 p-4 border rounded-md">
                          <div className="space-y-2">
                                <Label>Username</Label>
                                <Input 
                                    placeholder="sandbox" 
                                    value={settings?.integrations?.sms?.africastalking?.username || ''}
                                    onChange={(e) => updateIntegration('sms', 'africastalking', 'username', e.target.value)}
                                />
                          </div>
                          <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={settings?.integrations?.sms?.africastalking?.apiKey || ''}
                                    onChange={(e) => updateIntegration('sms', 'africastalking', 'apiKey', e.target.value)}
                                />
                          </div>
                          <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('sms', 'africastalking', 'provider', 'africastalking')}>
                                    Activate Africa's Talking
                                </Button>
                          </div>
                      </TabsContent>
                  </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rent Collection Settings */}
        <TabsContent value="rent_collection" className="space-y-6">
           <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('mpesa_integration')}</CardTitle>
              <CardDescription>{t('mpesa_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Enable M-Pesa</p>
                  <p className="text-xs text-muted-foreground mt-1">Allow tenants to pay via M-Pesa STK Push</p>
                </div>
                <Switch 
                     checked={settings?.integrations?.mpesa?.enabled || false}
                     onCheckedChange={(checked) => updateIntegration('mpesa', null, 'enabled', checked)}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <Select 
                        value={settings?.integrations?.mpesa?.environment || 'sandbox'}
                        onValueChange={(val) => updateIntegration('mpesa', null, 'environment', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                        <SelectItem value="production">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Paybill / Till Number</Label>
                     <Input 
                        placeholder="174379" 
                        value={settings?.integrations?.mpesa?.paybill || ''}
                        onChange={(e) => updateIntegration('mpesa', null, 'paybill', e.target.value)}
                     />
                  </div>
              </div>
              <div className="space-y-2">
                <Label>Consumer Key</Label>
                <Input 
                    placeholder="Generrated from Daraja Portal" 
                    value={settings?.integrations?.mpesa?.consumerKey || ''}
                    onChange={(e) => updateIntegration('mpesa', null, 'consumerKey', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Consumer Secret</Label>
                <Input 
                    type="password"
                    placeholder="••••••••" 
                    value={settings?.integrations?.mpesa?.consumerSecret || ''}
                    onChange={(e) => updateIntegration('mpesa', null, 'consumerSecret', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Passkey</Label>
                <Input 
                    type="password"
                    placeholder="Lipa Na M-Pesa Passkey" 
                    value={settings?.integrations?.mpesa?.passkey || ''}
                    onChange={(e) => updateIntegration('mpesa', null, 'passkey', e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> Save Payment Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('security_settings') || "Password & Authentication"}</CardTitle>
              <CardDescription>{t('security_desc') || t('password_auth_desc') || "Secure your account with strong authentication."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                <Lock className="w-4 h-4 mr-2"/> {t('change_password')}
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
                  {t('enable_2fa')} <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('active_sessions')}</CardTitle>
              <CardDescription>{t('manage_sessions_desc') || "Manage your active login sessions."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Current Session</p>
                  <p className="text-xs text-muted-foreground mt-1">Your current browser</p>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">{t('active')}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-destructive">{t('danger_zone')}</CardTitle>
              <CardDescription>{t('danger_zone_desc') || "Irreversible actions. Please be careful."}</CardDescription>
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
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t('delete')}
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
