"use server";

import { z } from "zod";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { sendEmail, contactReceivedAdminHtml } from "@/lib/email";
import { getAppUrl } from "@/lib/utils";
import type { ContactMessageStatus } from "@prisma/client";

async function clientIp() {
  const h = await headers();
  // The X-Forwarded-For chain is appended left→right by each hop, so the
  // *rightmost* entry is the IP set by the closest trusted proxy (our
  // platform edge), while the leftmost entry can be forged by the original
  // client — taking the right-most value prevents spoof-based rate-limit
  // bypass on the contact form. Falls back to x-real-ip then "anon".
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return h.get("x-real-ip")?.trim() || "anon";
}

async function clientUserAgent() {
  const h = await headers();
  return (h.get("user-agent") ?? "").slice(0, 255) || null;
}

function hashIp(ip: string) {
  // We only need to fingerprint the sender for abuse triage, not recover the
  // raw IP. SHA-256 with a static salt is enough — admins compare hashes
  // across messages to find repeat senders without storing PII.
  return crypto.createHash("sha256").update(`nabk:${ip}`).digest("hex");
}

// Caps every free-text field at a sane length so a single submission cannot
// fill the inbox or balloon emails. React escapes on render and Prisma
// parameterizes queries, so the fields are stored verbatim and only the
// admin-email HTML is escaped (see lib/email.ts contactReceivedAdminHtml).
const contactSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(80),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").max(120),
  subject: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  message: z
    .string()
    .trim()
    .min(10, "الرسالة قصيرة جداً")
    .max(2000, "الرسالة طويلة جداً (الحد 2000 حرف)"),
  // Honeypot — bots fill every visible field, including those hidden via CSS.
  // Real users never touch this, so any non-empty value short-circuits the
  // submission with a generic success to avoid teaching the bot.
  website: z.string().max(200).optional(),
});

export type ContactState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "subject" | "message", string>>;
};

export async function submitContactMessageAction(
  _prev: ContactState | undefined,
  formData: FormData,
): Promise<ContactState> {
  const ip = await clientIp();
  // Tight per-IP cap: 3 contact submissions per hour. Spam bots typically
  // burst submissions; legitimate users rarely send more than one.
  const limited = await withRateLimit(`contact:${ip}`, 3, 60 * 60 * 1000);
  if (!limited.ok) {
    return { error: "تم استقبال عدد كبير من الرسائل من جهازك، حاول لاحقاً." };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    const fieldErrors: ContactState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        field === "name" ||
        field === "email" ||
        field === "subject" ||
        field === "message"
      ) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      error: "تأكد من حقول النموذج",
      fieldErrors,
    };
  }

  // Honeypot triggered — pretend we accepted the message but do nothing.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return { ok: true };
  }

  const session = await auth();
  const userAgent = await clientUserAgent();

  const message = await prisma.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      subject: parsed.data.subject,
      message: parsed.data.message,
      ipHash: hashIp(ip),
      userAgent,
      userId: session?.user?.id ?? null,
    },
    select: { id: true },
  });

  await recordAudit({
    actor: {
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? parsed.data.email.toLowerCase(),
      role: session?.user?.role ?? null,
    },
    action: "CONTACT_MESSAGE_RECEIVED",
    entityType: "ContactMessage",
    entityId: message.id,
    ipAddress: ip,
  });

  // Notify every active admin/super-admin so urgent messages don't sit
  // unread. Send sequentially with `Promise.allSettled` so one bad address
  // doesn't sink the others, and never block on the email roundtrip — the
  // user's "thanks" page should appear immediately.
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      deletedAt: null,
    },
    select: { email: true, name: true },
  });
  const link = `${getAppUrl()}/admin/contact-messages`;
  await Promise.allSettled(
    admins.map((a) =>
      sendEmail({
        to: a.email,
        subject: `رسالة تواصل جديدة — ${parsed.data.subject ?? "بدون موضوع"}`,
        html: contactReceivedAdminHtml({
          name: parsed.data.name,
          email: parsed.data.email,
          subject: parsed.data.subject,
          message: parsed.data.message,
          link,
        }),
      }),
    ),
  );

  return { ok: true };
}

const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "READ", "RESOLVED", "SPAM"]),
});

export async function adminUpdateContactStatusAction(input: {
  id: string;
  status: ContactMessageStatus;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const role = session?.user?.role;
  if (
    !session?.user?.id ||
    (role !== "ADMIN" && role !== "SUPER_ADMIN")
  ) {
    return { ok: false, error: "غير مسموح." };
  }

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  const before = await prisma.contactMessage.findUnique({
    where: { id: parsed.data.id },
    select: { status: true },
  });
  if (!before) return { ok: false, error: "الرسالة غير موجودة." };

  await prisma.contactMessage.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  await recordAudit({
    actor: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: role ?? null,
    },
    action: "CONTACT_MESSAGE_UPDATED",
    entityType: "ContactMessage",
    entityId: parsed.data.id,
    before: { status: before.status },
    after: { status: parsed.data.status },
  });

  revalidatePath("/admin/contact-messages");
  return { ok: true };
}
