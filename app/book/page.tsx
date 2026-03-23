import { prisma } from '@/lib/prisma'
import BookingWizard from '@/components/booking/BookingWizard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Запис онлайн — Nailsbar Odesa',
  description: 'Запишіться на манікюр та педикюр онлайн. Nailsbar Odesa — професійний догляд за нігтями в Одесі.',
}

export default async function BookPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    select: { id: true, name: true, category: true, duration: true, price: true, description: true },
  })

  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    select: { id: true, name: true, avatar: true },
  })

  return (
    <main className="min-h-screen bg-cream max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 text-center">
        <h1 className="text-5xl font-display text-navy tracking-wider">NAILSBAR</h1>
        <p className="text-xs tracking-[0.3em] text-muted uppercase mt-1">Odesa</p>
        <p className="text-sm text-muted mt-3">Запис онлайн</p>
        <div className="w-12 h-px bg-cream-dark mx-auto mt-4" />
      </div>

      <BookingWizard services={services} staff={staff} />
    </main>
  )
}
