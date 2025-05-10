'use client';

import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import Sidebar from './Sidebar'; // Assuming Sidebar.tsx is in the same components folder

interface MainLayoutClientProps {
  children: React.ReactNode;
}

const MainLayoutClient = ({ children }: MainLayoutClientProps) => {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Determine if the sidebar should be visible based on the route
  const showSidebar = pathname !== '/login'; // Add other routes here if needed

  const handleSidebarToggle = useCallback((isOpen: boolean) => {
    setIsSidebarOpen(isOpen);
  }, []);

  // Determine the appropriate margin based on sidebar visibility and state
  let mainContentMargin = 'ml-0'; // Default for no sidebar (e.g., login page)
  if (showSidebar) {
    mainContentMargin = isSidebarOpen ? 'ml-56' : 'ml-20'; // Adjust based on open/closed width
  }

  return (
    <div className="flex min-h-screen">
      {showSidebar && <Sidebar onToggle={handleSidebarToggle} initialOpen={isSidebarOpen} />}
      <main className={`flex-grow p-6 md:p-8 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayoutClient; 