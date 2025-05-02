"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, CreditCard, DollarSign, LayoutDashboard, LogOut, Settings, Users } from "lucide-react"
import { useTranslation } from 'react-i18next';

import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation('layout');

  const routes = [
    {
      name: t('sidebar.dashboard'),
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: t('sidebar.donations'),
      path: "/donations",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      name: t('sidebar.expenses'),
      path: "/expenses",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      name: t('sidebar.members'),
      path: "/members",
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: t('sidebar.reports'),
      path: "/reports",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      name: t('sidebar.banking'),
      path: "/banking",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      name: t('sidebar.flows', 'Flows'),
      path: "/flows",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  const handleLogout = () => {
    // TODO: Implement proper Clerk logout
    router.push("/signin")
  }

  return (
    <div className="h-full w-64 bg-gray-50 dark:bg-gray-900">
      <nav className="flex h-full flex-col gap-1 p-2">
        {routes.map((route) => (
          <Link
            key={route.path}
            href={route.path}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === route.path
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
            )}
          >
            {route.icon}
            {route.name}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <LogOut className="h-5 w-5" />
          {t('sidebar.signOut')}
        </button>
      </nav>
    </div>
  )
} 