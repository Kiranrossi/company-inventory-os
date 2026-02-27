'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PackageSearch,
  FileBox,
  LineChart,
  Shield
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

  return (
    <div className="flex flex-col w-64 h-screen bg-neutral-900 border-r border-neutral-800 text-neutral-300">
      <div className="flex items-center justify-center h-20 border-b border-neutral-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Warehouse OS
        </h1>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-neutral-800 text-white shadow-lg shadow-black/20'
                : 'hover:bg-neutral-800/50 hover:text-white'
                }`}
            >
              <Icon
                size={20}
                className={`transition-colors ${isActive ? 'text-blue-400' : 'text-neutral-500 group-hover:text-blue-400'
                  }`}
              />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-800 text-sm text-neutral-500">
        <p>Private Instance</p>
        <p>v1.0.0</p>
      </div>
    </div>
  );
}
