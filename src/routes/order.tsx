import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore, priceOf } from "@/lib/store";
import { ItemPicker, cartItems } from "@/components/ItemPicker";
import { validateOrderTime, validateEventDate, eventDeposit, canCancelEvent, needsPermit, BIG_EVENT_GUESTS } from "@/lib/rules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/order")({
  head: () => ({ meta: [
    { title: "Order Ahead & Book Events — Masala House" },
    { name: "description", content: "Pre-order food 3 hours ahead, takeaway with 1 hour notice, or book birthdays 3–4 days ahead." },
    { property: "og:title", content: "Order Ahead & Book Events — Masala House" },
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
  const [f, setF] = useState({ customer: "", phone: "", occasion: "Birthday", date: "", guests: 20, perHead: 500 });
  const total = f.guests * f.perHead; const deposit = eventDeposit(total);
  const submit = (): void => {
    if (!f.customer || !f.phone || !f.date) return void toast.error("Fill in name, phone and date.");
    const err = validateEventDate(new Date(f.date)); if (err) return void toast.error(err);
    const big = needsPermit(f.guests);
    set((s) => ({ ...s, events: [...s.events, { id: uid(), customer: f.customer, phone: f.phone, occasion: f.occasion, date: new Date(f.date).getTime(), guests: f.guests, total, deposit, status: big ? "pending-permit" : "confirmed" }] }));
    toast.success(`Deposit ₹${deposit} paid (demo). ${big ? "Waiting for admin permit." : "Event confirmed!"}`);
  };
  return (
    <Card className="space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Name</Label><Input value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>Occasion</Label><Input value={f.occasion} onChange={(e) => setF({ ...f, occasion: e.target.value })} /></div>
        <div><Label>Date & time (3–4 days ahead)</Label><Input type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        <div><Label>Guests</Label><Input type="number" min={1} value={f.guests} onChange={(e) => setF({ ...f, guests: +e.target.value })} /></div>
        <div><Label>Package per head (₹)</Label><Input type="number" value={f.perHead} onChange={(e) => setF({ ...f, perHead: +e.target.value })} /></div>
      </div>
      <div className="rounded-lg bg-secondary p-4 text-sm">
        <div className="flex justify-between"><span>Estimated total</span><span>₹{total}</span></div>
        <div className="flex justify-between font-semibold"><span>Pay now (40%)</span><span>₹{deposit}</span></div>
        <p className="mt-2 text-muted-foreground">You can cancel up to 1 day before. The 40% advance is not refundable. {f.guests >= BIG_EVENT_GUESTS && "Events with " + BIG_EVENT_GUESTS + "+ guests need admin approval."}</p>
      </div>
      <Button onClick={submit}>Pay 40% & book</Button>
    </Card>
  );
}

function MyBookings() {
  const { events, orders, set } = useStore();
  const cancel = (id: string) => set((s) => ({ ...s, events: s.events.map((e) => e.id === id ? { ...e, status: "cancelled" } : e) }));
  const upcoming = orders.filter((o) => o.source === "customer" && o.status !== "paid").slice(-5).reverse();
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <Card key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><div className="font-medium">{e.occasion} · {e.customer}</div><div className="text-sm text-muted-foreground">{fmt(e.date)} · {e.guests} guests · Advance ₹{e.deposit}</div></div>
          <div className="flex items-center gap-2"><Badge variant="outline">{e.status}</Badge>
            {(e.status === "confirmed" || e.status === "pending-permit") && (canCancelEvent(new Date(e.date))
              ? <Button size="sm" variant="outline" onClick={() => { cancel(e.id); toast("Event cancelled. Advance of ₹" + e.deposit + " is not refunded."); }}>Cancel</Button>
              : <span className="text-xs text-muted-foreground">Too late to cancel</span>)}
          </div>
        </Card>
      ))}
      {upcoming.map((o) => <Card key={o.id} className="flex justify-between p-4 text-sm"><span>#{o.id} · {o.type} · {o.customer} · {fmt(o.scheduledFor)}</span><Badge variant="outline">{o.status}</Badge></Card>)}
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
