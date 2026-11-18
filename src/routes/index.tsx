import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, PartyPopper, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Today's Menu — Fancy Restaurant & Caterers" },
    { name: "description", content: "See which dishes are available today and how many portions are left." },
    { property: "og:title", content: "Today's Menu — Fancy Restaurant & Caterers" },
    { property: "og:description", content: "See which dishes are available today and how many portions are left." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Index,
});

function Index() {
  const { menu } = useStore();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-10 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">Fresh today</p>
          <h1 className="mt-2 text-5xl leading-tight text-foreground md:text-6xl">What's cooking at Fancy Restaurant & Caterers</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">Live portion counts, updated by our kitchen. Order ahead, pick up a takeaway, or plan your celebration with us.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/order">Order or book an event</Link></Button></div>
        </div>
        <div className="grid gap-3 text-sm">
          {[{ i: Clock, t: "Advance food orders", d: "At least 3 hours ahead" }, { i: ShoppingBag, t: "Takeaway", d: "Tell us 1 hour before" }, { i: PartyPopper, t: "Birthdays & events", d: "3–90 days ahead · 40% advance" }].map(({ i: I, t, d }) => (
            <div key={t} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"><I className="h-5 w-5 text-primary" /><div><div className="font-medium">{t}</div><div className="text-muted-foreground">{d}</div></div></div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {menu.map((m) => (
          <Card key={m.id} className={`p-5 ${m.portions === 0 ? "opacity-50" : ""}`}>
            <div className="text-5xl">{m.emoji}</div>
            <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{m.category}</div>
            <div className="font-display text-xl">{m.name}</div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-semibold">₹{m.price}</span>
              {m.portions === 0 ? <Badge variant="secondary">Sold out</Badge> : <Badge className={m.portions <= 5 ? "bg-warning text-foreground" : "bg-success text-primary-foreground"}>{m.portions} left</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
