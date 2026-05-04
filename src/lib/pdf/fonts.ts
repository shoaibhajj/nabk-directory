/**
 * Cairo font registration for @react-pdf/renderer.
 * Must be called ONCE before any PDF document is rendered.
 * Safe to call multiple times (Font.register is idempotent).
 */

import { Font } from "@react-pdf/renderer";
import path from "path";

let registered = false;

export function registerFonts() {
  if (registered) return;

  // Cairo Variable font covers all weights 200–900.
  // react-pdf supports variable fonts via fontWeight ranges.
  const cairoPath = path.join(process.cwd(), "public", "fonts", "Cairo-Variable.ttf");

  Font.register({
    family: "Cairo",
    fonts: [
      { src: cairoPath, fontWeight: 400 },
      { src: cairoPath, fontWeight: 700 },
      { src: cairoPath, fontWeight: 300 },
      { src: cairoPath, fontWeight: 600 },
    ],
  });

  // Disable font hyphenation (Arabic doesn't use it)
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
