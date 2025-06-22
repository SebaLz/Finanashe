"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

interface SidebarNavProps {
  items: NavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="px-2">
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <span className={`mr-2 flex-shrink-0 ${
                isActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
              }`}>
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                  {item.title}
                </div>
                {item.description && (
                  <div className={`text-xs mt-0.5 ${
                    isActive 
                      ? 'text-blue-600/70 dark:text-blue-400/70' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {item.description}
                  </div>
                )}
              </div>
              {isActive && (
                <div className="flex-shrink-0 ml-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 