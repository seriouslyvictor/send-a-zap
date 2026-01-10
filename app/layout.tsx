'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import { ChevronDown } from 'lucide-react';

import { ThemeProvider } from "@/components/theme-provider";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ConnectionStatus } from '@/components/connection-status';
import { ConnectModal } from '@/components/modals/connect-modal';
import { DashboardIcon } from '@/components/icons/dashboard-icon';
import { MailIcon } from '@/components/icons/mail-icon';
import { FileIcon } from '@/components/icons/file-icon';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const NAV_BUTTON_STYLES = {
  base: "px-4 py-2 text-sm font-medium flex items-center gap-2",
  active: "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400",
  inactive: "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  const router = useRouter();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleConnected(): void {
    setRefreshTrigger(prev => prev + 1);
  }

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

                  {/* Navigation */}
                  <nav className="flex items-center gap-6">
                    <button
                      onClick={() => router.push('/')}
                      className={`${NAV_BUTTON_STYLES.base} ${NAV_BUTTON_STYLES.active} cursor-pointer`}
                    >
                      <DashboardIcon size={20} />
                      Dashboard
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`${NAV_BUTTON_STYLES.base} ${NAV_BUTTON_STYLES.inactive}`}>
                          <MailIcon size={20} />
                          Convocacoes
                          <ChevronDown size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => router.push('/campaigns')}>
                          Listar Convocacoes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/')}>
                          Nova Convocacao
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <button className={`${NAV_BUTTON_STYLES.base} ${NAV_BUTTON_STYLES.inactive}`}>
                      <FileIcon size={20} />
                      Modelos
                    </button>
                  </nav>

                  {/* Right Side: Connection Status & Theme Toggle */}
                  <div className="flex items-center gap-3">
                    <AnimatedThemeToggle />
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
