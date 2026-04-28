import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STATUS_AR: Record<string, string> = {
  NEW: "قيد المراجعة",
  READ: "تمت المشاهدة",
  RESOLVED: "تم الردّ",
  SPAM: "تم الإغلاق",
};

export default async function MyMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/contact/my-messages");
  }

  const messages = await prisma.contactMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      subject: true,
      message: true,
      status: true,
      createdAt: true,
      reply: true,
      repliedAt: true,
      repliedBy: { select: { name: true } },
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">رسائلي</h1>
            <p className="text-sm text-muted-foreground">
              كل رسائلك إلى فريق الدعم وردودنا عليها.
            </p>
          </div>
          <Link href="/contact">
            <Button variant="primary" size="sm">
              رسالة جديدة
            </Button>
          </Link>
        </div>

        {messages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لم ترسل أي رسالة بعد.{" "}
              <Link href="/contact" className="text-accent hover:underline">
                ابدأ من هنا
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="text-lg">
                        {m.subject ?? "(بدون موضوع)"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        أُرسلت في{" "}
                        {new Date(m.createdAt).toLocaleString("ar-EG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        m.status === "RESOLVED"
                          ? "default"
                          : m.status === "SPAM"
                            ? "outline"
                            : "accent"
                      }
                    >
                      {STATUS_AR[m.status] ?? m.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="mb-1 text-xs font-semibold text-muted-foreground">
                        رسالتك
                      </h4>
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {m.message}
                      </p>
                    </div>
                    {m.reply ? (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                        <h4 className="mb-1 text-xs font-semibold text-primary">
                          ردّ من فريق الدعم
                          {m.repliedBy?.name ? ` — ${m.repliedBy.name}` : null}
                          {m.repliedAt
                            ? ` • ${new Date(m.repliedAt).toLocaleString(
                                "ar-EG",
                                { dateStyle: "medium", timeStyle: "short" },
                              )}`
                            : null}
                        </h4>
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                          {m.reply}
                        </p>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                        لم نردّ بعد على هذه الرسالة. سنوافيك بالردّ هنا وعبر
                        البريد الإلكتروني.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
