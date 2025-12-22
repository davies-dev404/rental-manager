import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Shield, Eye, Lock, FileText, Mail } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Privacy Policy</h2>
                    <p className="text-muted-foreground mt-1">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            1. Information We Collect
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        <p className="mb-4">
                            We collect information you provide directly to us when you create an account, update your profile, or communicate with us. This includes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Personal identification information (Name, email address, phone number).</li>
                            <li>Property and tenant data entered into the system.</li>
                            <li>Payment information and transaction history.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            2. How We Use Your Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        <p className="mb-4">
                            We use the information we collect to operate, maintain, and improve our services, including:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Processing rental payments and generating reports.</li>
                            <li>Sending you technical notices, updates, and support messages.</li>
                            <li>Detecting, investigating, and preventing fraudulent transactions.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            3. Data Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        We implement appropriate technical and organizational measures to protect specific personal information. However, please note that no method of transmission over the Internet or method of electronic storage is 100% secure.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            4. Your Rights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        Depending on your location, you may have rights regarding your personal information, including the right to access, correct, or delete your data. Contact our support team to exercise these rights.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            5. Contact Us
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed">
                        If you have any questions about this Privacy Policy, please contact us via our Support page.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
