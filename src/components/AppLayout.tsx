import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarType?: 'student' | 'admin';
  className?: string;
}

export const AppLayout = ({ 
  children, 
  showSidebar = true, 
  sidebarType = 'student',
  className = '' 
}: AppLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarToggle = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  if (!showSidebar) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
        variant={sidebarType}
      />

      <div className={`flex-1 flex flex-col overflow-hidden ${className}`}>
        {children}
      </div>
    </div>
  );
};

