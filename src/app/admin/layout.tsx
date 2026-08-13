import { requireAdmin } from "@/lib/require-admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

/**
 * Super Admin layout - server-side role protection.
 * Only users with role === "ADMIN" can access any /admin/* page.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects if not ADMIN
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col md:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
    </div>
  );
}
