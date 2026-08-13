import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session-server";
import { handleApiError } from "@/lib/api-error";
import { addTimelineEvent } from "@/lib/legal/matter-tasks";
import { syncMatterDocumentsStatus } from "@/lib/legal/matter-documents";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/legal/matters/[id]/documents — upload a document for a matter.
 *
 * NOTE: In your repo, file storage should use Supabase Storage (src/lib/storage.ts).
 * This route accepts either:
 *   - fileUrl (already uploaded to Supabase) + fileName
 *   - fileBase64 (for sandbox/testing — stored inline as data URL)
 *
 * Body: { fileName, fileUrl?, fileBase64?, fileType?, fileSize?, description?, requirementSlug? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id: matterId } = await params;

    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { id: true, clientId: true, lawyerId: true, title: true },
    });
    if (!matter) return NextResponse.json({ error: "matter_not_found" }, { status: 404 });

    const isClient = matter.clientId === session.id;
    const isAssignedLawyer = session.lawyerId && matter.lawyerId === session.lawyerId;
    const isAdmin = session.role === "ADMIN";
    if (!isClient && !isAssignedLawyer && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const fileName = String(body.fileName ?? "").trim();
    if (!fileName) return NextResponse.json({ error: "fileName required" }, { status: 400 });

    const fileUrl = body.fileUrl ? String(body.fileUrl) : body.fileBase64 ? String(body.fileBase64) : null;
    if (!fileUrl) return NextResponse.json({ error: "fileUrl or fileBase64 required" }, { status: 400 });

    const fileType = String(body.fileType ?? "file");
    const fileSize = Number(body.fileSize ?? 0);
    const description = body.description ? String(body.description) : null;
    const requirementSlug = body.requirementSlug ? String(body.requirementSlug) : null;

    // TODO (production): replace inline data URL with Supabase Storage upload:
    //   import { uploadFile } from "@/lib/storage";
    //   const fileUrl = await uploadFile(file, `matters/${matterId}/${fileName}`);

    const doc = await prisma.matterDocument.create({
      data: {
        matterId, uploadedById: session.id,
        fileName, fileUrl, fileType, fileSize,
        description, requirementSlug,
        reviewStatus: "pending",
      },
    });

    await addTimelineEvent({
      matterId, eventType: "document_uploaded",
      titleAr: `تم رفع مستند: ${fileName}`, titleEn: `Document uploaded: ${fileName}`,
      descriptionAr: requirementSlug ? `مرتبط بمتطلب: ${requirementSlug}` : null,
      descriptionEn: requirementSlug ? `Linked to requirement: ${requirementSlug}` : null,
      actorId: session.id, actorRole: session.role === "LAWYER" ? "lawyer" : session.role === "ADMIN" ? "admin" : "client",
      metadata: { documentId: doc.id, fileName, requirementSlug },
    });

    // Notify the assigned lawyer a new document needs review.
    if (matter.lawyerId && isClient) {
      await prisma.notification.create({
        data: {
          userId: matter.lawyerId, kind: "document_uploaded",
          title: `New document to review: ${fileName}`,
          body: `"${fileName}" was uploaded by the client on matter "${matter.title}".`,
          link: `/lawyer/matters/${matterId}`,
          metadata: { matterId, documentId: doc.id, fileName } as object,
        },
      });
    }

    // Keep the matter's document phase in sync with the checklist.
    const sync = await syncMatterDocumentsStatus(matterId);

    return NextResponse.json({ document: doc, statusSync: sync }, { status: 201 });
  } catch (e) {
    return handleApiError("legal-matters.document-upload", e);
  }
}
