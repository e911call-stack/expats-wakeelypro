"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save } from "lucide-react";
import { REMOTE_LABEL, type PracticeAreaOption, type RemoteEligibility } from "@/lib/admin/services";

interface Props {
  serviceId?: string;
  initial?: {
    slug: string;
    code: string;
    nameAr: string;
    nameEn: string;
    shortAr: string;
    shortEn: string;
    descriptionAr: string;
    descriptionEn: string;
    practiceAreaId: string | null;
    defaultRemoteEligibility: RemoteEligibility;
    platformFeeDefault: number;
    lawyerFeeMin: number;
    lawyerFeeMax: number;
    governmentFeeEstimate: number;
    governmentFeeNoteAr: string | null;
    governmentFeeNoteEn: string | null;
    typicalDurationDays: number;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
  };
  practiceAreas: PracticeAreaOption[];
}

export function ServiceForm({ serviceId, initial, practiceAreas }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [shortAr, setShortAr] = useState(initial?.shortAr ?? "");
  const [shortEn, setShortEn] = useState(initial?.shortEn ?? "");
  const [descriptionAr, setDescriptionAr] = useState(initial?.descriptionAr ?? "");
  const [descriptionEn, setDescriptionEn] = useState(initial?.descriptionEn ?? "");
  const [practiceAreaId, setPracticeAreaId] = useState<string>(initial?.practiceAreaId ?? "");
  const [eligibility, setEligibility] = useState<RemoteEligibility>(
    initial?.defaultRemoteEligibility ?? "partially_remote",
  );
  const [platformFee, setPlatformFee] = useState(String(initial?.platformFeeDefault ?? 25));
  const [lawyerMin, setLawyerMin] = useState(String(initial?.lawyerFeeMin ?? 150));
  const [lawyerMax, setLawyerMax] = useState(String(initial?.lawyerFeeMax ?? 800));
  const [govtFee, setGovtFee] = useState(String(initial?.governmentFeeEstimate ?? 0));
  const [govtNoteAr, setGovtNoteAr] = useState(initial?.governmentFeeNoteAr ?? "");
  const [govtNoteEn, setGovtNoteEn] = useState(initial?.governmentFeeNoteEn ?? "");
  const [duration, setDuration] = useState(String(initial?.typicalDurationDays ?? 30));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      slug: slug.trim(),
      code: code.trim(),
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim(),
      shortAr: shortAr.trim(),
      shortEn: shortEn.trim(),
      descriptionAr: descriptionAr.trim(),
      descriptionEn: descriptionEn.trim(),
      practiceAreaId: practiceAreaId || null,
      defaultRemoteEligibility: eligibility,
      platformFeeDefault: Number(platformFee) || 0,
      lawyerFeeMin: Number(lawyerMin) || 0,
      lawyerFeeMax: Number(lawyerMax) || 0,
      governmentFeeEstimate: Number(govtFee) || 0,
      governmentFeeNoteAr: govtNoteAr.trim() || null,
      governmentFeeNoteEn: govtNoteEn.trim() || null,
      typicalDurationDays: Number(duration) || 0,
      isActive,
      isFeatured,
      sortOrder: Number(sortOrder) || 0,
    };

    try {
      const res = await fetch(
        serviceId ? `/api/admin/services/${serviceId}` : "/api/admin/services",
        {
          method: serviceId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === "slug_or_code_taken"
            ? (ar ? "الـ slug أو الكود مستخدم مسبقاً" : "Slug or code already in use")
            : data.error === "validation_error"
              ? (ar ? "بيانات غير صالحة — راجع الحقول" : "Invalid data — check the fields")
              : (data.error || "save_failed");
        setError(msg);
        return;
      }
      toast({
        title: ar ? "تم الحفظ" : "Saved",
        description: ar ? "تم حفظ الخدمة بنجاح" : "Service saved successfully",
      });
      if (!serviceId && data.service?.id) {
        router.push(`/admin/services/${data.service.id}`);
        router.refresh();
      }
    } catch {
      setError(ar ? "حدث خطأ في الشبكة" : "Network error");
    } finally {
      setSaving(false);
    }
  }

  function num(v: string): number | null {
    return v === "" ? null : Number(v);
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Slug *</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="power-of-attorney-abroad" dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "الكود" : "Code"} *</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="POA-001" dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "الاسم (عربي)" : "Name (AR)"} *</Label>
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "الاسم (إنجليزي)" : "Name (EN)"} *</Label>
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "وصف مختصر (عربي)" : "Short (AR)"} *</Label>
          <Input value={shortAr} onChange={(e) => setShortAr(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "وصف مختصر (إنجليزي)" : "Short (EN)"} *</Label>
          <Input value={shortEn} onChange={(e) => setShortEn(e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "الوصف الكامل (عربي)" : "Description (AR)"} *</Label>
          <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} dir="rtl" rows={4} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "الوصف الكامل (إنجليزي)" : "Description (EN)"} *</Label>
          <Textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} dir="ltr" rows={4} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>{ar ? "مجال الممارسة" : "Practice area"}</Label>
          <Select value={practiceAreaId || "none"} onValueChange={(v) => setPracticeAreaId(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder={ar ? "بدون مجال" : "None"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{ar ? "بدون مجال" : "None"}</SelectItem>
              {practiceAreas.map((pa) => (
                <SelectItem key={pa.id} value={pa.id}>
                  {ar ? pa.nameAr : pa.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{ar ? "الأهلية عن بُعد" : "Remote eligibility"} *</Label>
          <Select value={eligibility} onValueChange={(v) => setEligibility(v as RemoteEligibility)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(REMOTE_LABEL) as RemoteEligibility[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {ar ? REMOTE_LABEL[r].ar : REMOTE_LABEL[r].en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{ar ? "رسوم المنصة (JOD)" : "Platform fee (JOD)"}</Label>
          <Input type="number" min={0} value={platformFee} onChange={(e) => setPlatformFee(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "حد أدنى رسوم المحامي" : "Lawyer fee min"}</Label>
          <Input type="number" min={0} value={lawyerMin} onChange={(e) => setLawyerMin(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "حد أقصى رسوم المحامي" : "Lawyer fee max"}</Label>
          <Input type="number" min={0} value={lawyerMax} onChange={(e) => setLawyerMax(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "الرسوم الحكومية (تقديرية)" : "Govt fee (estimate)"}</Label>
          <Input type="number" min={0} value={govtFee} onChange={(e) => setGovtFee(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "مدة التنفيذ (أيام)" : "Duration (days)"}</Label>
          <Input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "ترتيب العرض" : "Sort order"}</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{ar ? "ملاحظة الرسوم الحكومية (عربي)" : "Govt fee note (AR)"}</Label>
          <Textarea value={govtNoteAr} onChange={(e) => setGovtNoteAr(e.target.value)} dir="rtl" rows={2} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? "ملاحظة الرسوم الحكومية (إنجليزي)" : "Govt fee note (EN)"}</Label>
          <Textarea value={govtNoteEn} onChange={(e) => setGovtNoteEn(e.target.value)} dir="ltr" rows={2} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="active">{ar ? "مفعلة" : "Active"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
          <Label htmlFor="featured">{ar ? "مميزة" : "Featured"}</Label>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {ar ? `الرسوم الحالية: منصة ${num(platformFee) ?? 0} JOD · محامي ${num(lawyerMin) ?? 0}-${num(lawyerMax) ?? 0} JOD` : `Fees: platform ${num(platformFee) ?? 0} JOD · lawyer ${num(lawyerMin) ?? 0}-${num(lawyerMax) ?? 0} JOD`}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {ar ? "حفظ الخدمة" : "Save service"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          {ar ? "إلغاء" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}
