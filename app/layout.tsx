'use client';

import { useState } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DashboardIcon } from '@/components/icons/dashboard-icon';
import { MailIcon } from '@/components/icons/mail-icon';
import { FileIcon } from '@/components/icons/file-icon';
import { ConnectionStatus } from '@/components/connection-status';
import { ConnectModal } from '@/components/modals/connect-modal';

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Logo and Title */}
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📱</div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    WhatsApp Automation
                  </h1>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex items-center gap-6">
                  <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 flex items-center gap-2">
                    <DashboardIcon size={20} />
                    Dashboard
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2">
                    <MailIcon size={20} />
                    New Campaign
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2">
                    <FileIcon size={20} />
                    Templates
                  </button>
                </nav>

                {/* Right Side: Connection Status */}
                <ConnectionStatus
                  onConnectClick={() => setConnectModalOpen(true)}
                  refreshTrigger={refreshTrigger}
                />
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
      </body>
    </html>
  );
}
