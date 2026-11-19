import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useStore, dayKey, STAFF } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DAY } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  PartyPopper,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  User,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin Dashboard — Fancy Restaurant & Caterers" },
    { name: "description", content: "Sales analysis, payment mix, best sellers, staff attendance and event permits." },
    { property: "og:title", content: "Admin Dashboard — Fancy Restaurant & Caterers" },
    { property: "og:description", content: "Restaurant sales, payments, attendance and events." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Admin,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Admin() {
  const { orders, menu, events, attendance, set, reset } = useStore();
  const [range, setRange] = useState(7);
  const [eventFilter, setEventFilter] = useState<"all" | "pending" | "confirmed" | "history">("all");
  const paid = orders.filter((o) => o.status === "paid" && o.createdAt > Date.now() - range * DAY);
  const daily = useMemo(() => {
    const m: Record<string, number> = {};
    for (let d = range - 1; d >= 0; d--) m[dayKey(Date.now() - d * DAY)] = 0;
    paid.forEach((o) => { const k = dayKey(o.createdAt); if (k in m) m[k] = (m[k] ?? 0) + o.total; });
    return Object.entries(m).map(([d, v]) => ({ day: d.slice(5), sales: v }));
  }, [paid, range]);
  const payMix = (["cash", "card", "upi"] as const).map((p) => ({ name: p.toUpperCase(), value: paid.filter((o) => o.payment === p).reduce((s, o) => s + o.total, 0) }));
  const best = menu.map((m) => ({ name: m.name, qty: paid.flatMap((o) => o.items).filter((i) => i.id === m.id).reduce((s, i) => s + i.qty, 0) })).sort((a, b) => b.qty - a.qty);
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const today = dayKey(Date.now());
  const fmt = (t: number) => new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  const pendingEvents = events.filter((e) => e.status === "pending-permit");
  const confirmedEvents = events.filter((e) => e.status === "confirmed");
  const historyEvents = events.filter((e) => e.status === "rejected" || e.status === "cancelled");

  const filteredEvents = events.filter((e) => {
    if (eventFilter === "pending") return e.status === "pending-permit";
    if (eventFilter === "confirmed") return e.status === "confirmed";
    if (eventFilter === "history") return e.status === "rejected" || e.status === "cancelled";
    return true;
  });

  const getOccasionEmoji = (occasion: string) => {
    const o = occasion.toLowerCase();
    if (o.includes("birth")) return "🎂";
    if (o.includes("anniv") || o.includes("wedding")) return "💍";
    if (o.includes("corp") || o.includes("meet") || o.includes("dinner")) return "💼";
    if (o.includes("party") || o.includes("celebrat")) return "🎉";
    return "🍽️";
  };

  const handleGrantPermit = (id: string, name: string) => {
    set((s) => ({
      ...s,
      events: s.events.map((x) => (x.id === id ? { ...x, status: "confirmed" } : x)),
    }));
    toast.success(`Booking permit granted for ${name}!`);
  };

  const handleRejectPermit = (id: string, name: string) => {
    set((s) => ({
      ...s,
      events: s.events.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)),
    }));
    toast.error(`Booking request from ${name} was rejected.`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Admin dashboard</h1>
        <div className="flex gap-2">{[7, 14].map((r) => <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>Last {r} days</Button>)}
          <Button size="sm" variant="ghost" onClick={reset}>Reset demo data</Button></div>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[["Revenue", `₹${revenue.toLocaleString()}`], ["Orders", paid.length], ["Avg bill", `₹${paid.length ? Math.round(revenue / paid.length) : 0}`], ["Permits pending", events.filter((e) => e.status === "pending-permit").length]].map(([k, v]) => (
          <Card key={k} className="p-4"><div className="text-sm text-muted-foreground">{k}</div><div className="font-display text-3xl">{v}</div></Card>))}
      </div>
      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap h-auto"><TabsTrigger value="sales">Sales</TabsTrigger><TabsTrigger value="orders">Live orders</TabsTrigger><TabsTrigger value="events">Event permits</TabsTrigger><TabsTrigger value="att">Attendance</TabsTrigger></TabsList>
        <TabsContent value="sales" className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4 lg:col-span-2"><h2 className="mb-2 text-xl">Daily sales</h2>
            <ResponsiveContainer width="100%" height={260}><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" /><YAxis /><Tooltip formatter={(v) => `₹${v}`} /><Bar dataKey="sales" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
          <Card className="p-4"><h2 className="mb-2 text-xl">Payments (Cash / Card / UPI)</h2>
            <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={payMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} label>{payMix.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip formatter={(v) => `₹${v}`} /><Legend /></PieChart></ResponsiveContainer></Card>
          <Card className="p-4"><h2 className="mb-2 text-xl">Best-selling dishes</h2>
            <ResponsiveContainer width="100%" height={260}><BarChart data={best} layout="vertical" margin={{ left: 40 }}><XAxis type="number" /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="qty" fill="var(--chart-2)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Card>
        </TabsContent>
        <TabsContent value="orders"><Card className="p-2"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Customer</TableHead><TableHead>Type</TableHead><TableHead>For</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{orders.filter((o) => o.status !== "paid" || o.createdAt > Date.now() - DAY).slice().reverse().map((o) => <TableRow key={o.id}><TableCell>{o.id}</TableCell><TableCell>{o.customer}</TableCell><TableCell>{o.type}</TableCell><TableCell>{fmt(o.scheduledFor)}</TableCell><TableCell>₹{o.total}</TableCell><TableCell><Badge variant="outline">{o.status}{o.payment ? ` · ${o.payment}` : ""}</Badge></TableCell></TableRow>)}</TableBody></Table></Card></TabsContent>
        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-primary" />
                Event Booking Permits & Catering Slots
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review celebration bookings, verify guest counts and 40% advance deposits, and grant or decline permits.
              </p>
            </div>
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
              <Button
                size="sm"
                variant={eventFilter === "all" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setEventFilter("all")}
              >
                All ({events.length})
              </Button>
              <Button
                size="sm"
                variant={eventFilter === "pending" ? "default" : "outline"}
                className={cn(
                  "h-8 text-xs relative",
                  pendingEvents.length > 0 && eventFilter !== "pending" && "border-amber-500/60 text-amber-600 dark:text-amber-400 font-semibold"
                )}
                onClick={() => setEventFilter("pending")}
              >
                Pending ({pendingEvents.length})
                {pendingEvents.length > 0 && (
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </Button>
              <Button
                size="sm"
                variant={eventFilter === "confirmed" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setEventFilter("confirmed")}
              >
                Approved ({confirmedEvents.length})
              </Button>
              <Button
                size="sm"
                variant={eventFilter === "history" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setEventFilter("history")}
              >
                History ({historyEvents.length})
              </Button>
            </div>
          </div>

          {/* Pending Action Banner */}
          {pendingEvents.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-semibold">{pendingEvents.length} booking request{pendingEvents.length > 1 ? "s" : ""} awaiting your permit decision</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Click "Grant permit" below to lock in the reservation and notify staff, or "Decline" if fully booked.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0 self-start sm:self-auto"
                onClick={() => setEventFilter("pending")}
              >
                View Pending Only
              </Button>
            </div>
          )}

          {filteredEvents.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <PartyPopper className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium text-sm">No events found in this view.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {eventFilter === "pending"
                  ? "Great job! All booking requests have been reviewed."
                  : "Bookings created by customers will appear here."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-3.5">
              {filteredEvents.map((e) => {
                const isPending = e.status === "pending-permit";
                const isConfirmed = e.status === "confirmed";
                const isRejected = e.status === "rejected";
                const isCancelled = e.status === "cancelled";
                const balanceDue = e.total - e.deposit;

                return (
                  <Card
                    key={e.id}
                    className={cn(
                      "p-4 sm:p-5 transition-all space-y-4",
                      isPending && "border-amber-500/40 bg-card shadow-sm ring-1 ring-amber-500/20",
                      isConfirmed && "border-emerald-500/30 bg-card",
                      (isRejected || isCancelled) && "opacity-75 bg-muted/30"
                    )}
                  >
                    {/* Top Row: Occasion, Name, Phone & Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl" role="img" aria-label={e.occasion}>
                          {getOccasionEmoji(e.occasion)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base text-foreground">{e.customer}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {e.occasion}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{e.phone}</span>
                            <span className="text-[10px] text-muted-foreground/60">· ID: #{e.id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="self-start sm:self-auto shrink-0">
                        {isPending && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1.5 py-1 px-2.5 font-medium">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            Action Required · Pending Review
                          </Badge>
                        )}
                        {isConfirmed && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 py-1 px-2.5 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Permit Granted · Confirmed
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="destructive" className="gap-1.5 py-1 px-2.5 font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            Permit Declined / Rejected
                          </Badge>
                        )}
                        {isCancelled && (
                          <Badge variant="outline" className="text-muted-foreground gap-1.5 py-1 px-2.5">
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            Cancelled by Customer
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: 4 Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="rounded-lg bg-secondary/50 p-2.5">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                          <Calendar className="h-3 w-3" /> Event Date & Time
                        </div>
                        <div className="font-medium text-foreground">{fmt(e.date)}</div>
                      </div>

                      <div className="rounded-lg bg-secondary/50 p-2.5">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                          <Users className="h-3 w-3" /> Expected Guests
                        </div>
                        <div className="font-semibold text-foreground text-sm">{e.guests} People</div>
                      </div>

                      <div className="rounded-lg bg-secondary/50 p-2.5">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                          <Receipt className="h-3 w-3" /> Total Estimate
                        </div>
                        <div className="font-semibold text-foreground text-sm">₹{e.total.toLocaleString()}</div>
                      </div>

                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                        <div className="text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mb-1">
                          <ShieldCheck className="h-3 w-3" /> Advance Deposit
                        </div>
                        <div className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">
                          ₹{e.deposit.toLocaleString()} <span className="text-[10px] font-normal">(40% Paid)</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Bal: ₹{balanceDue.toLocaleString()} at event
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Section: Clear Callout for Pending */}
                    {isPending && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-xs text-amber-900 dark:text-amber-200">
                          <span className="font-semibold">Grant Permit? </span>
                          <span>Approving this booking locks the date on the calendar and alerts the kitchen & catering team.</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm"
                            onClick={() => handleGrantPermit(e.id, e.customer)}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Grant Permit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
                            onClick={() => handleRejectPermit(e.id, e.customer)}
                          >
                            <XCircle className="h-4 w-4" /> Decline
                          </Button>
                        </div>
                      </div>
                    )}

                    {isConfirmed && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Booking verified & permit active on restaurant calendar
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRejectPermit(e.id, e.customer)}
                          className="text-[11px] text-muted-foreground hover:text-destructive underline transition-colors"
                        >
                          Revoke permit
                        </button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="att"><Card className="p-2"><Table><TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Role</TableHead><TableHead>Today in</TableHead><TableHead>Today out</TableHead><TableHead>Days present (7d)</TableHead><TableHead>Late (7d)</TableHead></TableRow></TableHeader>
          <TableBody>{STAFF.map((s) => { const recs = attendance.filter((a) => a.name === s.name); const t = recs.find((a) => a.date === today); return (
            <TableRow key={s.name}><TableCell>{s.name}</TableCell><TableCell>{s.role}</TableCell><TableCell>{t?.checkIn ?? <Badge variant="destructive">Absent</Badge>}</TableCell><TableCell>{t?.checkOut ?? "—"}</TableCell><TableCell>{recs.length}</TableCell><TableCell>{recs.filter((a) => (a.checkIn ?? "") > "09:15").length}</TableCell></TableRow>); })}</TableBody></Table></Card></TabsContent>
      </Tabs>
    </main>
  );
}
