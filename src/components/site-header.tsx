"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session-provider";
import { useLocale } from "@/lib/locale-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Scale, LogOut, User as UserIcon, ChevronDown, Globe, Bell, Shield, Home, Briefcase, FileText, Gavel, Bell as BellIcon, BookOpen } from "lucide-react";

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useSession();
  const { locale, setLocale, t } = useLocale();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let cancelled = false;
    async function fetchUnread() {
      try {
        const r = await fetch("/api/notifications", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setUnread(d.unreadCount ?? 0);
      } catch { /* ignore */ }
    }
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user]);

  if (pathname === "/") return null;

  const navLinks = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/services", label: t("nav.services"), icon: Briefcase },
    { href: "/easy-law", label: locale === "ar" ? "افهم القانون" : "Easy Law", icon: BookOpen },
    { href: "/matters", label: t("nav.matters"), icon: FileText },
    ...(user?.role === "LAWYER" ? [{ href: "/lawyer", label: t("nav.lawyer"), icon: Gavel }] : []),
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: locale === "ar" ? "لوحة الإدارة" : "Admin", icon: Shield }] : []),
    ...(user ? [{ href: "/notifications", label: locale === "ar" ? "الإشعارات" : "Notifications", icon: BellIcon }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="relative h-12 w-[170px] flex-shrink-0 sm:h-14 sm:w-[184px]">
              <Image src="/expat-legal-services-logo.png" alt="خدمات المغتربين القانونية" fill sizes="(max-width: 640px) 170px, 184px" className="object-contain object-center" priority />
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.filter(l => l.href !== "/notifications").map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="gap-1.5 px-2"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{locale === "ar" ? "EN" : "ع"}</span>
          </Button>

          {user && (
            <Link href="/notifications" className="relative inline-flex">
              <Button variant="ghost" size="sm" className="px-2" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -end-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Button>
            </Link>
          )}

          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 px-2 sm:gap-2 sm:px-3">
                  {user.role === "ADMIN" ? <Shield className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                  <span className="max-w-[80px] truncate sm:max-w-[120px]">{user.name}</span>
                  <Badge variant="secondary" className="hidden text-[10px] sm:inline">{user.role}</Badge>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {user.phone}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/matters">
                  <DropdownMenuItem>{t("nav.matters")}</DropdownMenuItem>
                </Link>
                <Link href="/notifications">
                  <DropdownMenuItem>
                    <Bell className="me-2 h-3.5 w-3.5" />
                    {locale === "ar" ? "الإشعارات" : "Notifications"}
                    {unread > 0 && <Badge variant="destructive" className="ms-auto text-[10px]">{unread}</Badge>}
                  </DropdownMenuItem>
                </Link>
                {user.role === "LAWYER" && (
                  <Link href="/lawyer">
                    <DropdownMenuItem>{t("nav.lawyer")}</DropdownMenuItem>
                  </Link>
                )}
                {user.role === "ADMIN" && (
                  <Link href="/admin">
                    <DropdownMenuItem>
                      <Shield className="me-2 h-3.5 w-3.5" />
                      {locale === "ar" ? "لوحة الإدارة" : "Admin"}
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="me-2 h-3.5 w-3.5" />
                  {t("nav.signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth/signin">
              <Button size="sm" className="px-3">{t("nav.signin")}</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
