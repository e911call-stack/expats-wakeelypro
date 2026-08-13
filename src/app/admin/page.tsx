import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Briefcase,
  FileText,
  Gavel,
  Users,
  CreditCard,
  Landmark,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  const [
    servicesCount,
    mattersCount,
    lawyersCount,
    usersCount,
    paymentsCount,
    sourcesCount,
    openMatters,
  ] = await Promise.all([
    prisma.legalService.count({ where: { isActive: true } }),
    prisma.legalMatter.count(),
    prisma.lawyerProfile.count(),
    prisma.user.count(),
    prisma.payment.count(),
    prisma.officialSource.count({ where: { isActive: true } }),
    prisma.legalMatter.count({
      where: {
        status: {
          notIn: ["delivered", "cancelled", "closed", "resolved"],
        },
      },
    }),
  ]);

  const cards = [
    {
      href: "/admin/services",
      titleAr: "الخدمات",
      titleEn: "Services",
      value: servicesCount,
      icon: Briefcase,
      hintAr: "النشطة في الكتالوج",
      hintEn: "Active in catalog",
    },
    {
      href: "/admin/matters",
      titleAr: "القضايا",
      titleEn: "Matters",
      value: mattersCount,
      icon: FileText,
      hintAr: `${openMatters} مفتوحة`,
      hintEn: `${openMatters} open`,
    },
    {
      href: "/admin/lawyers",
      titleAr: "المحامون",
      titleEn: "Lawyers",
      value: lawyersCount,
      icon: Gavel,
      hintAr: "ملفات المحامين",
      hintEn: "Lawyer profiles",
    },
    {
      href: "/admin/users",
      titleAr: "المستخدمون",
      titleEn: "Users",
      value: usersCount,
      icon: Users,
      hintAr: "كل الحسابات",
      hintEn: "All accounts",
    },
    {
      href: "/admin/payments",
      titleAr: "المدفوعات",
      titleEn: "Payments",
      value: paymentsCount,
      icon: CreditCard,
      hintAr: "سجلات الدفع",
      hintEn: "Payment records",
    },
    {
      href: "/admin/sources",
      titleAr: "المصادر الرسمية",
      titleEn: "Official Sources",
      value: sourcesCount,
      icon: Landmark,
      hintAr: "جهات حكومية",
      hintEn: "Government bodies",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Super Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {session.name}. Full operational control of the platform.
        </p>
        <p className="text-sm text-muted-foreground" dir="rtl">
          أهلاً {session.name}. التحكم الكامل بعمليات المنصة.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href}>
              <Card className="transition-colors hover:border-primary/50 hover:bg-muted/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <span className="block">{c.titleEn}</span>
                    <span className="block text-xs text-muted-foreground" dir="rtl">
                      {c.titleAr}
                    </span>
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{c.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {c.hintEn} · {c.hintAr}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next steps / الخطوات التالية</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            This is the admin shell (structure + navigation + role protection).
            CRUD screens for Services, Payments, etc. will be added next.
          </p>
          <p dir="rtl">
            هذا هو هيكل لوحة الإدارة (البنية + التنقل + حماية الأدوار).
            شاشات الإدارة الكاملة للخدمات والمدفوعات وغيرها ستُضاف لاحقاً.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
