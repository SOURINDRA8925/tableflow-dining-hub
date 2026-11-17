import { Link } from "@tanstack/react-router";
import { UtensilsCrossed } from "lucide-react";

const links = [
  { to: "/", label: "Today's Menu" },
  { to: "/order", label: "Order & Events" },
  { to: "/staff", label: "Staff" },
  { to: "/admin", label: "Admin" },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-xl text-primary">
          <UtensilsCrossed className="h-5 w-5" /> Masala House
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: true }}
              className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
