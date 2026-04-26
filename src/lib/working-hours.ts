import type { WorkingHours } from "@prisma/client";

export function isOpenNow(hours: WorkingHours[], now = new Date()): {
  open: boolean;
  closeTime?: string;
} {
  const day = now.getDay();
  const today = hours.find((h) => h.dayOfWeek === day);
  if (!today || !today.isOpen) return { open: false };
  if (today.is24Hours) return { open: true, closeTime: "24:00" };
  if (!today.openTime || !today.closeTime) return { open: false };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = today.openTime.split(":").map(Number);
  const [ch, cm] = today.closeTime.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  if (closeMin > openMin) {
    if (nowMin >= openMin && nowMin < closeMin)
      return { open: true, closeTime: today.closeTime };
  } else {
    if (nowMin >= openMin || nowMin < closeMin)
      return { open: true, closeTime: today.closeTime };
  }
  return { open: false };
}

export const DAY_NAMES_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
