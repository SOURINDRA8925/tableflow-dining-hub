import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore, priceOf, STAFF, dayKey, type Order, type Payment } from "@/lib/store";
import { ItemPicker, cartItems } from "@/components/ItemPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fingerprint } from "lucide-react";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [
    { title: "Staff Console — Masala House" },
    { name: "description", content: "Waiter, cook and cashier screens for taking orders, cooking and payments." },
    { property: "og:title", content: "Staff Console — Masala House" },
    { property: "og:description", content: "Waiter, cook and cashier screens." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: StaffPage,
});

const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function OrderCard({ o, children }: { o: Order; children?: React.ReactNode }) {
  const { menu } = useStore();
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between"><span className="font-semibold">#{o.id} · {o.table ? `Table ${o.table}` : o.customer}</span><Badge variant="outline">{o.type}</Badge></div>
      <ul className="text-sm">{o.items.map((i) => { const m = menu.find((x) => x.id === i.id); return <li key={i.id}>{i.qty} × {m?.name}</li>; })}</ul>
      <div className="text-xs text-muted-foreground">For {time(o.scheduledFor)} · ₹{o.total} · {o.status}</div>
      {children}
    </Card>
  );
}

function Waiter() {
  const { menu, orders, set, uid } = useStore();
  const [table, setTable] = useState(""); const [cart, setCart] = useState<Record<string, number>>({});
  const items = cartItems(cart);
  const send = () => {
    if (!table || !items.length) return toast.error("Enter table and dishes.");
    set((s) => ({ ...s, menu: s.menu.map((m) => ({ ...m, portions: m.portions - (cart[m.id] ?? 0) })),
      orders: [...s.orders, { id: uid(), source: "staff", type: "table", customer: `Table ${table}`, table, items, scheduledFor: Date.now(), createdAt: Date.now(), status: "placed", total: priceOf(s.menu, items) }] }));
    setCart({}); setTable(""); toast.success("Sent to kitchen & cashier");
  };
  const ready = orders.filter((o) => o.status === "ready");
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card className="space-y-4 p-5">
        <h2 className="text-2xl">New table order</h2>
        <Input placeholder="Table number" value={table} onChange={(e) => setTable(e.target.value)} inputMode="numeric" />
        <ItemPicker menu={menu} cart={cart} setCart={setCart} />
        <Button className="w-full" size="lg" onClick={send}>Send order · ₹{priceOf(menu, items)}</Button>
      </Card>
      <div className="space-y-3"><h2 className="text-2xl">Ready to serve</h2>
        {ready.length === 0 && <p className="text-sm text-muted-foreground">Nothing ready yet.</p>}
        {ready.map((o) => <OrderCard key={o.id} o={o}><Button size="sm" onClick={() => set((s) => ({ ...s, orders: s.orders.map((x) => x.id === o.id ? { ...x, status: "served" } : x) }))}>Mark served</Button></OrderCard>)}
      </div>
    </div>
  );
}

function Cook() {
  const { orders, set } = useStore();
  const move = (id: string, status: Order["status"]) => set((s) => ({ ...s, orders: s.orders.map((x) => x.id === id ? { ...x, status } : x) }));
  const cols: { s: Order["status"]; label: string; next?: Order["status"]; btn?: string }[] = [
    { s: "placed", label: "New", next: "cooking", btn: "Start cooking" }, { s: "cooking", label: "Cooking", next: "ready", btn: "Ready" }, { s: "ready", label: "Ready" }];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cols.map((c) => (
        <div key={c.s} className="space-y-3 rounded-xl bg-secondary p-3"><h2 className="text-xl">{c.label}</h2>
          {orders.filter((o) => o.status === c.s).sort((a, b) => a.scheduledFor - b.scheduledFor).map((o) => (
            <OrderCard key={o.id} o={o}>{c.next && <Button size="sm" onClick={() => move(o.id, c.next!)}>{c.btn}</Button>}</OrderCard>))}
        </div>
      ))}
    </div>
  );
}

function Cashier() {
  const { orders, set } = useStore();
  const pay = (id: string, p: Payment) => { set((s) => ({ ...s, orders: s.orders.map((x) => x.id === id ? { ...x, status: "paid", payment: p } : x) })); toast.success(`Paid by ${p.toUpperCase()}`); };
  const open = orders.filter((o) => o.status !== "paid");
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {open.length === 0 && <p className="text-muted-foreground">No unpaid orders.</p>}
      {open.map((o) => <OrderCard key={o.id} o={o}><div className="flex gap-2">{(["cash", "card", "upi"] as const).map((p) => <Button key={p} size="sm" variant="outline" onClick={() => pay(o.id, p)}>{p.toUpperCase()}</Button>)}</div></OrderCard>)}
    </div>
  );
}

function Portions() {
  const { menu, set } = useStore();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {menu.map((m) => (
        <Card key={m.id} className="flex items-center justify-between p-4">
          <span>{m.emoji} {m.name}</span>
          <Input type="number" min={0} className="w-24" value={m.portions} aria-label={`${m.name} portions`}
            onChange={(e) => set((s) => ({ ...s, menu: s.menu.map((x) => x.id === m.id ? { ...x, portions: Math.max(0, +e.target.value) } : x) }))} />
        </Card>
      ))}
    </div>
  );
}

function Biometric() {
  const { attendance, set, uid } = useStore();
  const today = dayKey(Date.now());
  const scan = (name: string, role: (typeof STAFF)[number]["role"]) => {
    const now = new Date().toTimeString().slice(0, 5);
    set((s) => {
      const rec = s.attendance.find((a) => a.name === name && a.date === today);
      if (!rec) return { ...s, attendance: [...s.attendance, { id: uid(), name, role, date: today, checkIn: now }] };
      return { ...s, attendance: s.attendance.map((a) => a === rec ? { ...a, checkOut: now } : a) };
    });
    toast.success(`Fingerprint matched: ${name}`);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Simulates the biometric scanner. In the real system, the device sends check-ins automatically.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAFF.map((s) => { const r = attendance.find((a) => a.name === s.name && a.date === today); return (
          <Card key={s.name} className="space-y-2 p-4"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.role} · In {r?.checkIn ?? "—"} · Out {r?.checkOut ?? "—"}</div>
            <Button size="sm" variant="outline" onClick={() => scan(s.name, s.role)}><Fingerprint className="mr-1 h-4 w-4" />Scan</Button></Card>); })}
      </div>
    </div>
  );
}

function StaffPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-4xl">Staff console</h1>
      <Tabs defaultValue="waiter">
        <TabsList className="flex-wrap h-auto"><TabsTrigger value="waiter">Waiter</TabsTrigger><TabsTrigger value="cook">Cook</TabsTrigger><TabsTrigger value="cashier">Cashier</TabsTrigger><TabsTrigger value="portions">Portions</TabsTrigger><TabsTrigger value="bio">Attendance</TabsTrigger></TabsList>
        <TabsContent value="waiter"><Waiter /></TabsContent>
        <TabsContent value="cook"><Cook /></TabsContent>
        <TabsContent value="cashier"><Cashier /></TabsContent>
        <TabsContent value="portions"><Portions /></TabsContent>
        <TabsContent value="bio"><Biometric /></TabsContent>
      </Tabs>
    </main>
  );
}
