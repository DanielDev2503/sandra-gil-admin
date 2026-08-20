export const dynamic = 'force-dynamic';

import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/ToastContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#0f0f1a]">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
