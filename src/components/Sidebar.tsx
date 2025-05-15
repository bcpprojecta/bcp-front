'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Droplets, DollarSign, ListChecks, FileText } from 'lucide-react'; // Example icons

// Simple utility for class names (can be moved to a shared utils file later)
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface NavItem {
  href: string;
  label: string; // For key and identification, can be short
  fullLabel: string; // Full label for expanded state
  icon: React.ElementType;
}

interface SidebarProps {
  onToggle?: (isOpen: boolean) => void; // Callback to inform parent of toggle state
  initialOpen?: boolean;
}

// SidebarLink component receives isOpen state from parent to conditionally render text
const SidebarLink = ({ 
    href, 
    icon: Icon, 
    children, 
    isOpen 
}: {
    href: string; 
    icon: React.ElementType; 
    children: React.ReactNode; 
    isOpen: boolean; // Receive isOpen state
}) => {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href)); 

    return (
      <li>
        <Link href={href} passHref title={typeof children === 'string' ? children : undefined}>
          <span className={cn(
            'flex items-center p-2.5 rounded-md group transition-colors duration-200',
            // Adjusted text colors for better contrast on dark sidebar
            isActive 
              ? 'bg-sky-600 text-white' 
              : 'text-slate-300 hover:bg-slate-700 hover:text-white',
            !isOpen && 'justify-center' // Center icon when sidebar is closed
          )}>
            <Icon className={cn(
                'h-5 w-5 flex-shrink-0',
                // isOpen ? 'mr-3' : 'mr-0' // Adjust margin based on isOpen
            )} />
            {/* Conditionally render children (text label) based on isOpen */}
            {isOpen && <span className="ms-3 whitespace-nowrap">{children}</span>}
          </span>
        </Link>
      </li>
    );
  };

const Sidebar = ({ onToggle, initialOpen = true }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  useEffect(() => {
    if (onToggle) {
      onToggle(isOpen);
    }
  }, [isOpen, onToggle]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Forecast', // Keep label short for potential use when collapsed or as key
      fullLabel: 'Forecast',
      icon: LayoutDashboard,
    },
    {
      href: '/liquidity-ratios',
      label: 'Liquidity',
      fullLabel: 'Liquidity Ratio',
      icon: Droplets,
    },
    {
      href: '/usd-exposure',
      label: 'Exposure',
      fullLabel: 'USD Exposure',
      icon: DollarSign,
    },
    {
      href: '/summary-output-usd',
      label: 'USD Sum.',
      fullLabel: 'USD Summary',
      icon: ListChecks,
    },
    // Example for Report link using the same structure
    {
        href: '/report',
        label: 'Report',
        fullLabel: 'Consolidated Report',
        icon: FileText, 
    }
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-slate-800 text-white shadow-lg transition-all duration-300 ease-in-out ${isOpen ? 'w-56' : 'w-20' // w-20 for collapsed state
      }`}
    >
      {/* Header and Toggle Button */}
      <div className={`flex h-16 items-center border-b border-slate-700 ${isOpen ? 'justify-between px-4' : 'justify-center'}`}>
        {isOpen && (
          <Link href="/dashboard" className="text-xl font-semibold text-white hover:text-sky-400 whitespace-nowrap">
            BCP App
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md"
          title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-grow px-3 py-4 overflow-y-auto">
        <ul className="space-y-2 font-medium">
          {navItems.map((item) => (
            <SidebarLink 
                key={item.href} 
                  href={item.href}
                icon={item.icon} 
                isOpen={isOpen} // Pass isOpen state to SidebarLink
            >
              {item.fullLabel} {/* Pass fullLabel to be conditionally rendered */}
            </SidebarLink>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 