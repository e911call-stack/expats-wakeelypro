"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { LegalNotice } from "@/components/legal-disclaimer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Scale, Building2, KeyRound, ScrollText, Users, Briefcase, Gavel,
  Clock, Globe, Loader2,
} from "lucide-react";

type Service = {
  id: string; slug: string;
  nameAr: string; nameEn: string;
  shortAr: string; shortEn: string;
  descriptionAr: string; descriptionEn: string;
  remoteEligibility: string;
  platformFeeDefault: number;
  lawyerFeeMin: number; lawyerFeeMax: number;
  governmentFeeEstimate: number;
  typicalDurationDays: number;
  isFeatured: boolean;
  documentCount: number;
  practiceArea: { slug: string; nameAr: string; nameEn: string } | null;
};

const REMOTE_TONES: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  fully_remote: "success", partially_remote: "warning", in_person_required: "danger", unknown: "secondary",
};

export default function ServicesPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/legal/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services ?? []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <LegalNotice className="mb-6" />
      <div className="mb-8">
        <Badge variant="secondary" className="mb-2">{ar ? "كتالوج الخدمات" : "Service catalog"}</Badge>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {ar ? "خدمات قانونية أردنية عن بُعد" : "Remote Jordanian legal services"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {ar
            ? "كل خدمة لها إجراء رسمي صريح، قائمة مستندات، ومصادر حكومية. الذكاء الاصطناعي لا يخترع خدمات خارج هذا الكتالوج."
            : "Each service has an explicit official procedure, document checklist, and government sources. The AI does not invent services outside this catalog."}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} ar={ar} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, ar }: { service: Service; ar: boolean }) {
  const reTone = REMOTE_TONES[service.remoteEligibility] ?? "secondary";
  const reLabel = ar
    ? (service.remoteEligibility === "fully_remote" ? "عن بُعد بالكامل"
      : service.remoteEligibility === "partially_remote" ? "جزئياً عن بُعد"
      : service.remoteEligibility === "in_person_required" ? "يتطلب حضوراً" : "غير محدد")
    : (service.remoteEligibility === "fully_remote" ? "Fully remote"
      : service.remoteEligibility === "partially_remote" ? "Partially remote"
      : service.remoteEligibility === "in_person_required" ? "In-person required" : "Unknown");
  const Icon = getServiceIcon(service.slug);
  return (
    <Link href={`/services/${service.slug}`} className="block h-full">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardContent className="flex flex-1 flex-col pt-6">
          <div className="flex items-start justify-between gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <Badge variant={reTone} className="text-[10px] gap-1">
              <Globe className="h-3 w-3" />
              {reLabel}
            </Badge>
          </div>
          <h3 className="mt-3 text-base font-bold">{ar ? service.nameAr : service.nameEn}</h3>
          <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
            {ar ? service.shortAr : service.shortEn}
          </p>
          {service.practiceArea && (
            <p className="mt-2 text-xs text-muted-foreground">
              {ar ? service.practiceArea.nameAr : service.practiceArea.nameEn}
            </p>
          )}
          <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {service.typicalDurationDays} {ar ? "يوم" : "days"}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <ScrollText className="h-3 w-3" />
                {service.documentCount} {ar ? "مستند" : "docs"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{ar ? "المحامي" : "Lawyer"}</span>
              <span className="font-semibold">{service.lawyerFeeMin}–{service.lawyerFeeMax} JOD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{ar ? "المنصة" : "Platform"}</span>
              <span className="font-semibold">{service.platformFeeDefault} JOD</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full">
            {ar ? "التفاصيل" : "View details"}
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

function getServiceIcon(slug: string) {
  switch (slug) {
    case "property-sale-from-abroad": return Building2;
    case "power-of-attorney": return KeyRound;
    case "inheritance-initiation": return ScrollText;
    case "civil-status-update": return Users;
    case "company-formation": return Briefcase;
    case "court-representation": return Gavel;
    default: return Scale;
  }
}
