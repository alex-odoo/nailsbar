'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/staff/dashboard', label: 'Сьогодні', icon: '📋' },
  { href: '/staff/week',      label: 'Тиждень',  icon: '📅' },
  { href: '/staff/clients',   label: 'Клієнти',  icon: '👥' },
  { href: '/staff/loyalty',   label: 'Картки',   icon: '💅' },
  { href: '/staff/settings',  label: 'Налаш.',   icon: '⚙️', adminOnly: true },
]

export default function StaffNav({ role }: { role: string }) {
  const pathname = usePathname()

  const items = navItems.filter(
    (item) => !item.adminOnly || role === 'ADMIN'
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-cream-dark pb-safe z-50">
      <div className="flex">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
                active ? 'text-navy font-semibold' : 'text-muted'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-navy rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
