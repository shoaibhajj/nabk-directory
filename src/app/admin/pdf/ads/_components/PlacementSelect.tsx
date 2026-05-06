"use client";

import { useState } from "react";

const AD_IMAGE_HINTS: Record<
  string,
  { dimensions: string; ratio: string; icon: string }
> = {
  FULL_PAGE: { dimensions: "794 × 1123 بكسل", ratio: "A4 عمودي", icon: "📄" },
  HALF_PAGE_TOP: {
    dimensions: "794 × 400 بكسل",
    ratio: "أفقي 2:1",
    icon: "⬆️",
  },
  HALF_PAGE_BOTTOM: {
    dimensions: "794 × 400 بكسل",
    ratio: "أفقي 2:1",
    icon: "⬇️",
  },
  SIDEBAR_LEFT: {
    dimensions: "200 × 600 بكسل",
    ratio: "عمودي 1:3",
    icon: "◀️",
  },
  SIDEBAR_RIGHT: {
    dimensions: "200 × 600 بكسل",
    ratio: "عمودي 1:3",
    icon: "▶️",
  },
  HEADER_BANNER: {
    dimensions: "794 × 80 بكسل",
    ratio: "رفيع 10:1",
    icon: "🔝",
  },
  FOOTER_BANNER: {
    dimensions: "794 × 80 بكسل",
    ratio: "رفيع 10:1",
    icon: "🔚",
  },
  CATEGORY_SPONSOR: {
    dimensions: "200 × 60 بكسل",
    ratio: "أفقي صغير",
    icon: "🏷️",
  },
};

const PLACEMENT_LABELS: Record<string, string> = {
  FULL_PAGE: "صفحة كاملة",
  HALF_PAGE_TOP: "نصف صفحة علوي",
  HALF_PAGE_BOTTOM: "نصف صفحة سفلي",
  SIDEBAR_LEFT: "عمود جانبي أيسر",
  SIDEBAR_RIGHT: "عمود جانبي أيمن",
  HEADER_BANNER: "شريط علوي",
  FOOTER_BANNER: "شريط سفلي",
  CATEGORY_SPONSOR: "راعي قسم",
};

export function PlacementSelect({
  defaultValue = "FULL_PAGE",
  imageFieldId,
}: {
  defaultValue?: string;
  imageFieldId: string;
}) {
  const [placement, setPlacement] = useState(defaultValue);
  const hint = AD_IMAGE_HINTS[placement];

  return (
    <>
      {/* SELECT — يُرسل قيمته مع الـ form عادياً */}
      <div>
        <label className="mb-1 block text-xs font-semibold">نوع الموضع</label>
        <select
          name="placementType"
          value={placement}
          onChange={(e) => setPlacement(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {Object.entries(PLACEMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* HINT — يظهر بجانب حقل الصورة */}
      {hint && (
        <div
          id={`hint-${imageFieldId}`}
          className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950"
        >
          <span className="text-base">{hint.icon}</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              الحجم الموصى به لهذا النوع
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {hint.dimensions}
              </code>
              <span className="text-xs text-blue-500 dark:text-blue-400">
                — {hint.ratio}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
