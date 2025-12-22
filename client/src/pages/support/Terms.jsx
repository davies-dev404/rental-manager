import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, User, AlertTriangle, Copyright, XCircle, Scale, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Terms of Service</h2>
                    <p className="text-muted-foreground mt-1">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <FileCheck className="w-5 h-5" />
                            1. Acceptance of Terms
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        By accessing or using Dwello, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <User className="w-5 h-5" />
                            2. User Accounts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            3. Acceptable Use
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                         You agree not to use Dwello for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You may not attempt to gain unauthorized access to any portion of the service.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <Copyright className="w-5 h-5" />
                            4. Intellectual Property
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        The service and its original content, features, and functionality are owned by Dwello and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            5. Termination
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <Scale className="w-5 h-5" />
                            6. Limitation of Liability
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        In no event shall Dwello, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
