// Admin layout — minimal shell that doesn't depend on the deleted
// AdminContext. Just renders children inside a clean container.

import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/admin" className="font-semibold text-gray-900 dark:text-gray-100">
            OracleFunded · Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/traders" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Traders</Link>
            <Link href="/admin/configs" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Configs</Link>
            <Link href="/admin/payouts" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Payouts</Link>
            <Link href="/admin/audit" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">Audit</Link>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">Trader view →</Link>
          </nav>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
