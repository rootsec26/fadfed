import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-sand-50 px-5 text-center">
      <div>
        <p className="text-6xl font-extrabold text-brand-300">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-brand-900">الصفحة غير موجودة · Page not found</h1>
        <Link href="/home" className={btn("primary", "lg", "mt-8")}>الرئيسية · Home</Link>
      </div>
    </div>
  );
}
