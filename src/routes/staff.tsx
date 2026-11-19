import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useStore, priceOf, STAFF, dayKey, type Order, type Payment } from "@/lib/store";
import { ItemPicker, cartItems } from "@/components/ItemPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Fingerprint, Lock, User, XCircle, AlertTriangle, Utensils } from "lucide-react";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [
    { title: "Staff Console — Fancy Restaurant & Caterers" },
    { name: "description", content: "Waiter, cook and cashier screens for taking orders, cooking and payments." },
    { property: "og:title", content: "Staff Console — Fancy Restaurant & Caterers" },
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

const TABLES = Array.from({ length: 20 }, (_, i) => String(i + 1));
const WAITERS = STAFF.filter((s) => s.role === "Waiter");

function Waiter() {
  const { menu, orders, tableLocks = {}, set, uid } = useStore();
  const [table, setTable] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});

  // Session ID for this tab / waiter device
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return "w_" + Math.random().toString(36).slice(2, 9);
    let s = sessionStorage.getItem("masala_waiter_session");
    if (!s) {
      s = "w_" + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem("masala_waiter_session", s);
    }
    return s;
  });

  const [currentWaiter, setCurrentWaiter] = useState(() => {
    if (typeof window === "undefined") return WAITERS[0]?.name ?? "Arjun Sen";
    return sessionStorage.getItem("masala_waiter_name") || WAITERS[0]?.name || "Arjun Sen";
  });

  const handleWaiterChange = (name: string) => {
    setCurrentWaiter(name);
    if (typeof window !== "undefined") sessionStorage.setItem("masala_waiter_name", name);
    if (table) {
      set((s) => ({
        ...s,
        tableLocks: {
          ...(s.tableLocks ?? {}),
          [table]: { table, waiterName: name, sessionId, updatedAt: Date.now() },
        },
      }));
    }
  };

  // Inspect engagement and waiter assignment of any table
  const getTableStatus = (t: string) => {
    const activeOrders = orders.filter((o) => o.table === t && o.status !== "paid");
    const hasActiveOrders = activeOrders.length > 0;

    // Find who placed orders on this table (e.g. "Arjun Sen" or "Priya Ghosh")
    const orderWaiter =
      activeOrders.find((o) => o.waiter)?.waiter ||
      activeOrders
        .map((o) => {
          const match = o.customer.match(/\((.*?)\)/);
          return match ? match[1]?.replace(/Add-on\s*·\s*/, "").trim() : undefined;
        })
        .find(Boolean);

    // Active in-progress draft lock
    const lock = tableLocks[t];
    const isLockActive = lock && Date.now() - lock.updatedAt < 5 * 60 * 1000;
    const draftWaiter = isLockActive ? lock.waiterName : undefined;

    // The assigned waiter who owns this table:
    const assignedWaiter = draftWaiter || orderWaiter;
    const isMyTable = assignedWaiter ? assignedWaiter === currentWaiter : false;
    const isOtherWaitersTable = Boolean(assignedWaiter && assignedWaiter !== currentWaiter);

    // If another waiter is occupying this table, ONLY that waiter can take orders!
    if (isOtherWaitersTable) {
      return {
        disabled: true,
        assignedWaiter,
        isMyTable: false,
        isOtherWaitersTable: true,
        hasActiveOrders,
        activeOrders,
        label: `Occupied by ${assignedWaiter} (Only ${assignedWaiter} can take orders)`,
        badgeText: `Occupied · ${assignedWaiter}`,
        badge: "other-occupied" as const,
      };
    }

    // If this table is occupied by ME (currentWaiter), I can freely take orders or add-on items:
    if (isMyTable) {
      return {
        disabled: false,
        assignedWaiter,
        isMyTable: true,
        isOtherWaitersTable: false,
        hasActiveOrders,
        activeOrders,
        label: hasActiveOrders
          ? `Your Table (${assignedWaiter}) · Occupied (Add-on Mode)`
          : `Your Table (${assignedWaiter}) · Active Draft`,
        badgeText: hasActiveOrders ? `Your Table (Occupied)` : `Your Table`,
        badge: "mine" as const,
      };
    }

    // Free / Available table (any waiter can seat a customer and occupy it):
    return {
      disabled: false,
      assignedWaiter: undefined,
      isMyTable: false,
      isOtherWaitersTable: false,
      hasActiveOrders: false,
      activeOrders: [],
      label: "Available",
      badgeText: "Available",
      badge: "available" as const,
    };
  };

  // When clicking or changing table
  const selectAndLockTable = (t: string) => {
    if (!t) {
      releaseCurrentTable();
      return;
    }
    const status = getTableStatus(t);
    if (status.isOtherWaitersTable) {
      toast.error(`Table ${t} is occupied by ${status.assignedWaiter}. Only ${status.assignedWaiter} can take orders from this table.`);
      return;
    }

    const prevTable = table;
    setTable(t);

    set((s) => {
      const nextLocks = { ...(s.tableLocks ?? {}) };
      if (prevTable && nextLocks[prevTable]?.sessionId === sessionId) {
        delete nextLocks[prevTable];
      }
      nextLocks[t] = {
        table: t,
        waiterName: currentWaiter,
        sessionId,
        updatedAt: Date.now(),
      };
      return { ...s, tableLocks: nextLocks };
    });

    if (status.hasActiveOrders) {
      toast.info(`Table ${t} open for add-on orders. You can add extra drinks or dishes.`);
    } else {
      toast.success(`Table ${t} assigned to ${currentWaiter}`);
    }
  };

  const releaseCurrentTable = () => {
    if (!table) return;
    const tbl = table;
    setTable("");
    set((s) => {
      const nextLocks = { ...(s.tableLocks ?? {}) };
      if (nextLocks[tbl]?.sessionId === sessionId) {
        delete nextLocks[tbl];
      }
      return { ...s, tableLocks: nextLocks };
    });
    toast(`Table ${tbl} released.`);
  };

  // Cleanup lock on page exit/refresh
  useEffect(() => {
    const handleUnload = () => {
      if (table) {
        try {
          const raw = localStorage.getItem("resto-proto-v1");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.tableLocks?.[table]?.sessionId === sessionId) {
              delete parsed.tableLocks[table];
              localStorage.setItem("resto-proto-v1", JSON.stringify(parsed));
            }
          }
        } catch {}
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [table, sessionId]);

  // Keep lock alive while table is active
  useEffect(() => {
    if (!table) return;
    const timer = setInterval(() => {
      set((s) => {
        const lock = s.tableLocks?.[table];
        if (lock && lock.sessionId === sessionId) {
          return {
            ...s,
            tableLocks: {
              ...s.tableLocks,
              [table]: { ...lock, updatedAt: Date.now() },
            },
          };
        }
        return s;
      });
    }, 25000);
    return () => clearInterval(timer);
  }, [table, sessionId, set]);

  const items = cartItems(cart);
  const activeOrdersForTable = table ? orders.filter((o) => o.table === table && o.status !== "paid") : [];
  const isAddOnOrder = activeOrdersForTable.length > 0;

  const send = (): void => {
    if (!table || !items.length) return void toast.error("Select table and dishes.");
    const sendTbl = table;
    const isAddOn = isAddOnOrder;

    set((s) => {
      const nextLocks = { ...(s.tableLocks ?? {}) };
      delete nextLocks[sendTbl];
      return {
        ...s,
        tableLocks: nextLocks,
        menu: s.menu.map((m) => ({ ...m, portions: m.portions - (cart[m.id] ?? 0) })),
        orders: [
          ...s.orders,
          {
            id: uid(),
            source: "staff",
            type: "table",
            customer: isAddOn
              ? `Table ${sendTbl} (Add-on · ${currentWaiter})`
              : `Table ${sendTbl} (${currentWaiter})`,
            table: sendTbl,
            waiter: currentWaiter,
            items,
            scheduledFor: Date.now(),
            createdAt: Date.now(),
            status: "placed",
            total: priceOf(s.menu, items),
          },
        ],
      };
    });
    setCart({});
    setTable("");
    toast.success(
      isAddOn
        ? `Added extra items to Table ${sendTbl} and dispatched to kitchen!`
        : `Sent order for Table ${sendTbl} to kitchen & cashier`
    );
  };

  const ready = orders.filter((o) => o.status === "ready");
  const otherOccupiedTables = TABLES.filter((t) => getTableStatus(t).isOtherWaitersTable);
  const myTables = TABLES.filter((t) => getTableStatus(t).isMyTable);
  const freeTables = TABLES.filter((t) => getTableStatus(t).badge === "available");

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <Card className="space-y-4 p-3 sm:p-5 min-w-0">
        <div className="flex items-start sm:items-center justify-between gap-3 border-b border-border pb-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">New table order</h2>
            <p className="text-xs text-muted-foreground">Select an open table to seat guests, or select your occupied table to add items</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/80 px-2.5 py-1 shrink-0 self-start sm:self-center">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium">Waiter:</span>
            <Select value={currentWaiter} onValueChange={handleWaiterChange}>
              <SelectTrigger className="h-7 w-28 border-0 bg-transparent text-xs font-semibold focus:ring-0 p-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAITERS.map((w) => (
                  <SelectItem key={w.name} value={w.name} className="text-xs">
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-1 min-w-0">
            <label className="text-sm font-medium text-foreground min-w-0">
              Select Table{" "}
              {table && (
                <span className="text-primary font-bold break-words">
                  (Table {table} {isAddOnOrder ? "· Add-on Mode" : "assigned to you"})
                </span>
              )}
            </label>
            {table && (
              <button
                type="button"
                onClick={releaseCurrentTable}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors shrink-0"
              >
                <XCircle className="h-3.5 w-3.5" /> Release Table {table}
              </button>
            )}
          </div>

          <Select value={table} onValueChange={selectAndLockTable}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a table..." />
            </SelectTrigger>
            <SelectContent>
              {TABLES.map((t) => {
                const st = getTableStatus(t);
                return (
                  <SelectItem key={t} value={t} disabled={st.disabled}>
                    {st.isOtherWaitersTable
                      ? `Table ${t} — 🔒 Occupied by ${st.assignedWaiter}`
                      : st.isMyTable
                        ? `Table ${t} — 🍽️ Your Table (${st.assignedWaiter}) · Click to order`
                        : `Table ${t} (Available)`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Quick Table Grid (Wraps responsively - NO horizontal scrolling required!) */}
          <div className="pt-1 space-y-1.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-medium text-muted-foreground">Select a table to take orders:</span>
              <span className="text-[11px] text-muted-foreground flex items-center flex-wrap gap-x-2 gap-y-1">
                <span>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />
                  {freeTables.length} Free
                </span>
                {myTables.length > 0 && (
                  <span>
                    <span className="inline-block h-2 w-2 rounded-full bg-primary mr-1" />
                    {myTables.length} Your Table(s)
                  </span>
                )}
                <span>
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1" />
                  {otherOccupiedTables.length} Other Staff's Tables
                </span>
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-1.5 pt-0.5">
              {TABLES.map((t) => {
                const st = getTableStatus(t);
                const isCurrent = table === t;

                return (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    disabled={st.disabled}
                    variant={isCurrent ? "default" : "outline"}
                    className={cn(
                      "h-10 px-1 text-xs font-medium transition-all flex flex-col items-center justify-center min-w-0",
                      isCurrent && "ring-2 ring-primary ring-offset-1 font-bold shadow-sm",
                      st.isOtherWaitersTable &&
                        "cursor-not-allowed border-amber-500/50 bg-amber-500/10 text-amber-900/60 dark:text-amber-200/60 opacity-60 line-through",
                      st.isMyTable &&
                        !isCurrent &&
                        "border-primary/60 bg-primary/10 text-primary hover:bg-primary/20 font-semibold"
                    )}
                    title={st.label}
                    onClick={() => selectAndLockTable(t)}
                  >
                    <div className="flex items-center gap-1 leading-none">
                      {st.isOtherWaitersTable && <Lock className="h-2.5 w-2.5 text-amber-600 shrink-0" />}
                      {st.isMyTable && !isCurrent && <Utensils className="h-2.5 w-2.5 text-primary shrink-0" />}
                      <span>T-{t}</span>
                    </div>
                    {st.isOtherWaitersTable && (
                      <span className="text-[9px] no-underline font-normal truncate max-w-full opacity-80 leading-none mt-0.5">
                        {st.assignedWaiter?.split(" ")[0]}
                      </span>
                    )}
                    {st.isMyTable && !isCurrent && (
                      <span className="text-[9px] font-normal text-primary leading-none mt-0.5">Yours</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Active dining occupied table banner (Add-on mode notice) */}
          {table && isAddOnOrder && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2 font-semibold text-primary">
                <span className="flex items-center gap-1.5 min-w-0 break-words">
                  <Utensils className="h-4 w-4 text-primary shrink-0" />
                  Table {table} — Occupied by You ({currentWaiter}) · Add-on Order Mode
                </span>
                <Badge variant="outline" className="border-primary/50 bg-background/50 text-[10px]">
                  {activeOrdersForTable.length} active ticket(s)
                </Badge>
              </div>
              <div className="text-muted-foreground">
                Current active orders on Table {table}:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {activeOrdersForTable.map((o) => (
                    <li key={o.id}>
                      Ticket #{o.id} ({o.status}):{" "}
                      {o.items.map((i) => `${i.qty}× ${menu.find((m) => m.id === i.id)?.name || i.id}`).join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-foreground font-medium pt-1">
                💡 Only you ({currentWaiter}) can take orders for this table. Select extra items below (like Coke, drinks, extra rotis) to dispatch to kitchen.
              </p>
            </div>
          )}

          {/* Tables occupied by other waiters */}
          {otherOccupiedTables.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 min-w-0 break-words">
              <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-semibold">Tables occupied by other waiters (locked to them): </span>
                {otherOccupiedTables.map((t) => {
                  const st = getTableStatus(t);
                  return (
                    <span key={t} className="mr-2.5 inline-block">
                      <span className="font-medium underline decoration-amber-500">T-{t}</span> ({st.assignedWaiter})
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <ItemPicker menu={menu} cart={cart} setCart={setCart} />
        <Button className="w-full" size="lg" onClick={send}>
          {isAddOnOrder
            ? `Send add-on order to kitchen · ₹${priceOf(menu, items)}`
            : `Send order · ₹${priceOf(menu, items)}`}
        </Button>
      </Card>
      <div className="space-y-3">
        <h2 className="text-2xl">Ready to serve</h2>
        {ready.length === 0 && <p className="text-sm text-muted-foreground">Nothing ready yet.</p>}
        {ready.map((o) => (
          <OrderCard key={o.id} o={o}>
            <Button
              size="sm"
              onClick={() =>
                set((s) => ({
                  ...s,
                  orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: "served" } : x)),
                }))
              }
            >
              Mark served
            </Button>
          </OrderCard>
        ))}
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
    <main className="mx-auto max-w-6xl px-4 py-8 overflow-x-hidden">
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
