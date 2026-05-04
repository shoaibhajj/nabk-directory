import { getLegacyPdfList } from "@/app/actions/pdf-legacy";
import LegacyPdfManager from "./_components/LegacyPdfManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الدليل القديم — لوحة التحكم",
  description: "إدارة ملف الدليل القديم المطبوع",
};

export default async function LegacyPdfPage() {
  const records = await getLegacyPdfList();
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          الدليل القديم (Legacy PDF)
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          أضف أو عدّل ملف الدليل المطبوع القديم الذي يظهر للزوار في الصفحة الرئيسية.
          سجل واحد فقط يمكن نشره في وقت واحد.
        </p>
      </div>
      <LegacyPdfManager initialRecords={records} />
    </div>
  );
}
