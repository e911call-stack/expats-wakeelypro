"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Scale, LogOut, User as UserIcon, ChevronDown, Globe, Bell, Shield, Menu, Home, Briefcase, FileText, Gavel, Bell as BellIcon } from "lucide-react";

export function SiteHeader() {
  const { user, loading, signOut, refresh } = useSession();
  const { locale, setLocale, t } = useLocale();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const navLinks = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/services", label: t("nav.services"), icon: Briefcase },
    { href: "/matters", label: t("nav.matters"), icon: FileText },
    ...(user?.role === "LAWYER" ? [{ href: "/lawyer", label: t("nav.lawyer"), icon: Gavel }] : []),
    ...(user?.role === "ADMIN" ? [{ href: "/admin/matters", label: locale === "ar" ? "إسناد المحامين" : "Assign Lawyers", icon: Shield }] : []),
    ...(user ? [{ href: "/notifications", label: locale === "ar" ? "الإشعارات" : "Notifications", icon: BellIcon }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden p-2" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={locale === "ar" ? "right" : "left"} className="w-72">
              <SheetHeader>
                <SheetTitle className={locale === "ar" ? "text-right" : "text-left"}>
                  {locale === "ar" ? "القائمة" : "Menu"}
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1">
                {navLinks.map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{l.label}</span>
                      {l.href === "/notifications" && unread > 0 && (
                        <Badge variant="destructive" className="text-[10px]">{unread}</Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-bold tracking-tight sm:inline truncate">
              {locale === "ar" ? "خدمات المغتربين القانونية" : "Expats WakeelyPro"}
            </span>
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
                  <Link href="/admin/matters">
                    <DropdownMenuItem>
                      <Shield className="me-2 h-3.5 w-3.5" />
                      {locale === "ar" ? "إسناد المحامين" : "Assign Lawyers"}
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
