'use client';
import { ThemeProvider } from "@/components/theme-provider"
import { useState } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DashboardIcon } from '@/components/icons/dashboard-icon';
import { MailIcon } from '@/components/icons/mail-icon';
import { FileIcon } from '@/components/icons/file-icon';
import { ConnectionStatus } from '@/components/connection-status';
import { ConnectModal } from '@/components/modals/connect-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleConnected = () => {
    // Trigger immediate refresh of connection status
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
              <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Logo and Title */}
                  <div className="flex items-center gap-3">
                    <WhatsAppIcon size={32} trigger="loop" />
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                      WhatsApp Automation
                    </h1>
                  </div>

                  {/* Navigation Tabs */}
                  <nav className="flex items-center gap-6">
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 flex items-center gap-2">
                      <DashboardIcon size={20} />
                      Dashboard
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
                      <MailIcon size={20} />
                      New Campaign
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
                      <FileIcon size={20} />
                      Templates
                    </button>
                  </nav>

                  {/* Right Side: Connection Status & Theme Toggle */}
                  <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <ConnectionStatus
                      onConnectClick={() => setConnectModalOpen(true)}
                      refreshTrigger={refreshTrigger}
                    />
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
              {children}
            </main>

            {/* Connect Modal - Global */}
            <ConnectModal
              open={connectModalOpen}
              onOpenChange={setConnectModalOpen}
              onConnected={handleConnected}
            />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
