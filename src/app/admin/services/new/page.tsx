"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { ServiceForm } from "@/components/admin/services/service-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { type PracticeAreaOption } from "@/lib/admin/services";

export default function NewServicePage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [practiceAreas, setPracticeAreas] = useState<PracticeAreaOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/practice-areas", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPracticeAreas(data.practiceAreas ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{ar ? "إضافة خدمة جديدة" : "Add new service"}</h1>
        <p className="text-sm text-muted-foreground" dir="rtl">
          {ar ? "أنشئ خدمة قانونية جديدة في الكتالوج" : "Create a new legal service in the catalog"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{ar ? "بيانات الخدمة" : "Service details"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceForm practiceAreas={practiceAreas} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
