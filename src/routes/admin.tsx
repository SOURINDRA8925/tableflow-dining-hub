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
        <TabsContent value="events" className="space-y-3">
          {events.length === 0 && <p className="text-muted-foreground">No events.</p>}
          {events.map((e) => <Card key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><div className="font-medium">{e.occasion} · {e.customer} ({e.phone})</div><div className="text-sm text-muted-foreground">{fmt(e.date)} · {e.guests} guests · ₹{e.total} (advance ₹{e.deposit} paid)</div></div>
            <div className="flex items-center gap-2"><Badge variant="outline">{e.status}</Badge>
              {e.status === "pending-permit" && <><Button size="sm" onClick={() => set((s) => ({ ...s, events: s.events.map((x) => x.id === e.id ? { ...x, status: "confirmed" } : x) }))}>Grant permit</Button>
                <Button size="sm" variant="outline" onClick={() => set((s) => ({ ...s, events: s.events.map((x) => x.id === e.id ? { ...x, status: "rejected" } : x) }))}>Reject</Button></>}</div></Card>)}
        </TabsContent>
        <TabsContent value="att"><Card className="p-2"><Table><TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Role</TableHead><TableHead>Today in</TableHead><TableHead>Today out</TableHead><TableHead>Days present (7d)</TableHead><TableHead>Late (7d)</TableHead></TableRow></TableHeader>
          <TableBody>{STAFF.map((s) => { const recs = attendance.filter((a) => a.name === s.name); const t = recs.find((a) => a.date === today); return (
            <TableRow key={s.name}><TableCell>{s.name}</TableCell><TableCell>{s.role}</TableCell><TableCell>{t?.checkIn ?? <Badge variant="destructive">Absent</Badge>}</TableCell><TableCell>{t?.checkOut ?? "—"}</TableCell><TableCell>{recs.length}</TableCell><TableCell>{recs.filter((a) => (a.checkIn ?? "") > "09:15").length}</TableCell></TableRow>); })}</TableBody></Table></Card></TabsContent>
      </Tabs>
    </main>
  );
}
