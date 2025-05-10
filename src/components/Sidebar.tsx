'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Droplets, DollarSign, ListChecks } from 'lucide-react'; // Example icons

interface NavItem {
  href: string;
  label: string; // For key and identification
  fullLabel: string;
  icon: React.ElementType; // Expect a component like Lucide icons
}

interface SidebarProps {
  onToggle?: (isOpen: boolean) => void; // Callback to inform parent of toggle state
  initialOpen?: boolean;
}

const Sidebar = ({ onToggle, initialOpen = true }: SidebarProps) => {
  const pathname = usePathname();
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
      label: 'forecast',
      fullLabel: 'Forecast',
      icon: LayoutDashboard,
    },
    {
      href: '/liquidity-ratios',
      label: 'liquidity',
      fullLabel: 'Liquidity Ratio',
      icon: Droplets,
    },
    {
      href: '/usd-exposure',
      label: 'usdExposure',
      fullLabel: 'USD Exposure',
      icon: DollarSign,
    },
    {
      href: '/summary-output-usd',
      label: 'summaryOutputUsd',
      fullLabel: 'USD Summary',
      icon: ListChecks,
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-slate-800 text-white shadow-lg transition-all duration-300 ease-in-out ${
        isOpen ? 'w-56' : 'w-20'
      }`}
    >
      {/* Header and Toggle Button */}
      <div className={`flex h-16 items-center border-b border-slate-700 ${isOpen ? 'justify-between px-4' : 'justify-center'}`}>
        {isOpen && (
          <Link href="/dashboard" className="text-xl font-semibold text-white hover:text-sky-400">
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
      <nav className="flex-grow px-2 py-4"> {/* Adjusted padding for collapsed state */}
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  title={item.fullLabel}
                  className={`flex items-center rounded-md p-2.5 text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }
                    ${isOpen ? 'justify-start' : 'justify-center'}`} // Center icon when collapsed
                >
                  <Icon className={`h-5 w-5 ${isOpen ? 'mr-3' : 'mr-0'}`} />
                  {isOpen && <span>{item.fullLabel}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 