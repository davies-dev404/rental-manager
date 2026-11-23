import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSupportStream } from "@/hooks/useSupportStream";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Send, MessageCircle, CheckCheck } from "lucide-react";
import SEO from "@/components/SEO";

export default function Support() {
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [category, setCategory] = useState("general");
    const [activeTicketId, setActiveTicketId] = useState(null);
    const [chatReply, setChatReply] = useState("");
    const chatEndRef = useRef(null);

    const { isConnected } = useSupportStream({
        mode: "user",
        enabled: Boolean(user?.token)
    });

    const { data: myTickets = [] } = useQuery({
        queryKey: ["my-support-tickets"],
        queryFn: api.getMySupportTickets,
        enabled: Boolean(user?.token)
    });

    useEffect(() => {
        if (!activeTicketId && Array.isArray(myTickets) && myTickets.length > 0) {
            setActiveTicketId(myTickets[0]._id);
        }
    }, [myTickets, activeTicketId]);

    const activeTicket = Array.isArray(myTickets)
        ? myTickets.find((t) => String(t._id) === String(activeTicketId)) || myTickets[0] || null
        : null;

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeTicket?.responses?.length, activeTicket?._id]);

    const replyMutation = useMutation({
        mutationFn: ({ id, message }) => api.replySupportTicket(id, message),
        onSuccess: (res) => {
            setChatReply("");
            if (res?.ticket) {
                queryClient.setQueryData(["my-support-tickets"], (prev) => {
                    const list = Array.isArray(prev) ? [...prev] : [];
                    const idx = list.findIndex((t) => String(t._id) === String(res.ticket._id));
                    if (idx >= 0) list[idx] = res.ticket;
                    else list.unshift(res.ticket);
                    return list;
                });
            }
        },
        onError: (err) => {
            toast({
                variant: "destructive",
                title: "Message Failed",
                description: err.message || "Could not send message."
            });
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        setIsSubmitting(true);
        try {
            const res = await api.submitSupportTicket({
                name: form.name.value,
                email: form.email.value,
                subject: form.subject.value,
                category,
                message: form.message.value
            });
            toast({
                title: "Support Ticket Created",
                description: `Ticket ${res.ticket?.ticketNumber || ""} is now open for live chat below.`
            });
            if (res.ticket?._id) {
                setActiveTicketId(res.ticket._id);
            }
            queryClient.invalidateQueries({ queryKey: ["my-support-tickets"] });
            form.reset();
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: err.message || "Could not submit your support request."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendChatReply = (e) => {
        if (e) e.preventDefault();
        if (!activeTicket?._id || !chatReply.trim()) return;
        replyMutation.mutate({ id: activeTicket._id, message: chatReply.trim() });
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
        <div className="space-y-8 max-w-6xl mx-auto">
            <SEO 
                title="Customer Support & Live Help Center"
                canonicalPath="/support"
                description="Chat in real time with MakaziFlow support. Find answers to common questions about rent billing, tenant management, and M-Pesa integration."
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Support Center</h2>
                    <p className="text-muted-foreground mt-1">Chat with MakaziFlow Support in real time or open a new support thread.</p>
                </div>
                {user?.token && (
                    <Badge
                        variant="outline"
                        className={`text-xs self-start sm:self-auto flex items-center gap-1.5 ${
                            isConnected
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        {isConnected ? "Live Support Connected" : "Connecting..."}
                    </Badge>
                )}
            </div>

            {/* Real-Time WhatsApp-Style Live Support Chat */}
            {Array.isArray(myTickets) && myTickets.length > 0 && (
                <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="bg-[#0d2240] text-white py-3.5 px-5">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2 text-white">
                                    <MessageCircle className="w-4 h-4 text-[#00d4c8]" />
                                    Live Support Conversations ({myTickets.length})
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-300">
                                    Messages sync instantaneously with Msimamizi Support — no page refresh required.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 min-h-[420px]">
                        {/* Ticket Selector Sidebar */}
                        <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 divide-y divide-slate-200 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
                            {myTickets.map((t) => {
                                const isSel = activeTicket && String(t._id) === String(activeTicket._id);
                                const lastReply = (t.responses || [])[t.responses.length - 1];
                                return (
                                    <button
                                        key={t._id}
                                        type="button"
                                        onClick={() => setActiveTicketId(t._id)}
                                        className={`w-full text-left p-3.5 transition cursor-pointer ${
                                            isSel ? "bg-white dark:bg-slate-800 border-l-4 border-l-[#00a99d]" : "hover:bg-white/70 dark:hover:bg-slate-800/40"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-[11px] font-bold text-[#00a99d]">{t.ticketNumber}</span>
                                            <Badge variant="outline" className="text-[9.5px] capitalize">
                                                {String(t.status || "open").replace(/_/g, " ")}
                                            </Badge>
                                        </div>
                                        <p className="font-semibold text-xs text-slate-900 dark:text-white truncate mt-0.5">{t.subject}</p>
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                            {lastReply ? lastReply.message : t.message || "Conversation opened"}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Chat Thread */}
                        <div className="md:col-span-2 flex flex-col bg-[#ece5dd] dark:bg-slate-950">
                            {activeTicket && (
                                <>
                                    <div className="bg-white dark:bg-slate-900 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{activeTicket.subject}</p>
                                            <p className="text-[11px] text-slate-500">{activeTicket.ticketNumber} · {activeTicket.category}</p>
                                        </div>
                                        <Badge className="text-[10px] capitalize bg-[#0d2240] text-white shrink-0">
                                            {String(activeTicket.status || "open").replace(/_/g, " ")}
                                        </Badge>
                                    </div>

                                    <div className="flex-1 p-4 space-y-2.5 max-h-[340px] overflow-y-auto">
                                        {activeTicket.message && (
                                            <div className="flex justify-end">
                                                <div className="max-w-[82%] bg-[#d9fdd3] dark:bg-emerald-900 text-slate-900 dark:text-white rounded-2xl rounded-tr-xs px-3.5 py-2 shadow-xs text-xs space-y-1">
                                                    <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500 dark:text-slate-300">
                                                        <strong>You</strong>
                                                        <span className="flex items-center gap-1">
                                                            {activeTicket.createdAt ? new Date(activeTicket.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : ""}
                                                            <CheckCheck className="w-3 h-3 text-[#00a99d]" />
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap">{activeTicket.message}</p>
                                                </div>
                                            </div>
                                        )}

                                        {(activeTicket.responses || []).map((r, idx) => {
                                            const isStaff = r.authorRole === "superadmin";
                                            const tStr = r.createdAt
                                                ? new Date(r.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
                                                : "";
                                            return (
                                                <div key={r._id || idx} className={`flex ${isStaff ? "justify-start" : "justify-end"}`}>
                                                    <div
                                                        className={`max-w-[82%] rounded-2xl px-3.5 py-2 shadow-xs text-xs space-y-1 ${
                                                            isStaff
                                                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs"
                                                                : "bg-[#d9fdd3] dark:bg-emerald-900 text-slate-900 dark:text-white rounded-tr-xs"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-4 text-[10px]">
                                                            <strong className={isStaff ? "text-[#00a99d]" : "text-slate-600 dark:text-slate-300"}>
                                                                {isStaff ? `${r.authorName} · Support` : "You"}
                                                            </strong>
                                                            <span className="text-slate-400 flex items-center gap-1">
                                                                {tStr}
                                                                {!isStaff && <CheckCheck className="w-3 h-3 text-[#00a99d]" />}
                                                            </span>
                                                        </div>
                                                        <p className="whitespace-pre-wrap">{r.message}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={chatEndRef} />
                                    </div>

                                    <form onSubmit={handleSendChatReply} className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2.5 flex items-end gap-2">
                                        <Textarea
                                            rows={1}
                                            value={chatReply}
                                            onChange={(e) => setChatReply(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendChatReply();
                                                }
                                            }}
                                            placeholder="Type a message (Enter to send)..."
                                            className="text-xs resize-none min-h-10"
                                        />
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={replyMutation.isPending || !chatReply.trim()}
                                            className="bg-[#00a99d] hover:bg-[#008f85] text-white h-10 px-4 text-xs cursor-pointer shrink-0"
                                        >
                                            <Send className="w-3.5 h-3.5 mr-1" />
                                            {replyMutation.isPending ? "..." : "Send"}
                                        </Button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* New Ticket Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <MessageCircle className="w-5 h-5 text-primary"/> Start a New Support Ticket
                        </CardTitle>
                        <CardDescription>Send us a message to start a live conversation with our support team.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" name="name" required defaultValue={user?.name || ""} placeholder="Your name" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" required defaultValue={user?.email || ""} placeholder="your@email.com" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input id="subject" name="subject" required placeholder="How can we help?" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                        id="category"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="general">General Support</option>
                                        <option value="billing">Billing &amp; Subscriptions</option>
                                        <option value="payments">Payments / M-Pesa</option>
                                        <option value="technical">Technical Issue</option>
                                        <option value="account">Account Access</option>
                                        <option value="complaint">Complaint</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea id="message" name="message" required placeholder="Describe your issue..." rows={4} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Sending..." : (
                                    <>Start Conversation <Send className="w-4 h-4 ml-2" /></>
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
                                    <p className="text-muted-foreground">info@afrinextech.co.ke</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm">
                                    <Phone className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Call Us</p>
                                    <p className="text-muted-foreground">0790264792</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border shadow-sm">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Visit Us</p>
                                    <p className="text-muted-foreground">Busia, Kenya</p>
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
