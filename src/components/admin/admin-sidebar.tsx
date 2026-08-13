"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-provider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Gavel,
  Users,
  CreditCard,
  Landmark,
  Settings,
  Shield,
  ChevronLeft,
} from "lucide-react";

const NAV = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    labelAr: "لوحة التحكم",
    labelEn: "Dashboard",
    exact: true,
  },
  {
    href: "/admin/services",
    icon: Briefcase,
    labelAr: "الخدمات",
    labelEn: "Services",
  },
  {
    href: "/admin/matters",
    icon: FileText,
    labelAr: "القضايا والإسناد",
    labelEn: "Matters",
  },
  {
    href: "/admin/lawyers",
    icon: Gavel,
    labelAr: "المحامون",
    labelEn: "Lawyers",
  },
  {
    href: "/admin/users",
    icon: Users,
    labelAr: "المستخدمون",
    labelEn: "Users",
  },
  {
    href: "/admin/payments",
    icon: CreditCard,
    labelAr: "المدفوعات",
    labelEn: "Payments",
  },
  {
    href: "/admin/sources",
    icon: Landmark,
    labelAr: "المصادر الرسمية",
    labelEn: "Official Sources",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    labelAr: "الإعدادات",
    labelEn: "Settings",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const ar = locale === "ar";

  return (
    <aside className="flex w-full flex-col border-b bg-muted/30 md:w-60 md:border-b-0 md:border-e md:min-h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Shield className="h-5 w-5 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {ar ? "المشرف العام" : "Super Admin"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {ar ? "التحكم الكامل بالمنصة" : "Full site control"}
          </p>
        </div>
      </div>

      <nav className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">
                {ar ? item.labelAr : item.labelEn}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t p-3 md:block">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {ar ? "العودة للموقع" : "Back to site"}
        </Link>
      </div>
    </aside>
  );
}
