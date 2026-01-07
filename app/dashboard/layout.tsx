'use client';

import type { ReactNode } from 'react';
import { DashboardIcon } from '@/components/icons/dashboard-icon';
import { MailIcon } from '@/components/icons/mail-icon';
import { FileIcon } from '@/components/icons/file-icon';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header will be added as a component */}
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

            {/* Right Side: Connection Status & Profile */}
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Connected
              </div>

              {/* Profile */}
              <button className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300">
                👤
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
