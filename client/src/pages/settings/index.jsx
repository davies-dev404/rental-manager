
import { useState, useEffect } from "react";
import { Protect, PERMISSIONS } from "@/lib/access-control";
import QRCode from "react-qr-code";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ProfilePhotoUpload } from "@/components/profile-photo-upload";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { usePreferences } from "@/lib/currency";
import { Loader2, User, Building2, Bell, Smartphone, Shield, Save, CreditCard, Lock, ArrowRight, Trash2, Coins, RefreshCw } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function Settings() {
    const { toast } = useToast();
    const { user, updateProfile } = useAuth();
    const { t, i18n } = useTranslation();
    const { currency, changeCurrency, currencies, timezone, changeTimezone } = usePreferences();
    const { theme, setTheme } = useTheme();
    const timezones = Intl.supportedValuesOf('timeZone');
    const [activeTab, setActiveTab] = useState("account");
    const [isSaving, setIsSaving] = useState(false);
    
    // Profile Form Data
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        avatar: user?.avatar
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                avatar: user.avatar
            });
        }
    }, [user]);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await updateProfile(formData);
            // Success toast is handled in auth context
        } catch (error) {
            // Error toast is handled in auth context
        } finally {
            setIsSaving(false);
        }
    };
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleLanguageChange = (val) => {
        i18n.changeLanguage(val);
        // Persist to API settings
        if (settings) {
            const newSettings = { ...settings, language: val };
            setSettings(newSettings);
            api.updateSettings(newSettings);
        }
    };


    // Security State
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
    
    const [isTwoFactorOpen, setIsTwoFactorOpen] = useState(false);
    const [twoFactorStep, setTwoFactorStep] = useState('enable'); // enable, verify
    const [twoFactorData, setTwoFactorData] = useState(null); // { secret, qrCode }
    const [verificationCode, setVerificationCode] = useState('');

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
            toast({ title: t('settings_saved'), description: t('settings_saved_desc') });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: t('error'), description: t('save_failed') });
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

    const handleChangePassword = async () => {
        if (passwordForm.new !== passwordForm.confirm) {
            toast({ variant: "destructive", title: "Error", description: "New passwords do not match" });
            return;
        }
        setIsSaving(true);
        try {
            await api.changePassword(passwordForm.old, passwordForm.new);
            toast({ title: "Success", description: "Password changed successfully" });
            setIsChangePasswordOpen(false);
            setPasswordForm({ old: '', new: '', confirm: '' });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEnable2FA = async () => {
        setIsSaving(true);
        try {
            const data = await api.enable2FA();
            setTwoFactorData(data);
            setTwoFactorStep('verify');
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "Could not initiate 2FA setup" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleVerify2FA = async () => {
        setIsSaving(true);
        try {
            await api.verifyAndEnable2FA(verificationCode);
            toast({ title: "Success", description: "2FA Enabled Successfully" });
            setIsTwoFactorOpen(false);
            // Refresh settings
            const newSettings = await api.getSettings();
            setSettings(newSettings);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
             setIsSaving(false);
        }
    };
    
    const handleDisable2FA = async () => {
        // For simplicity, just disable directly or ask for password. 
        // We'll assume user is logged in and authoritative for this mock.
        setIsSaving(true);
        try {
             await api.disable2FA("1234"); // Mock password
             const newSettings = await api.getSettings();
             setSettings(newSettings);
             toast({ title: "Success", description: "2FA Disabled" });
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
             setIsSaving(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
             updateProfile({ avatar: reader.result });
        };
        reader.readAsDataURL(file);
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (<div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('settings')}</h2>
        <p className="text-muted-foreground mt-1">{t('settings_desc')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto md:h-12 gap-1 md:gap-0">
          <TabsTrigger value="account" className="text-sm">
            <User className="w-4 h-4 mr-2"/> {t('account')}
          </TabsTrigger>
          <Protect permission={PERMISSIONS.MANAGE_SETTINGS}>
            <TabsTrigger value="organization" className="text-sm">
                <Building2 className="w-4 h-4 mr-2"/> {t('organization')}
            </TabsTrigger>
          </Protect>
          <Protect permission={PERMISSIONS.MANAGE_SETTINGS}>
            <TabsTrigger value="notifications" className="text-sm">
                <Bell className="w-4 h-4 mr-2"/> {t('notifications')}
            </TabsTrigger>
          </Protect>
          <Protect permission={PERMISSIONS.MANAGE_SETTINGS}>
            <TabsTrigger value="rent_collection" className="text-sm">
                <Smartphone className="w-4 h-4 mr-2"/> {t('rent_collection')}
            </TabsTrigger>
          </Protect>
          <Protect permission={PERMISSIONS.MANAGE_SETTINGS}>
            <TabsTrigger value="security" className="text-sm">
                <Shield className="w-4 h-4 mr-2"/> {t('security')}
            </TabsTrigger>
          </Protect>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('personal_information')}</CardTitle>
              <CardDescription>{t('personal_information_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                       <ProfilePhotoUpload 
                          currentPhoto={formData.avatar || user?.avatar} 
                          onSave={(url) => setFormData(prev => ({ ...prev, avatar: url }))} 
                       />
                       <span className="text-xs text-muted-foreground">{t('click_to_edit') || "Click to edit"}</span>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">{t('first_name')}</Label>
                            <Input 
                                id="firstName" 
                                value={formData.name.split(' ')[0]} 
                                onChange={(e) => {
                                    const lastName = formData.name.split(' ').slice(1).join(' ');
                                    setFormData(prev => ({ ...prev, name: `${e.target.value} ${lastName}` }));
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">{t('last_name')}</Label>
                            <Input 
                                id="lastName" 
                                value={formData.name.split(' ').slice(1).join(' ')} 
                                onChange={(e) => {
                                    const firstName = formData.name.split(' ')[0];
                                    setFormData(prev => ({ ...prev, name: `${firstName} ${e.target.value}` }));
                                }}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('email_address')}</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            value={formData.email} 
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('phone_number')}</Label>
                        <Input 
                            id="phone" 
                            type="tel" 
                            value={formData.phone || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+254700000000"
                        />
                    </div>
                  </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 flex justify-between">
              <p className="text-sm text-muted-foreground">{t('changes_auto_saved')}</p>
              <Button onClick={handleSaveProfile} disabled={isSaving}>
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
                <Label htmlFor="language">{t('preferred_language')}</Label>
                <Select value={i18n.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Kiswahili</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
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
                  <p className="text-sm text-muted-foreground">{t('dark_mode_desc')}</p>
                </div>
                <Switch 
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
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
                <Label htmlFor="orgName">{t('business_name')}</Label>
                <Input id="orgName" placeholder="Your Property Management Company"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgEmail">{t('business_email')}</Label>
                <Input id="orgEmail" type="email" placeholder="contact@property.com"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgPhone">{t('business_phone')}</Label>
                <Input id="orgPhone" type="tel" placeholder="+254700000000"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgAddress">{t('business_address')}</Label>
                <Textarea id="orgAddress" placeholder="123 Business St, City, Country" rows={3}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">{t('tax_id')}</Label>
                <Input id="taxId" placeholder="P001234567"/>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2"/> {t('save_details')}
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
                  <p className="font-medium">{t('current_plan')}</p>
                  <p className="text-sm text-muted-foreground">{t('professional_plan')}</p>
                </div>
                <Badge className="bg-primary text-primary-foreground">{t('active')}</Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingEmail">{t('billing_email')}</Label>
                <Input id="billingEmail" type="email" placeholder="billing@company.com"/>
              </div>
              <Button variant="outline" className="w-full">
                <CreditCard className="w-4 h-4 mr-2"/> {t('update_payment_method')}
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
                  <p className="font-medium text-sm">{t('rent_payment_reminders')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('rent_payment_reminders_desc')}</p>
                </div>
                <Switch defaultChecked/>
              </div>
              <Separator />
              <div className="pt-4">
                  <h4 className="text-sm font-medium mb-3">{t('provider_config')}</h4>
                  <Tabs defaultValue="smtp" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="smtp">SMTP</TabsTrigger>
                        <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
                        <TabsTrigger value="gmail">Gmail API</TabsTrigger>
                      </TabsList>
                      <TabsContent value="smtp" className="space-y-4 mt-4 p-4 border rounded-md">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>{t('host')}</Label>
                                <Input 
                                    placeholder="smtp.example.com" 
                                    value={settings?.integrations?.email?.smtp?.host || ''} 
                                    onChange={(e) => updateIntegration('email', 'smtp', 'host', e.target.value)}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>{t('port')}</Label>
                                <Input 
                                    placeholder="587" 
                                    value={settings?.integrations?.email?.smtp?.port || ''}
                                    onChange={(e) => updateIntegration('email', 'smtp', 'port', e.target.value)}
                                />
                             </div>
                          </div>
                          <div className="space-y-2">
                                <Label>{t('username')}</Label>
                                <Input 
                                    placeholder="user@example.com" 
                                    value={settings?.integrations?.email?.smtp?.user || ''}
                                    onChange={(e) => updateIntegration('email', 'smtp', 'user', e.target.value)}
                                />
                             </div>
                          <div className="space-y-2">
                                <Label>{t('password')}</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={settings?.integrations?.email?.smtp?.pass || ''}
                                    onChange={(e) => updateIntegration('email', 'smtp', 'pass', e.target.value)}
                                />
                          </div>
                          <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('email', 'smtp', 'provider', 'smtp')}>
                                    {t('activate_smtp')}
                                </Button>
                          </div>
                      </TabsContent>
                      <TabsContent value="sendgrid" className="space-y-4 mt-4 p-4 border rounded-md">
                          <div className="space-y-2">
                                <Label>{t('api_key')}</Label>
                                <Input 
                                    type="password" 
                                    placeholder="SG.xxxxxxxx..." 
                                    value={settings?.integrations?.email?.sendgrid?.apiKey || ''}
                                    onChange={(e) => updateIntegration('email', 'sendgrid', 'apiKey', e.target.value)}
                                />
                          </div>
                          <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('email', 'sendgrid', 'provider', 'sendgrid')}>
                                    {t('activate_sendgrid')}
                                </Button>
                          </div>
                      </TabsContent>
                      <TabsContent value="gmail" className="space-y-4 mt-4 p-4 border rounded-md">
                           <div className="space-y-2">
                                <Label>{t('client_id')}</Label>
                                <Input 
                                    placeholder="xxxx.apps.googleusercontent.com" 
                                    value={settings?.integrations?.email?.gmail?.clientId || ''}
                                    onChange={(e) => updateIntegration('email', 'gmail', 'clientId', e.target.value)}
                                />
                          </div>
                          <div className="space-y-2">
                                <Label>{t('client_secret')}</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={settings?.integrations?.email?.gmail?.clientSecret || ''}
                                    onChange={(e) => updateIntegration('email', 'gmail', 'clientSecret', e.target.value)}
                                />
                          </div>
                           <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('email', 'gmail', 'provider', 'gmail')}>
                                    {t('activate_gmail')}
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
                  <p className="font-medium text-sm">{t('enable_sms')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('enable_sms_desc')}</p>
                </div>
                <Switch 
                    checked={settings?.integrations?.sms?.enabled || false}
                    onCheckedChange={(checked) => updateIntegration('sms', null, 'enabled', checked)}
                />
              </div>
              <Separator />
               <div className="pt-4">
                  <h4 className="text-sm font-medium mb-3">{t('sms_provider_config')}</h4>
                  <Tabs defaultValue="twilio" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="twilio">Twilio</TabsTrigger>
                        <TabsTrigger value="africastalking">Africa's Talking</TabsTrigger>
                        <TabsTrigger value="aws">AWS SNS</TabsTrigger>
                      </TabsList>
                      <TabsContent value="twilio" className="space-y-4 mt-4 p-4 border rounded-md">
                          <div className="space-y-2">
                                <Label>{t('account_sid')}</Label>
                                <Input 
                                    placeholder="ACxxxxxxxx..." 
                                    value={settings?.integrations?.sms?.twilio?.accountSid || ''}
                                    onChange={(e) => updateIntegration('sms', 'twilio', 'accountSid', e.target.value)}
                                />
                          </div>
                          <div className="space-y-2">
                                <Label>{t('auth_token')}</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={settings?.integrations?.sms?.twilio?.authToken || ''}
                                    onChange={(e) => updateIntegration('sms', 'twilio', 'authToken', e.target.value)}
                                />
                          </div>
                          <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('sms', 'twilio', 'provider', 'twilio')}>
                                    {t('activate_twilio')}
                                </Button>
                          </div>
                      </TabsContent>
                       <TabsContent value="africastalking" className="space-y-4 mt-4 p-4 border rounded-md">
                          <div className="space-y-2">
                                <Label>{t('username')}</Label>
                                <Input 
                                    placeholder="sandbox" 
                                    value={settings?.integrations?.sms?.africastalking?.username || ''}
                                    onChange={(e) => updateIntegration('sms', 'africastalking', 'username', e.target.value)}
                                />
                          </div>
                          <div className="space-y-2">
                                <Label>{t('api_key')}</Label>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={settings?.integrations?.sms?.africastalking?.apiKey || ''}
                                    onChange={(e) => updateIntegration('sms', 'africastalking', 'apiKey', e.target.value)}
                                />
                          </div>
                          <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => updateIntegration('sms', 'africastalking', 'provider', 'africastalking')}>
                                    {t('activate_africastalking')}
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
                  <p className="font-medium text-sm">{t('enable_mpesa')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('allow_mpesa_desc')}</p>
                </div>
                <Switch 
                     checked={settings?.integrations?.mpesa?.enabled || false}
                     onCheckedChange={(checked) => updateIntegration('mpesa', null, 'enabled', checked)}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('environment')}</Label>
                    <Select 
                        value={settings?.integrations?.mpesa?.environment || 'sandbox'}
                        onValueChange={(val) => updateIntegration('mpesa', null, 'environment', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">{t('sandbox')}</SelectItem>
                        <SelectItem value="production">{t('production')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('paybill_till_no')}</Label>
                     <Input 
                        placeholder="174379" 
                        value={settings?.integrations?.mpesa?.paybill || ''}
                        onChange={(e) => updateIntegration('mpesa', null, 'paybill', e.target.value)}
                     />
                  </div>
              </div>
              <div className="space-y-2">
                <Label>{t('consumer_key')}</Label>
                <Input 
                    placeholder="Generrated from Daraja Portal" 
                    value={settings?.integrations?.mpesa?.consumerKey || ''}
                    onChange={(e) => updateIntegration('mpesa', null, 'consumerKey', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('consumer_secret')}</Label>
                <Input 
                    type="password"
                    placeholder="••••••••" 
                    value={settings?.integrations?.mpesa?.consumerSecret || ''}
                    onChange={(e) => updateIntegration('mpesa', null, 'consumerSecret', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('passkey')}</Label>
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
                <Save className="w-4 h-4 mr-2"/> {t('save_payment_settings')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('security_settings')}</CardTitle>
              <CardDescription>{t('password_auth_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => setIsChangePasswordOpen(true)}>
                <Lock className="w-4 h-4 mr-2"/> {t('change_password')}
              </Button>
              <Separator />
              <div className="pt-2 space-y-4">
                <div>
                  <p className="font-medium text-sm mb-3">{t('two_factor_auth')}</p>
                  {settings?.security?.twoFactorEnabled ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/25">
                        {t('enabled') || "Enabled"}
                      </Badge>
                  ) : (
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/20">
                        {t('not_enabled')}
                      </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{t('two_factor_desc')}</p>
                {settings?.security?.twoFactorEnabled ? (
                    <Button variant="destructive" onClick={handleDisable2FA} disabled={isSaving}>
                        {t('disable_2fa') || "Disable 2FA"}
                    </Button>
                ) : (
                    <Button onClick={() => { setIsTwoFactorOpen(true); setTwoFactorStep('enable'); handleEnable2FA(); }} disabled={isSaving}>
                      {t('enable_2fa')} <ArrowRight className="w-4 h-4 ml-2"/>
                    </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Change Password Dialog */}
          <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>{t('change_password')}</DialogTitle>
                      <DialogDescription>{t('change_password_desc')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                      <div className="space-y-2">
                          <Label>{t('current_password')}</Label>
                          <Input 
                            type="password" 
                            value={passwordForm.old} 
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, old: e.target.value }))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label>{t('new_password')}</Label>
                          <Input 
                            type="password" 
                            value={passwordForm.new} 
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                          />
                      </div>
                       <div className="space-y-2">
                          <Label>{t('confirm_new_password')}</Label>
                          <Input 
                            type="password" 
                            value={passwordForm.confirm} 
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                          />
                      </div>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)}>{t('cancel')}</Button>
                      <Button onClick={handleChangePassword} disabled={isSaving}>{t('change_password')}</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>

          {/* 2FA Dialog */}
          <Dialog open={isTwoFactorOpen} onOpenChange={setIsTwoFactorOpen}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>{t('two_factor_auth')}</DialogTitle>
                      <DialogDescription>
                          {twoFactorStep === 'enable' ? t('setting_up_2fa') : t('scan_qr_code')}
                      </DialogDescription>
                  </DialogHeader>
                  
                  {twoFactorStep === 'verify' && twoFactorData && (
                      <div className="flex flex-col items-center justify-center space-y-4 py-4">
                          <div className="bg-white p-4 border rounded-lg">
                              <QRCode value={`otpauth://totp/Dwello:${user.email}?secret=${twoFactorData.secret}&issuer=Dwello`} size={156} />
                          </div>
                          <p className="text-xs text-muted-foreground text-center break-all select-all">
                              {twoFactorData.secret}
                          </p>
                          <div className="w-full space-y-2">
                               <Label>{t('verification_code')}</Label>
                               <Input 
                                    placeholder="123456" 
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                               />
                               <p className="text-xs text-muted-foreground">{t('use_mock_code')}</p>
                          </div>
                      </div>
                  )}

                  <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTwoFactorOpen(false)}>{t('cancel')}</Button>
                      {twoFactorStep === 'verify' && (
                          <Button onClick={handleVerify2FA} disabled={isSaving || !verificationCode}>{t('verify_enable')}</Button>
                      )}
                  </DialogFooter>
              </DialogContent>
          </Dialog>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('active_sessions')}</CardTitle>
              <CardDescription>{t('manage_sessions_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{t('current_session')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('current_session_desc')}</p>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">{t('active')}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-destructive">{t('danger_zone')}</CardTitle>
              <CardDescription>{t('danger_zone_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                     <RefreshCw className="w-4 h-4 mr-2"/> {t('reset_data') || "Reset Data"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('reset_data_confirm') || "Reset All Data?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('reset_data_desc') || "This will permanently delete all your properties, tenants, and payment records. The app will return to its initial state."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => api.resetData()}>
                      {t('confirm_reset') || "Yes, Reset Everything"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Separator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:text-destructive hover:bg-destructive/5">
                    <Trash2 className="w-4 h-4 mr-2"/> {t('delete_account')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('delete_account')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('delete_account_confirm')}
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
