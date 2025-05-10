"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarNavProps {
  items: NavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-5 px-2">
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <span className={`mr-3 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                {item.icon}
              </span>
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 