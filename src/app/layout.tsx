import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LegalNotice } from "@/components/legal-disclaimer";
import { LocaleProvider } from "@/lib/locale-provider";
import { SessionProvider } from "@/lib/session-provider";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { ArrowUpRight, Briefcase, FileText } from "lucide-react";

export const metadata: Metadata = {
  metadataBase: new URL("https://expats.wakeelypro.com"),
  title: {
    default: "WakeelyPro | Jordan Remote Legal Services",
    template: "%s | WakeelyPro",
  },
  description:
    "Handle Jordanian legal matters remotely from anywhere in the world with bilingual AI-guided intake, document checklists, licensed lawyer matching, and transparent case tracking.",
  keywords: ["Jordan legal services", "Jordanian lawyer", "remote legal services", "power of attorney Jordan", "property Jordan", "inheritance Jordan", "WakeelyPro"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://expats.wakeelypro.com/",
    siteName: "WakeelyPro",
    title: "WakeelyPro | Jordan Remote Legal Services",
    description: "Bilingual, transparent guidance for completing legal matters in Jordan from anywhere in the world.",
    locale: "ar_JO",
    alternateLocale: ["en_US"],
    images: [{ url: "/expat-legal-services-logo.png", width: 736, height: 265, alt: "خدمات المغتربين القانونية" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WakeelyPro | Jordan Remote Legal Services",
    description: "Bilingual remote legal services for Jordanian matters.",
    images: ["/expat-legal-services-logo.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  icons: { icon: "/expat-legal-services-logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        <LocaleProvider initial="ar">
          <SessionProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster />
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="site-footer mt-auto border-t border-[#00516b] bg-[#006c8e] text-white">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.75fr_0.75fr] lg:items-start">
          <div className="space-y-4" dir="rtl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d9f5f2]">خدمات المغتربين القانونية</p>
            <h2 className="max-w-xl text-2xl font-bold leading-tight sm:text-3xl">طريق أوضح لإنجاز معاملاتك القانونية في الأردن.</h2>
            <p className="max-w-xl text-sm leading-7 text-white/85">منصة تقنية تساعدك على فهم الخطوة التالية وتنظيم طلبك والتواصل مع محامين مستقلين مرخّصين.</p>
          </div>
          <div className="space-y-3" dir="rtl">
            <p className="text-sm font-bold text-[#d9f5f2]">روابط سريعة</p>
            <Link href="/services" className="flex items-center gap-2 text-sm text-white/90 transition hover:text-white"><Briefcase className="h-4 w-4" />الخدمات والإجراءات<ArrowUpRight className="h-3.5 w-3.5" /></Link>
            <Link href="/intake" className="flex items-center gap-2 text-sm text-white/90 transition hover:text-white"><FileText className="h-4 w-4" />ابدأ طلبك<ArrowUpRight className="h-3.5 w-3.5" /></Link>
            <Link href="/legal-disclaimer" className="flex items-center gap-2 text-sm text-white/90 transition hover:text-white">إخلاء المسؤولية<ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="space-y-3" dir="ltr">
            <p className="text-sm font-bold text-[#d9f5f2]">Quick links</p>
            <Link href="/services" className="flex items-center gap-2 text-sm text-white/90 transition hover:text-white"><Briefcase className="h-4 w-4" />Services and procedures<ArrowUpRight className="h-3.5 w-3.5" /></Link>
            <Link href="/intake" className="flex items-center gap-2 text-sm text-white/90 transition hover:text-white"><FileText className="h-4 w-4" />Start your request<ArrowUpRight className="h-3.5 w-3.5" /></Link>
            <Link href="/legal-disclaimer" className="flex items-center gap-2 text-sm text-white/90 transition hover:text-white">Legal disclaimer<ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
        <div className="mt-8 border-t border-white/20 pt-5">
          <LegalNotice className="footer-legal-notice" />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/70" dir="ltr">
            <p><strong className="text-white">Jordan Remote Legal Services</strong> · Phase 1 MVP · Bilingual AR/EN</p>
            <p>Technology platform · Independent licensed lawyers</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
