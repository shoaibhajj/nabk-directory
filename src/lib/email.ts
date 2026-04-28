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

export function listingApprovedHtml(name: string, businessName: string, link: string) {
  return `
    <div style="font-family:'Cairo',sans-serif;background:#FCFAF8;padding:24px;direction:rtl;text-align:right">
      <h2 style="color:#1A664D">دليل النبك</h2>
      <p>مرحباً ${name},</p>
      <p>تم اعتماد عملك <strong>«${businessName}»</strong> ونشره في الدليل.</p>
      <p><a href="${link}" style="background:#F2930D;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none">عرض الصفحة</a></p>
      <p style="color:#7E7367;font-size:12px;margin-top:24px">شكراً لمساهمتك في إثراء دليل النبك.</p>
    </div>
  `;
}

export function listingRejectedHtml(
  name: string,
  businessName: string,
  reason: string,
  dashboardLink: string,
) {
  return `
    <div style="font-family:'Cairo',sans-serif;background:#FCFAF8;padding:24px;direction:rtl;text-align:right">
      <h2 style="color:#1A664D">دليل النبك</h2>
      <p>مرحباً ${name},</p>
      <p>للأسف لم نتمكن من نشر عملك <strong>«${businessName}»</strong> في الدليل.</p>
      <p style="background:#fff;border:1px solid #E5DFD7;padding:12px;border-radius:8px"><strong>السبب:</strong> ${reason}</p>
      <p>يمكنك تعديل البيانات وإعادة الإرسال:</p>
      <p><a href="${dashboardLink}" style="background:#1A664D;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none">فتح لوحة التحكم</a></p>
    </div>
  `;
}

export function listingSuspendedHtml(
  name: string,
  businessName: string,
  reason: string,
) {
  return `
    <div style="font-family:'Cairo',sans-serif;background:#FCFAF8;padding:24px;direction:rtl;text-align:right">
      <h2 style="color:#1A664D">دليل النبك</h2>
      <p>مرحباً ${name},</p>
      <p>تم إيقاف عرض عملك <strong>«${businessName}»</strong> مؤقتاً في الدليل.</p>
      <p style="background:#fff;border:1px solid #E5DFD7;padding:12px;border-radius:8px"><strong>السبب:</strong> ${reason}</p>
      <p>للاستفسار يرجى التواصل مع الإدارة.</p>
    </div>
  `;
}

export function emailVerifiedByAdminHtml(name: string, link: string) {
  return `
    <div style="font-family:'Cairo',sans-serif;background:#FCFAF8;padding:24px;direction:rtl;text-align:right">
      <h2 style="color:#1A664D">دليل النبك</h2>
      <p>مرحباً ${name},</p>
      <p>قام أحد المسؤولين بتفعيل حسابك يدوياً. يمكنك الآن تسجيل الدخول واستخدام كل ميزات الدليل.</p>
      <p><a href="${link}" style="background:#1A664D;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none">فتح الموقع</a></p>
    </div>
  `;
}

export function contactReceivedAdminHtml(opts: {
  name: string;
  email: string;
  subject: string | null;
  message: string;
  link: string;
}) {
  // All untrusted fields go through escapeHtml — Resend renders raw HTML and
  // a guest-supplied <script> would otherwise execute in any admin webmail
  // client that previews the body.
  const safe = {
    name: escapeHtml(opts.name),
    email: escapeHtml(opts.email),
    subject: escapeHtml(opts.subject ?? "(بدون موضوع)"),
    message: escapeHtml(opts.message).replace(/\n/g, "<br/>"),
    link: opts.link,
  };
  return `
    <div style="font-family:'Cairo',sans-serif;background:#FCFAF8;padding:24px;direction:rtl;text-align:right">
      <h2 style="color:#1A664D">رسالة جديدة من نموذج التواصل</h2>
      <p><strong>الاسم:</strong> ${safe.name}</p>
      <p><strong>البريد:</strong> <span dir="ltr">${safe.email}</span></p>
      <p><strong>الموضوع:</strong> ${safe.subject}</p>
      <div style="background:#fff;border:1px solid #E5DFD7;padding:12px;border-radius:8px;white-space:pre-wrap">${safe.message}</div>
      <p style="margin-top:16px"><a href="${safe.link}" style="background:#F2930D;color:#fff;padding:10px 20px;border-radius:9999px;text-decoration:none">فتح الرسالة في لوحة الإدارة</a></p>
    </div>
  `;
}

export function contactReplyHtml(opts: {
  name: string;
  originalSubject: string | null;
  originalMessage: string;
  reply: string;
  link: string | null;
}) {
  // Both the original message (already supplied by the user) and the admin's
  // reply are escaped before embedding — Resend renders raw HTML, and even
  // an admin's reply could contain accidental tags that break layout.
  const safe = {
    name: escapeHtml(opts.name),
    subject: escapeHtml(opts.originalSubject ?? "(بدون موضوع)"),
    original: escapeHtml(opts.originalMessage).replace(/\n/g, "<br/>"),
    reply: escapeHtml(opts.reply).replace(/\n/g, "<br/>"),
  };
  const ctaButton = opts.link
    ? `<p style="margin-top:16px"><a href="${opts.link}" style="background:#1A664D;color:#fff;padding:10px 20px;border-radius:9999px;text-decoration:none">عرض المحادثة في الموقع</a></p>`
    : "";
  return `
    <div style="font-family:'Cairo',sans-serif;background:#FCFAF8;padding:24px;direction:rtl;text-align:right">
      <h2 style="color:#1A664D">دليل النبك — ردّ على رسالتك</h2>
      <p>مرحباً ${safe.name},</p>
      <p>وصلنا ردّ على رسالتك بخصوص <strong>«${safe.subject}»</strong>:</p>
      <div style="background:#fff;border:1px solid #E5DFD7;padding:14px;border-radius:8px;white-space:pre-wrap">${safe.reply}</div>
      <p style="color:#7E7367;font-size:12px;margin-top:20px">رسالتك الأصلية:</p>
      <div style="background:#F4F0E6;border:1px solid #E5DFD7;padding:10px;border-radius:8px;color:#5C5147;font-size:13px;white-space:pre-wrap">${safe.original}</div>
      ${ctaButton}
    </div>
  `;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
