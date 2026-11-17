import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DAY, HOUR } from "./rules";

export type Payment = "cash" | "card" | "upi";
export type MenuItem = { id: string; name: string; price: number; category: string; portions: number; emoji: string };
export type OrderStatus = "placed" | "cooking" | "ready" | "served" | "paid";
export type Order = {
  id: string; source: "customer" | "staff"; type: "dine-in" | "takeaway" | "table";
  customer: string; table?: string; items: { id: string; qty: number }[];
  scheduledFor: number; createdAt: number; status: OrderStatus; payment?: Payment; total: number;
};
export type EventBooking = {
  id: string; customer: string; phone: string; occasion: string; date: number; guests: number;
  total: number; deposit: number; status: "pending-permit" | "confirmed" | "rejected" | "cancelled";
};
export type Attendance = { id: string; name: string; role: "Cashier" | "Cook" | "Waiter"; date: string; checkIn?: string; checkOut?: string | undefined };
type State = { menu: MenuItem[]; orders: Order[]; events: EventBooking[]; attendance: Attendance[] };

const MENU: MenuItem[] = [
  { id: "m1", name: "Chicken Biryani", price: 280, category: "Mains", portions: 10, emoji: "🍛" },
  { id: "m2", name: "Paneer Butter Masala", price: 240, category: "Mains", portions: 8, emoji: "🧈" },
  { id: "m3", name: "Masala Dosa", price: 140, category: "South Indian", portions: 12, emoji: "🥞" },
  { id: "m4", name: "Fish Curry & Rice", price: 320, category: "Mains", portions: 5, emoji: "🐟" },
  { id: "m5", name: "Veg Thali", price: 200, category: "Thali", portions: 7, emoji: "🍱" },
  { id: "m6", name: "Butter Naan", price: 50, category: "Breads", portions: 30, emoji: "🫓" },
  { id: "m7", name: "Gulab Jamun", price: 90, category: "Desserts", portions: 15, emoji: "🍮" },
  { id: "m8", name: "Mango Lassi", price: 110, category: "Drinks", portions: 0, emoji: "🥭" },
];
export const STAFF: { name: string; role: Attendance["role"] }[] = [
  { name: "Ravi Kumar", role: "Cashier" }, { name: "Anita Roy", role: "Cashier" },
  { name: "Suresh Pal", role: "Cook" }, { name: "Meena Das", role: "Cook" }, { name: "Imran Ali", role: "Cook" },
  { name: "Arjun Sen", role: "Waiter" }, { name: "Priya Ghosh", role: "Waiter" }, { name: "Rahul Bose", role: "Waiter" },
];

export const priceOf = (menu: MenuItem[], items: Order["items"]) =>
  items.reduce((s, i) => s + (menu.find((m) => m.id === i.id)?.price ?? 0) * i.qty, 0);
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
export const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

function seed(): State {
  const now = Date.now();
  let r = 7;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const pays: Payment[] = ["cash", "card", "upi", "upi"];
  const orders: Order[] = [];
  for (let d = 13; d >= 1; d--) {
    const n = 6 + Math.floor(rnd() * 8);
    for (let k = 0; k < n; k++) {
      const items = [{ id: MENU[Math.floor(rnd() * 7)]!.id, qty: 1 + Math.floor(rnd() * 3) }, { id: "m6", qty: Math.floor(rnd() * 4) }].filter((i) => i.qty);
      const t = now - d * DAY + k * HOUR;
      orders.push({ id: uid(), source: rnd() > 0.5 ? "staff" : "customer", type: rnd() > 0.7 ? "takeaway" : "table", customer: "Walk-in", items, scheduledFor: t, createdAt: t, status: "paid", payment: pays[Math.floor(rnd() * 4)]!, total: priceOf(MENU, items) });
    }
  }
  orders.push(
    { id: uid(), source: "staff", type: "table", customer: "Table 4", table: "4", items: [{ id: "m1", qty: 2 }, { id: "m6", qty: 4 }], scheduledFor: now, createdAt: now - 600000, status: "cooking", total: priceOf(MENU, [{ id: "m1", qty: 2 }, { id: "m6", qty: 4 }]) },
    { id: uid(), source: "customer", type: "takeaway", customer: "Sneha", items: [{ id: "m3", qty: 3 }], scheduledFor: now + 2 * HOUR, createdAt: now - 3600000, status: "placed", total: 420 },
  );
  const attendance: Attendance[] = [];
  for (let d = 6; d >= 0; d--) for (const s of STAFF) {
    if (rnd() < 0.12) continue;
    const late = rnd() < 0.2;
    attendance.push({ id: uid(), name: s.name, role: s.role, date: dayKey(now - d * DAY), checkIn: late ? "09:4" + Math.floor(rnd() * 9) : "08:5" + Math.floor(rnd() * 9), checkOut: d === 0 ? undefined : "18:0" + Math.floor(rnd() * 9) });
  }
  return {
    menu: MENU, orders, attendance,
    events: [{ id: uid(), customer: "Kabir Mehta", phone: "98300 12345", occasion: "Birthday", date: now + 3.5 * DAY, guests: 45, total: 22500, deposit: 9000, status: "pending-permit" }],
  };
}

const KEY = "resto-proto-v1";
type Ctx = State & { set: (fn: (s: State) => State) => void; reset: () => void; uid: () => string };
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => seed());
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setState(JSON.parse(raw)); else localStorage.setItem(KEY, JSON.stringify(state));
    const onStorage = (e: StorageEvent) => { if (e.key === KEY && e.newValue) setState(JSON.parse(e.newValue)); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (fn: (s: State) => State) => setState((s) => { const n = fn(s); localStorage.setItem(KEY, JSON.stringify(n)); return n; });
  const reset = () => { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); setState(s); };
  return <C.Provider value={{ ...state, set, reset, uid }}>{children}</C.Provider>;
}
export function useStore() { const c = useContext(C); if (!c) throw new Error("no store"); return c; }
