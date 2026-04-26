import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { SignInForm } from "./SignInForm";
import { isGoogleEnabled } from "@/lib/auth";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">تسجيل الدخول</h1>
          <p className="mt-2 text-muted-foreground">أهلاً بعودتك إلى دليل النبك</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <SignInForm googleEnabled={isGoogleEnabled} />
            <div className="mt-4 text-center text-sm">
              <Link href="/forgot-password" className="text-accent hover:underline">
                نسيت كلمة المرور؟
              </Link>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <Link href="/sign-up" className="font-bold text-accent hover:underline">
                إنشاء حساب جديد
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
