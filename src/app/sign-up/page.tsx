import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { SignUpForm } from "./SignUpForm";
import { isGoogleEnabled } from "@/lib/auth";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">إنشاء حساب جديد</h1>
          <p className="mt-2 text-muted-foreground">انضم إلى دليل النبك وابدأ بإضافة عملك</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <SignUpForm googleEnabled={isGoogleEnabled} />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              لديك حساب؟{" "}
              <Link href="/sign-in" className="font-bold text-accent hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
