import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
} from "@/features/businesses/verification-actions";
import { AdminVerificationsClient } from "./AdminVerificationsClient";

export const metadata = { title: "طلبات التوثيق | الإدارة" };

export default async function AdminVerificationsPage() {
  const session = await auth();
  if (
    !session?.user ||
    !(["ADMIN", "SUPER_ADMIN"] as string[]).includes(session.user.role ?? "")
  ) {
    redirect("/sign-in");
  }

  const requests = await getPendingVerifications();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">طلبات التوثيق</h1>
        <p className="mt-1 text-sm text-gray-500">
          {requests.length === 0
            ? "لا توجد طلبات معلّقة"
            : `${requests.length} طلب قيد المراجعة`}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400">لا توجد طلبات توثيق معلّقة حالياً</p>
        </div>
      ) : (
        <AdminVerificationsClient
          requests={requests}
          approveAction={approveVerification}
          rejectAction={rejectVerification}
        />
      )}
    </div>
  );
}
