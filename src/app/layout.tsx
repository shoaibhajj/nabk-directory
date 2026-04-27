import type { Metadata } from "next";
import { Cairo, Noto_Naskh_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  display: "swap",
});

export const metadata: Metadata = {
  title: "دليل النبك — مدينتك بين يديك",
  description:
    "دليل الأعمال والخدمات في مدينة النبك. اعثر على الصيدليات، العيادات، المطاعم، وكل ما تحتاجه.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${naskh.variable}`}>
      <body>
        {children}
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}
