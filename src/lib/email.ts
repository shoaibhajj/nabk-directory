import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL || "noreply@nabk.local";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log("[email:dev]", opts.to, opts.subject);
    console.log(opts.html.replace(/<[^>]+>/g, ""));
    return { ok: true, dev: true };
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false };
  }
}

export function verifyEmailHtml(name: string, link: string) {
  return `
    <div style="font-family:'Cairo',sans-serif;background:#FCFAF8;padding:24px;direction:rtl;text-align:right">
      <h2 style="color:#1A664D">دليل النبك</h2>
      <p>مرحباً ${name},</p>
      <p>اضغط الرابط التالي لتأكيد بريدك الإلكتروني:</p>
      <p><a href="${link}" style="background:#F2930D;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none">تأكيد البريد الإلكتروني</a></p>
      <p style="color:#7E7367;font-size:12px;margin-top:24px">إذا لم تطلب هذا فتجاهل الرسالة.</p>
    </div>
  `;
}

export function passwordResetHtml(name: string, link: string) {
  return `
    <div style="font-family:'Cairo',sans-serif;background:#FCFAF8;padding:24px;direction:rtl;text-align:right">
      <h2 style="color:#1A664D">دليل النبك</h2>
      <p>مرحباً ${name},</p>
      <p>طلبت إعادة تعيين كلمة المرور. اضغط الرابط التالي لإكمال العملية:</p>
      <p><a href="${link}" style="background:#F2930D;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none">إعادة تعيين كلمة المرور</a></p>
      <p style="color:#7E7367;font-size:12px;margin-top:24px">الرابط صالح لساعة واحدة.</p>
    </div>
  `;
}
