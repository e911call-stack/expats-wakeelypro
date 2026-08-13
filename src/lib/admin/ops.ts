import type { RemoteEligibility } from "./services";

export const MATTER_STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  new_matter: { ar: "جديدة", en: "New" },
  service_recommended: { ar: "خدمة موصى بها", en: "Service recommended" },
  remote_eligibility_check: { ar: "فحص الأهلية", en: "Remote eligibility check" },
  documents_pending: { ar: "مستندات معلّقة", en: "Documents pending" },
  documents_received: { ar: "تم استلام المستندات", en: "Documents received" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress" },
  in_review: { ar: "قيد المراجعة", en: "In review" },
  filing_prepared: { ar: "تجهيز التقديم", en: "Filing prepared" },
  filed_with_authority: { ar: "مقدّمة للجهة", en: "Filed with authority" },
  authority_processing: { ar: "قيد المعالجة", en: "Authority processing" },
  ready_for_delivery: { ar: "جاهزة للتسليم", en: "Ready for delivery" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
  closed: { ar: "مغلقة", en: "Closed" },
  intake: { ar: "استبيان", en: "Intake" },
  awaiting_documents: { ar: "بانتظار المستندات", en: "Awaiting documents" },
  lawyer_requested: { ar: "طلب محامٍ", en: "Lawyer requested" },
  consultation_scheduled: { ar: "تم جدولة استشارة", en: "Consultation scheduled" },
  active: { ar: "نشطة", en: "Active" },
  resolved: { ar: "تم الحل", en: "Resolved" },
  lawyer_assigned: { ar: "تم إسناد محامٍ", en: "Lawyer assigned" },
};

export const REMOTE_TONES: Record<RemoteEligibility, "success" | "warning" | "danger" | "secondary"> = {
  fully_remote: "success",
  partially_remote: "warning",
  in_person_required: "danger",
  unknown: "secondary",
};

export const PAYMENT_KIND_LABEL: Record<string, { ar: string; en: string }> = {
  platform_fee: { ar: "رسوم المنصة", en: "Platform fee" },
  lawyer_fee: { ar: "رسوم المحامي", en: "Lawyer fee" },
  government_fee: { ar: "رسوم حكومية", en: "Government fee" },
  disbursement: { ar: "مصروفات", en: "Disbursement" },
};

export const PAYMENT_STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: "معلّقة", en: "Pending" },
  PAID: { ar: "مدفوعة", en: "Paid" },
  FAILED: { ar: "فاشلة", en: "Failed" },
  REFUNDED: { ar: "مستردة", en: "Refunded" },
};

export const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
  CITIZEN: { ar: "موكل", en: "Citizen" },
  LAWYER: { ar: "محامٍ", en: "Lawyer" },
  ADMIN: { ar: "مشرف", en: "Admin" },
};

export const AUTHORITY_TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  ministry: { ar: "وزارة", en: "Ministry" },
  court: { ar: "محكمة", en: "Court" },
  notary: { ar: "كاتب عدل", en: "Notary" },
  land_dept: { ar: "دائرة الأراضي", en: "Lands Dept" },
  civil_status: { ar: "الأحوال المدنية", en: "Civil Status" },
  companies_ctrl: { ar: "مراقب الشركات", en: "Companies Control" },
  other: { ar: "أخرى", en: "Other" },
};

export interface AdminMatter {
  id: string;
  title: string;
  status: string;
  remoteEligibility: RemoteEligibility;
  clientCountry: string | null;
  clientStatus: string | null;
  progressPercent: number;
  createdAt: string;
  platformFeeJOD: number;
  lawyerFeeJOD: number;
  governmentFeeJOD: number;
  legalService: { id: string; slug: string; nameAr: string; nameEn: string; code: string } | null;
  client: { id: string; name: string; email: string; phone: string; currentCountry: string | null; clientStatus: string | null } | null;
  lawyer: { id: string; user: { id: string; name: string; email: string; phone: string } } | null;
  _count: { documents: number; tasks: number; conversations: number; payments: number };
}

export interface AdminLawyer {
  id: string;
  barNumber: string;
  bioAr: string;
  bioEn: string;
  specialties: string[];
  cities: string[];
  languages: string[];
  hourlyRate: number;
  yearsExperience: number;
  verified: boolean;
  isAvailable: boolean;
  handlesRemoteMatters: boolean;
  rating: number;
  totalReviews: number;
  avatarUrl: string | null;
  createdAt: string;
  activeMattersCount: number;
  practiceAreas: { slug: string; nameAr: string; nameEn: string }[];
  user: { id: string; name: string; email: string; phone: string; isVerified: boolean };
}

export interface AdminUser {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: string;
  language: string;
  isVerified: boolean;
  currentCountry: string | null;
  clientStatus: string | null;
  createdAt: string;
  lawyerProfile: { id: string; verified: boolean; isAvailable: boolean; barNumber: string } | null;
  mattersCount: number;
  paymentsCount: number;
}

export interface AdminPayment {
  id: string;
  amountJOD: number;
  kind: string;
  status: string;
  providerRef: string | null;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { id: string; name: string; phone: string; email: string | null };
  matter: { id: string; title: string } | null;
}

export interface AdminSource {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  url: string | null;
  authorityType: string;
  country: string;
  region: string | null;
  notesAr: string | null;
  notesEn: string | null;
  isActive: boolean;
}

export function remoteLabel(re: RemoteEligibility, ar: boolean): string {
  if (re === "fully_remote") return ar ? "عن بُعد" : "Remote";
  if (re === "partially_remote") return ar ? "جزئي" : "Partial";
  if (re === "in_person_required") return ar ? "حضور" : "In-person";
  return ar ? "غير محدد" : "Unknown";
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}
