import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { verifyEmailAction, autoSignInAfterVerify } from "@/features/auth/actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sent?: string; pending?: string }>;
}) {
  const sp = await searchParams;
  let result: { ok?: boolean; error?: string; loginToken?: string } | undefined;
  if (sp.token) {
    result = await verifyEmailAction(sp.token);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <h1 className="text-2xl font-bold">تأكيد البريد الإلكتروني</h1>

            {sp.sent && !sp.token && (
              <p className="text-muted-foreground">
                أرسلنا رابطاً إلى بريدك الإلكتروني لتأكيد الحساب. افتح الرابط من رسالة البريد لإكمال التسجيل.
              </p>
            )}

            {sp.pending && !sp.token && (
              <p className="text-muted-foreground">
                لا يمكنك الوصول إلى لوحة التحكم قبل تأكيد بريدك الإلكتروني. تحقق من صندوق الوارد.
              </p>
            )}

            {sp.token && result?.ok && result.loginToken && (
              <>
                <p className="text-accent">تم تأكيد بريدك الإلكتروني بنجاح.</p>
                <form
                  action={async () => {
                    "use server";
                    await autoSignInAfterVerify(result!.loginToken!);
                  }}
                >
                  <button
                    type="submit"
                    className="inline-block rounded-full bg-primary px-6 py-2 font-bold text-white"
                  >
                    الانتقال إلى لوحة التحكم
                  </button>
                </form>
              </>
            )}

            {sp.token && result?.error && (
              <p className="text-red-700">{result.error}</p>
            )}

            {!sp.token && !sp.sent && !sp.pending && (
              <p className="text-muted-foreground">
                افتح رابط التأكيد المرسل إلى بريدك الإلكتروني.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
