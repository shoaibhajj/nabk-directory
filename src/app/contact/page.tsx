import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata = {
  title: "تواصل معنا — دليل النبك",
  description:
    "هل تحتاج مساعدة أو لديك ملاحظة لفريق دليل النبك؟ أرسل لنا رسالة عبر النموذج وسنردّ في أقرب وقت.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="gradient-hero">
        <div className="container mx-auto px-4 py-12 text-center md:py-16">
          <span className="inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-accent">
            تواصل معنا
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight md:text-4xl">
            كيف يمكننا مساعدتك؟
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            أرسل لنا أي ملاحظة، اقتراح، أو طلب دعم وسنتواصل معك في أقرب وقت.
          </p>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-4 py-10 md:grid-cols-3 md:py-14">
        <div className="space-y-4 md:col-span-1">
          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center gap-2 text-accent">
                <MessageCircle className="h-5 w-5" />
                <h3 className="font-bold">دعم فني</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                إذا واجهت مشكلة في التسجيل، نشر عملك، أو أي وظيفة في الموقع،
                أخبرنا وسنحلّها بأسرع وقت.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center gap-2 text-accent">
                <Mail className="h-5 w-5" />
                <h3 className="font-bold">اقتراحات وملاحظات</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                هل لديك فكرة تساعدنا في تطوير الدليل؟ نحب نسمعها.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="md:col-span-2">
          <CardContent className="p-5 md:p-7">
            <ContactForm />
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
