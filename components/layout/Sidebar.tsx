'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PackageSearch,
  FileBox,
  LineChart,
  Shield,
  Menu,
  X
} from 'lucide-react';

const navItems = [
  { name: 'Main', href: '/', icon: LayoutDashboard },
  { name: 'Master Inventory', href: '/inventory', icon: PackageSearch },
  { name: 'Project Uploads', href: '/projects', icon: FileBox },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Admin Portal', href: '/admin', icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-5 left-5 z-40 p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 shadow-xl"
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 md:w-64 h-screen bg-neutral-900 border-r border-neutral-800 text-neutral-300 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between h-20 border-b border-neutral-800 px-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            Modulr Homes
          </h1>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-neutral-400 hover:text-white p-2"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 md:py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-neutral-800 text-white shadow-lg shadow-black/20'
                  : 'hover:bg-neutral-800/50 hover:text-white'
                  }`}
              >
                <Icon
                  size={20}
                  className={`transition-colors flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-neutral-500 group-hover:text-blue-400'
                    }`}
                />
                <span className="font-medium whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800 text-sm text-neutral-500 bg-neutral-900/50">
          <p>Private Instance</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </>
  );
}
