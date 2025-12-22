import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";

export default function Support() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({ title: "Message Sent", description: "We've received your message and will get back to you soon." });
        setIsSubmitting(false);
        e.target.reset();
    };

    const faqs = [
        {
            question: "How do I reset my password?",
            answer: "You can reset your password by going to Settings > Security and clicking on the 'Change Password' button. If you're locked out, please contact your administrator."
        },
        {
            question: "How do I enable 2-Factor Authentication?",
            answer: "Go to Settings > Security and click 'Enable 2FA'. Follow the instructions to scan the QR code with your authenticator app."
        },
        {
            question: "Can I export my payment reports?",
            answer: "Yes, navigate to the Reports page using the sidebar menu. You can generate and download reports for Properties, Tenants, and Financials."
        },
        {
            question: "How do I add a new tenant?",
            answer: "Navigate to the Tenants page and click the 'Add Tenant' button in the top right corner. Fill in the required details and save."
        }
    ];

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Support Center</h2>
                <p className="text-muted-foreground mt-1">Need help? Find answers to common questions or get in touch with our team.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Contact Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <MessageCircle className="w-5 h-5 text-primary"/> Contact Us
                        </CardTitle>
                        <CardDescription>Send us a message and we'll reply as soon as possible.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" required placeholder="Your name" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" required placeholder="your@email.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" required placeholder="How can we help?" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea id="message" required placeholder="Describe your issue..." rows={4} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Sending..." : (
                                    <>Send Message <Send className="w-4 h-4 ml-2" /></>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                     {/* Contact Info */}
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold text-lg mb-4">Contact Information</h3>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm">
                                    <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Email Us</p>
                                    <p className="text-muted-foreground">support@dwello.com</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm">
                                    <Phone className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Call Us</p>
                                    <p className="text-muted-foreground">+254 700 000 000</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Visit Us</p>
                                    <p className="text-muted-foreground">123 Business Center, Nairobi, Kenya</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* FAQ */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Frequently Asked Questions</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <Accordion type="single" collapsible className="w-full">
                                {faqs.map((faq, index) => (
                                    <AccordionItem key={index} value={`item-${index}`}>
                                        <AccordionTrigger className="text-sm font-medium">{faq.question}</AccordionTrigger>
                                        <AccordionContent className="text-muted-foreground">
                                            {faq.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
