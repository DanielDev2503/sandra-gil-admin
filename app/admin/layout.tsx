export const dynamic = 'force-dynamic';

import Sidebar from '@/components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0f0f1a]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-8">{children}</div>
      </main>
    </div>
  );
}

