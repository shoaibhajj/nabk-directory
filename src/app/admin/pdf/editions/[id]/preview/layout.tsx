/**
 * Isolated layout for the PDF preview route.
 *
 * Overrides the admin shell (header, sidebar, footer) so the preview
 * page can render full-viewport without any surrounding chrome.
 * Next.js App Router: a layout.tsx placed next to page.tsx replaces
 * every ancestor layout for that segment only.
 */
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
