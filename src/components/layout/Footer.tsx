import Link from "next/link";
import { MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/40">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-bold text-accent">دليل النبك</div>
                <div className="text-[11px] text-muted-foreground">مدينتك بين يديك</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              دليل الأعمال والخدمات في مدينة النبك. اعثر على ما تحتاجه بسهولة.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold">الأقسام</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/category/pharmacies" className="hover:text-accent">صيدليات</Link></li>
              <li><Link href="/category/clinics" className="hover:text-accent">عيادات وأطباء</Link></li>
              <li><Link href="/category/restaurants" className="hover:text-accent">مطاعم وكافيهات</Link></li>
              <li><Link href="/category/grocery" className="hover:text-accent">سوبرماركت</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold">روابط مفيدة</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/businesses" className="hover:text-accent">جميع الأعمال</Link></li>
              <li><Link href="/sign-up" className="hover:text-accent">إنشاء حساب</Link></li>
              <li><Link href="/dashboard/listings/new" className="hover:text-accent">أضف عملك</Link></li>
              <li><Link href="/about" className="hover:text-accent">عن الدليل</Link></li>
              <li><Link href="/contact" className="hover:text-accent">تواصل معنا</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} دليل النبك — جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
