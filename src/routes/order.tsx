import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore, priceOf } from "@/lib/store";
import { ItemPicker, cartItems } from "@/components/ItemPicker";
import { validateOrderTime, validateEventDate, eventDeposit, canCancelEvent } from "@/lib/rules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  PartyPopper,
  Calendar,
  Users,
  Phone,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/order")({
  head: () => ({ meta: [
    { title: "Order Ahead & Book Events — Fancy Restaurant & Caterers" },
    { name: "description", content: "Pre-order food 3 hours ahead, takeaway with 1 hour notice, or book birthdays 3–4 days ahead." },
    { property: "og:title", content: "Order Ahead & Book Events — Fancy Restaurant & Caterers" },
    { property: "og:description", content: "Pre-order food, takeaway, and birthday event bookings." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: OrderPage,
});

const fmt = (t: number) => new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function FoodOrder() {
  const { menu, set, uid } = useStore();
  const [type, setType] = useState<"dine-in" | "takeaway">("dine-in");
  const [name, setName] = useState(""); const [when, setWhen] = useState(""); const [cart, setCart] = useState<Record<string, number>>({});
  const items = cartItems(cart); const total = priceOf(menu, items);
  const submit = (): void => {
    if (!name || !when || !items.length) return void toast.error("Add your name, time and at least one dish.");
    const err = validateOrderTime(type, new Date(when)); if (err) return void toast.error(err);
    set((s) => ({ ...s,
      menu: s.menu.map((m) => ({ ...m, portions: m.portions - (cart[m.id] ?? 0) })),
      orders: [...s.orders, { id: uid(), source: "customer", type, customer: name, items, scheduledFor: new Date(when).getTime(), createdAt: Date.now(), status: "placed", total }] }));
    setCart({}); toast.success(`Order placed for ${fmt(new Date(when).getTime())}. Pay at the counter.`);
  };
  return (
    <Card className="space-y-5 p-6">
      <div className="flex gap-2">{(["dine-in", "takeaway"] as const).map((t) => <Button key={t} variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>{t === "dine-in" ? "Advance order (3h)" : "Takeaway (1h)"}</Button>)}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>{type === "dine-in" ? "Serve at" : "Pick up at"}</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
      </div>
      <ItemPicker menu={menu} cart={cart} setCart={setCart} />
      <div className="flex items-center justify-between border-t border-border pt-4"><span className="text-lg font-semibold">Total ₹{total}</span><Button onClick={submit}>Place order</Button></div>
    </Card>
  );
}

function EventBooking() {
  const { set, uid } = useStore();
  const [f, setF] = useState({
    customer: "",
    phone: "",
    occasion: "Birthday",
    date: "",
    guests: 25,
    perHead: 500,
  });

  const total = Math.max(0, f.guests * f.perHead);
  const deposit = eventDeposit(total);
  const balance = total - deposit;

  const occasions = ["Birthday", "Anniversary", "Corporate Dinner", "Family Gathering", "Celebration"];

  const submit = (): void => {
    if (!f.customer.trim()) return void toast.error("Please enter your name.");
    if (!f.phone.trim()) return void toast.error("Please enter your phone number.");
    if (!f.date) return void toast.error("Please select an event date & time (at least 3 days ahead).");

    const err = validateEventDate(new Date(f.date));
    if (err) return void toast.error(err);

    set((s) => ({
      ...s,
      events: [
        ...s.events,
        {
          id: uid(),
          customer: f.customer.trim(),
          phone: f.phone.trim(),
          occasion: f.occasion,
          date: new Date(f.date).getTime(),
          guests: f.guests,
          total,
          deposit,
          status: "pending-permit",
        },
      ],
    }));

    toast.success(`Booking request submitted! Deposit of ₹${deposit.toLocaleString()} recorded. Waiting for admin permit.`);
  };

  return (
    <Card className="space-y-6 p-5 sm:p-7">
      {/* Header & Flow Guide */}
      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-primary">
          <PartyPopper className="h-6 w-6" />
          <h2 className="text-xl font-semibold text-foreground">Book a Celebration or Catering Event</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Reserve our banquet hall or order outdoor catering for your special day. Book between 3 to 90 days in advance.
        </p>

        {/* 3 Step Visual */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 rounded-md bg-secondary/60 p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              1
            </span>
            <span className="font-medium text-foreground">Enter Guest &amp; Date Details</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-secondary/60 p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              2
            </span>
            <span className="font-medium text-foreground">40% Advance Deposit</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              3
            </span>
            <span className="font-medium text-primary">Admin Grants Permit</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Your Full Name</Label>
          <Input
            placeholder="e.g. Rahul Sharma"
            value={f.customer}
            onChange={(e) => setF({ ...f, customer: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Contact Phone Number</Label>
          <Input
            placeholder="e.g. 98300 12345"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold">Occasion</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {occasions.map((occ) => (
              <button
                key={occ}
                type="button"
                onClick={() => setF({ ...f, occasion: occ })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  f.occasion === occ
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {occ}
              </button>
            ))}
          </div>
          <Input
            placeholder="Or type custom occasion..."
            value={f.occasion}
            onChange={(e) => setF({ ...f, occasion: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Date &amp; Time (3–90 days ahead)</Label>
          <Input
            type="datetime-local"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">Kitchen needs at least 3 days notice to prep catering menus.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Number of Expected Guests</Label>
          <Input
            type="number"
            min={1}
            max={500}
            value={f.guests}
            onChange={(e) => setF({ ...f, guests: Math.max(1, +e.target.value) })}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold">Catering Package Budget per Head (₹)</Label>
          <Input
            type="number"
            step={50}
            min={200}
            value={f.perHead}
            onChange={(e) => setF({ ...f, perHead: Math.max(100, +e.target.value) })}
          />
          <p className="text-[11px] text-muted-foreground">Standard packages start at ₹350–₹750 per head depending on menu selection.</p>
        </div>
      </div>

      {/* Bill & Advance Breakdown */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Booking Estimate &amp; Advance</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-background p-3 border border-border">
            <span className="text-muted-foreground text-[11px]">Total Estimated Bill</span>
            <div className="text-lg font-bold text-foreground mt-0.5">₹{total.toLocaleString()}</div>
            <span className="text-[10px] text-muted-foreground">{f.guests} guests × ₹{f.perHead}</span>
          </div>

          <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/30">
            <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">Pay Now (40% Advance)</span>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">₹{deposit.toLocaleString()}</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Holds your date on calendar</span>
          </div>

          <div className="rounded-lg bg-background p-3 border border-border">
            <span className="text-muted-foreground text-[11px]">Balance at Event</span>
            <div className="text-lg font-bold text-foreground mt-0.5">₹{balance.toLocaleString()}</div>
            <span className="text-[10px] text-muted-foreground">Payable on event day</span>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <span>
            <strong>Policy:</strong> You can cancel up to 24 hours before the event date. The 40% advance deposit is non-refundable. Once submitted, our manager reviews and grants the booking permit.
          </span>
        </div>
      </div>

      <Button size="lg" className="w-full text-sm font-semibold gap-2" onClick={submit}>
        <ShieldCheck className="h-4 w-4" />
        Pay 40% Advance (₹{deposit.toLocaleString()}) &amp; Request Booking Permit
      </Button>
    </Card>
  );
}

function MyBookings() {
  const { events, orders, set } = useStore();
  const cancel = (id: string) =>
    set((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === id ? { ...e, status: "cancelled" } : e)),
    }));

  const upcomingOrders = orders
    .filter((o) => o.source === "customer" && o.status !== "paid")
    .slice(-5)
    .reverse();

  return (
    <div className="space-y-6">
      {/* Event Bookings Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-primary" />
          Your Event &amp; Catering Bookings
        </h3>

        {events.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            You haven't requested any event bookings yet.
          </Card>
        ) : (
          <div className="grid gap-3">
            {events.map((e) => {
              const isPending = e.status === "pending-permit";
              const isConfirmed = e.status === "confirmed";
              const isCancelled = e.status === "cancelled";
              const isRejected = e.status === "rejected";

              return (
                <Card
                  key={e.id}
                  className={cn(
                    "p-4 sm:p-5 space-y-3 border transition-all",
                    isPending && "border-amber-500/40 bg-amber-500/5",
                    isConfirmed && "border-emerald-500/40 bg-emerald-500/5",
                    (isCancelled || isRejected) && "opacity-75 bg-muted/20"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div>
                      <div className="font-semibold text-base text-foreground flex items-center gap-2">
                        <span>{e.occasion}</span>
                        <span className="text-xs text-muted-foreground font-normal">· for {e.customer}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {fmt(e.date)} · {e.guests} guests
                      </div>
                    </div>

                    <div>
                      {isPending && (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1.5 py-1 px-2.5">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          Waiting for Admin Permit
                        </Badge>
                      )}
                      {isConfirmed && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 py-1 px-2.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Permit Granted &amp; Confirmed!
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge variant="destructive" className="gap-1.5 py-1 px-2.5">
                          <XCircle className="h-3.5 w-3.5" />
                          Permit Declined
                        </Badge>
                      )}
                      {isCancelled && (
                        <Badge variant="outline" className="text-muted-foreground gap-1.5 py-1 px-2.5">
                          <XCircle className="h-3.5 w-3.5" />
                          Booking Cancelled
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>Total: <strong className="text-foreground">₹{e.total.toLocaleString()}</strong></span>
                      <span>Advance paid: <strong className="text-emerald-600 dark:text-emerald-400">₹{e.deposit.toLocaleString()}</strong></span>
                      <span>Due at event: <strong className="text-foreground">₹{(e.total - e.deposit).toLocaleString()}</strong></span>
                    </div>

                    {(isConfirmed || isPending) && (
                      <div>
                        {canCancelEvent(new Date(e.date)) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 hover:bg-destructive/10 hover:text-destructive border-border"
                            onClick={() => {
                              cancel(e.id);
                              toast("Event cancelled. Advance of ₹" + e.deposit + " is not refunded.");
                            }}
                          >
                            Cancel booking
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Too late to cancel (&lt;24h)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 rounded px-2.5 py-1">
                      💡 Your request has been sent to our manager. Once kitchen &amp; hall availability is confirmed, the permit status will change to "Permit Granted &amp; Confirmed".
                    </p>
                  )}
                  {isConfirmed && (
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 rounded px-2.5 py-1">
                      🎉 Congratulations! Your booking is locked in. Our team will prepare the banquet and catering for your gathering.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Advance Food Orders Section */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Your Active Takeaway &amp; Dine-in Orders
        </h3>
        {upcomingOrders.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active advance orders.</p>
        ) : (
          upcomingOrders.map((o) => (
            <Card key={o.id} className="flex justify-between items-center p-3.5 text-xs">
              <div>
                <span className="font-semibold text-sm">#{o.id}</span> · {o.type} · {o.customer}
                <div className="text-muted-foreground mt-0.5">{fmt(o.scheduledFor)} · Total ₹{o.total}</div>
              </div>
              <Badge variant="outline">{o.status}</Badge>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function OrderPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-4xl">Order & events</h1>
      <Tabs defaultValue="food">
        <TabsList><TabsTrigger value="food">Food order</TabsTrigger><TabsTrigger value="event">Book an event</TabsTrigger><TabsTrigger value="mine">Bookings</TabsTrigger></TabsList>
        <TabsContent value="food"><FoodOrder /></TabsContent>
        <TabsContent value="event"><EventBooking /></TabsContent>
        <TabsContent value="mine"><MyBookings /></TabsContent>
      </Tabs>
    </main>
  );
}
