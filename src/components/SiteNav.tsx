import { Link } from "@tanstack/react-router";
import { Flame, LogOut } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Home" },
  { to: "/guidance", label: "Guidance" },
  { to: "/mirror", label: "Arjuna Mirror" },
  { to: "/verses", label: "Verses" },
  { to: "/journal", label: "Journal" },
];

export function SiteNav() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Flame className="size-5 text-primary" aria-hidden />
          <span className="font-display text-xl font-semibold tracking-tight">
            Wisdom <span className="text-gradient-gold">Weaver</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4" /> Sign out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
