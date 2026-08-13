import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/lib/locale-provider";
import { SessionProvider } from "@/lib/session-provider";
import { SiteHeader } from "@/components/site-header";

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
    <footer className="mt-auto border-t border-border bg-muted/30 py-6">
      <div className="container mx-auto px-4 text-center text-xs text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Jordan Remote Legal Services</strong> — Phase 1 MVP · Bilingual (AR/EN)
        </p>
        <p>
          <strong className="text-foreground">English:</strong> For demonstration only — no real legal advice is provided. AI is for navigation only. All legal work is performed by licensed Jordanian lawyers and official Jordanian authorities. This platform does not provide electronic signatures or e-notary services. Government fees are always paid directly to the relevant authority.
        </p>
        <p dir="rtl">
          <strong className="text-foreground">العربية:</strong> لأغراض العرض التوضيحي فقط — لا يتم تقديم استشارة قانونية حقيقية. الذكاء الاصطناعي للتنقّي فقط. جميع الأعمال القانونية يقوم بها محامون أردنيون مرخصون وجهات أردنية رسمية. هذه المنصة لا تقدم توقيعات إلكترونية ولا خدمات توثيق إلكتروني. رسوم الجهات الحكومية تُدفع مباشرة للجهة المعنية.
        </p>
      </div>
    </footer>
  );
}
