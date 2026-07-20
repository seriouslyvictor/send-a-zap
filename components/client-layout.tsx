'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { ThemeProvider } from "@/components/theme-provider";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import { ConnectionStatus } from '@/components/connection-status';
import { DashboardIcon } from '@/components/icons/dashboard-icon';
import { MailIcon } from '@/components/icons/mail-icon';
import { FileIcon } from '@/components/icons/file-icon';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import { MenuBar } from '@/components/ui/glow-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

// Dynamic import for modals - only loads when opened
const ConnectModal = dynamic(() =>
  import('@/components/modals/connect-modal').then(mod => ({ default: mod.ConnectModal })),
  { ssr: false }
);

const RiskWarningModal = dynamic(() =>
  import('@/components/modals/risk-warning-modal').then(mod => ({ default: mod.RiskWarningModal })),
  { ssr: false }
);

interface ClientLayoutProps {
  children: React.ReactNode;
}

// Menu items configuration
const menuItems = [
  {
    icon: DashboardIcon,
    label: "Dashboard",
    href: "/",
    gradient: "radial-gradient(circle at center, rgba(59, 130, 246, 0.6), transparent 65%)",
    iconColor: "text-blue-500"
  },
  {
    icon: MailIcon,
    label: "Convocações",
    href: "/campaigns",
    gradient: "radial-gradient(circle at center, rgba(168, 85, 247, 0.6), transparent 65%)",
    iconColor: "text-purple-500"
  },
  {
    icon: FileIcon,
    label: "Modelos",
    href: "/templates",
    gradient: "radial-gradient(circle at center, rgba(34, 197, 94, 0.6), transparent 65%)",
    iconColor: "text-green-500"
  }
];

export function ClientLayout({ children }: ClientLayoutProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleConnected(): void {
    setRefreshTrigger(prev => prev + 1);
  }

  function handleModalClose(isOpen: boolean): void {
    setConnectModalOpen(isOpen);
  }

  function handleMenuItemClick(label: string): void {
    const item = menuItems.find(i => i.label === label);
    if (item) {
      router.push(item.href);
      setMobileMenuOpen(false);
    }
  }

  // Determine active menu item based on current path
  const activeItem = menuItems.find(item =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )?.label;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Logo and Title */}
              <div className="flex items-center gap-2 sm:gap-3">
                <WhatsAppIcon size={28} trigger="loop" className="sm:w-8 sm:h-8" />
                <h1 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white hidden sm:block">
                  Convocador 9002
                </h1>
                <h1 className="text-base font-semibold text-gray-900 dark:text-white sm:hidden">
                  Conv 9002
                </h1>
              </div>

              {/* Desktop Navigation - Hidden on mobile */}
              <nav className="hidden lg:flex items-center justify-center flex-1 max-w-2xl mx-auto">
                <MenuBar
                  items={menuItems}
                  activeItem={activeItem}
                  onItemClick={handleMenuItemClick}
                />
              </nav>

              {/* Right Side: Mobile Menu + Connection Status + Theme Toggle */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile Menu Button */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 sm:w-80">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <WhatsAppIcon size={24} />
                        <span>Menu</span>
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col gap-2 mt-8">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.label === activeItem;
                        return (
                          <Button
                            key={item.label}
                            variant={isActive ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3 h-12"
                            onClick={() => handleMenuItemClick(item.label)}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </Button>
                        );
                      })}
                    </nav>
                  </SheetContent>
                </Sheet>

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

        {/* Connect Modal - Lazy loaded */}
        {connectModalOpen && (
          <ConnectModal
            open={connectModalOpen}
            onOpenChange={handleModalClose}
            onConnected={handleConnected}
          />
        )}

        {/* Risk Warning Modal - Shows on first visit */}
        <RiskWarningModal onAccept={() => {}} />
      </div>
    </ThemeProvider>
  );
}
