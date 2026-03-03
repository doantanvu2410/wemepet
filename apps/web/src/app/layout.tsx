import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/providers/app-provider';
import { Topbar } from '@/components/topbar';

export const metadata: Metadata = {
  title: 'WemePet Platform',
  description: 'Hard-reset architecture social + koi registry platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <div className="app-shell">
            <Topbar />
            <main className="main-content">{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
