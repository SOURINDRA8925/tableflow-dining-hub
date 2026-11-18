import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/store";
import { Minus, Plus } from "lucide-react";

export function ItemPicker({ menu, cart, setCart }: { menu: MenuItem[]; cart: Record<string, number>; setCart: (c: Record<string, number>) => void }) {
  const change = (id: string, d: number, max: number) => {
    const q = Math.max(0, Math.min(max, (cart[id] ?? 0) + d));
    setCart({ ...cart, [id]: q });
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {menu.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0 mr-2"><span className="text-2xl shrink-0">{m.emoji}</span><div className="min-w-0"><div className="font-medium truncate">{m.name}</div><div className="text-xs text-muted-foreground">₹{m.price} · {m.portions} left</div></div></div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => change(m.id, -1, m.portions)} aria-label={`Less ${m.name}`}><Minus className="h-3 w-3" /></Button>
            <span className="w-5 text-center tabular-nums">{cart[m.id] ?? 0}</span>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={m.portions === 0} onClick={() => change(m.id, 1, m.portions)} aria-label={`More ${m.name}`}><Plus className="h-3 w-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
export const cartItems = (cart: Record<string, number>) => Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
