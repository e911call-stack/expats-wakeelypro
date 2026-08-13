"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { ServiceForm } from "@/components/admin/services/service-form";
import { ProceduresManager } from "@/components/admin/services/procedures-manager";
import { DocumentsManager } from "@/components/admin/services/documents-manager";
import { SourcesManager } from "@/components/admin/services/sources-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { REMOTE_LABEL, type AdminService, type PracticeAreaOption, type OfficialSourceOption } from "@/lib/admin/services";

export default function EditServicePage() {
  const params = useParams<{ id: string }>();
  const serviceId = params.id;
  const { locale } = useLocale();
  const ar = locale === "ar";

  const [service, setService] = useState<AdminService | null>(null);
  const [practiceAreas, setPracticeAreas] = useState<PracticeAreaOption[]>([]);
  const [sources, setSources] = useState<OfficialSourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [svcRes, paRes, srcRes] = await Promise.all([
          fetch(`/api/admin/services/${serviceId}`, { cache: "no-store" }),
          fetch("/api/admin/practice-areas", { cache: "no-store" }),
          fetch("/api/admin/sources", { cache: "no-store" }),
        ]);
        const [svcData, paData, srcData] = await Promise.all([svcRes.json(), paRes.json(), srcRes.json()]);
        if (!svcRes.ok) {
          setError(svcData.error ?? "not_found");
        } else {
          setService(svcData.service);
        }
        if (paRes.ok) setPracticeAreas(paData.practiceAreas ?? []);
        if (srcRes.ok) setSources(srcData.sources ?? []);
      } catch {
        setError("network_error");
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {ar ? "تعذّر تحميل الخدمة." : "Could not load the service."}
          <div className="mt-4">
            <Link href="/admin/services">
              <Button variant="outline" size="sm">
                {ar ? "العودة للقائمة" : "Back to list"}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const back = (
    <Link href="/admin/services">
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
        {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {ar ? "الخدمات" : "Services"}
      </Button>
    </Link>
  );

  return (
    <div className="space-y-4">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{service.nameEn}</h1>
          <p className="text-sm text-muted-foreground" dir="rtl">{service.nameAr}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{service.slug}</Badge>
            <Badge variant="outline" className="font-mono text-[10px]">{service.code}</Badge>
            {service.isActive ? (
              <Badge variant="success">{ar ? "مفعلة" : "Active"}</Badge>
            ) : (
              <Badge variant="destructive">{ar ? "موقوفة" : "Inactive"}</Badge>
            )}
            {service.isFeatured && <Badge>{ar ? "مميزة" : "Featured"}</Badge>}
            <Badge variant="secondary">
              {ar ? REMOTE_LABEL[service.defaultRemoteEligibility]?.ar : REMOTE_LABEL[service.defaultRemoteEligibility]?.en}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="flex w-full flex-wrap justify-start overflow-x-auto">
          <TabsTrigger value="details">{ar ? "التفاصيل" : "Details"}</TabsTrigger>
          <TabsTrigger value="procedures">{ar ? "الإجراءات" : "Procedures"}</TabsTrigger>
          <TabsTrigger value="documents">{ar ? "المستندات" : "Documents"}</TabsTrigger>
          <TabsTrigger value="sources">{ar ? "المصادر" : "Sources"}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="pt-4">
          <ServiceForm
            serviceId={service.id}
            initial={{
              slug: service.slug,
              code: service.code,
              nameAr: service.nameAr,
              nameEn: service.nameEn,
              shortAr: service.shortAr,
              shortEn: service.shortEn,
              descriptionAr: service.descriptionAr,
              descriptionEn: service.descriptionEn,
              practiceAreaId: service.practiceAreaId,
              defaultRemoteEligibility: service.defaultRemoteEligibility,
              platformFeeDefault: service.platformFeeDefault,
              lawyerFeeMin: service.lawyerFeeMin,
              lawyerFeeMax: service.lawyerFeeMax,
              governmentFeeEstimate: service.governmentFeeEstimate,
              governmentFeeNoteAr: service.governmentFeeNoteAr,
              governmentFeeNoteEn: service.governmentFeeNoteEn,
              typicalDurationDays: service.typicalDurationDays,
              isActive: service.isActive,
              isFeatured: service.isFeatured,
              sortOrder: service.sortOrder,
            }}
            practiceAreas={practiceAreas}
          />
        </TabsContent>

        <TabsContent value="procedures" className="pt-4">
          <ProceduresManager serviceId={service.id} />
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <DocumentsManager serviceId={service.id} />
        </TabsContent>

        <TabsContent value="sources" className="pt-4">
          <SourcesManager serviceId={service.id} sources={sources} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
