import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/lib/locale-provider";
import { SessionProvider } from "@/lib/session-provider";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Jordan Remote Legal Services — Phase 1",
  description:
    "Get your legal matters done in Jordan from anywhere in the world. Bilingual AI-guided intake, document checklists, remote-eligibility verdict, lawyer matching, matter tracking, messaging and payments.",
  keywords: ["Jordan", "legal", "remote", "lawyer", "property", "power of attorney", "inheritance"],
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
