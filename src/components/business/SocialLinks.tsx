import {
  Facebook,
  Instagram,
  Twitter,
  Globe,
  MessageCircle,
  Send,
  Music2,
} from "lucide-react";
import type { SocialPlatform } from "@prisma/client";

export interface SocialLinkRow {
  id: string;
  platform: SocialPlatform;
  url: string;
}

const LABELS: Record<SocialPlatform, string> = {
  FACEBOOK: "فيسبوك",
  INSTAGRAM: "إنستغرام",
  TWITTER: "تويتر / X",
  TIKTOK: "تيك توك",
  WHATSAPP: "واتساب",
  TELEGRAM: "تلغرام",
  WEBSITE: "الموقع الإلكتروني",
};

const ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  TWITTER: Twitter,
  TIKTOK: Music2,
  WHATSAPP: MessageCircle,
  TELEGRAM: Send,
  WEBSITE: Globe,
};

const COLORS: Record<SocialPlatform, string> = {
  FACEBOOK: "bg-[#1877F2] text-white",
  INSTAGRAM: "bg-gradient-to-tr from-[#FEDA77] via-[#F58529] to-[#DD2A7B] text-white",
  TWITTER: "bg-black text-white",
  TIKTOK: "bg-black text-white",
  WHATSAPP: "bg-[#25D366] text-white",
  TELEGRAM: "bg-[#229ED9] text-white",
  WEBSITE: "bg-secondary text-secondary-foreground",
};

function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function SocialLinks({ links }: { links: SocialLinkRow[] }) {
  if (links.length === 0) return null;
  return (
    <div className="space-y-2">
      {links.map((s) => {
        const href = safeHref(s.url);
        if (!href) return null;
        const Icon = ICONS[s.platform];
        return (
          <a
            key={s.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-3 rounded-2xl border border-border p-3 hover:bg-muted"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${COLORS[s.platform]}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">{LABELS[s.platform]}</div>
              <div
                className="truncate text-sm font-semibold text-foreground"
                dir="ltr"
              >
                {href.replace(/^https?:\/\//, "")}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
