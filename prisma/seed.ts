import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')

  // ── Staff ────────────────────────────────────────────
  const adminPin = process.env.ADMIN_PIN ?? '111111'
  const masterPin = process.env.MASTER_PIN ?? '222222'

  const admin = await prisma.staff.upsert({
    where: { phone: '+380000000001' },
    update: {},
    create: {
      name: 'Адмін',
      role: 'ADMIN',
      phone: '+380000000001',
      pinHash: await bcrypt.hash(adminPin, 12),
    },
  })

  const master = await prisma.staff.upsert({
    where: { phone: '+380000000002' },
    update: {},
    create: {
      name: 'Майстер',
      role: 'MASTER',
      phone: '+380000000002',
      pinHash: await bcrypt.hash(masterPin, 12),
    },
  })

  console.log(`✅ Staff: admin (PIN: ${adminPin}), master (PIN: ${masterPin})`)

  // ── Services ─────────────────────────────────────────
  // Deactivate any old placeholder services not in current list
  await prisma.service.updateMany({
    where: { id: { startsWith: 'seed-' } },
    data: { isActive: false },
  })

  const services = [
    // Комплекси
    { name: 'Зняття + манікюр + покриття',          category: 'complex', duration: 90,  price: 750,  sortOrder: 1, description: 'Нові клієнти -20%' },
    { name: 'Зняття + педикюр + покриття',          category: 'complex', duration: 120, price: 900,  sortOrder: 2, description: 'Нові клієнти -20%' },
    { name: 'Комплекс із моделюванням (полігель)',   category: 'complex', duration: 150, price: 900,  sortOrder: 3, description: 'Нові клієнти -20%' },
    { name: 'Корекція нарощення',                   category: 'complex', duration: 120, price: 1000, sortOrder: 4, description: 'від 1000 ₴' },
    { name: 'Нарощення',                            category: 'complex', duration: 150, price: 1100, sortOrder: 5, description: 'від 1100 ₴' },
    // Манікюр
    { name: 'Манікюр гігієнічний',                 category: 'manicure', duration: 60,  price: 400,  sortOrder: 1 },
    { name: 'Покриття (без манікюру)',              category: 'manicure', duration: 30,  price: 400,  sortOrder: 2 },
    { name: 'Зняття',                              category: 'manicure', duration: 20,  price: 100,  sortOrder: 3 },
    { name: 'Форма',                               category: 'manicure', duration: 15,  price: 100,  sortOrder: 4 },
    { name: 'Японський манікюр',                   category: 'manicure', duration: 60,  price: 500,  sortOrder: 5 },
    { name: 'Чоловічий манікюр',                   category: 'manicure', duration: 60,  price: 650,  sortOrder: 6 },
    // Педикюр
    { name: 'Педикюр (без покриття)',              category: 'pedicure', duration: 90,  price: 750,  sortOrder: 1 },
    { name: 'Педикюр пальці',                      category: 'pedicure', duration: 60,  price: 600,  sortOrder: 2 },
    // Дизайн
    { name: 'Дизайн (1 ніготь)',                   category: 'nail_art', duration: 15,  price: 30,   sortOrder: 1, description: 'від 30 ₴' },
    { name: 'Дизайн френч',                        category: 'nail_art', duration: 30,  price: 200,  sortOrder: 2 },
    { name: 'Зняття нарощення',                    category: 'nail_art', duration: 30,  price: 200,  sortOrder: 3 },
    // Додатково
    { name: 'Ремонт (1 ніготь)',                   category: 'extra', duration: 10,  price: 50,   sortOrder: 1 },
    { name: 'Лікування IBX',                       category: 'extra', duration: 30,  price: 300,  sortOrder: 2 },
    { name: 'Зміцнення (гель, пудра)',             category: 'extra', duration: 20,  price: 100,  sortOrder: 3 },
  ]

  for (const s of services) {
    await prisma.service.upsert({
      where: { id: `seed-${s.name}` },
      update: { ...s, isActive: true },
      create: { id: `seed-${s.name}`, ...s, isActive: true },
    })
  }
  console.log(`✅ Services: ${services.length} created`)

  // ── Default schedule (пн-сб 10:00-19:00) ─────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dow = date.getDay()
    const isWorking = dow !== 0 // все крім неділі

    for (const staffMember of [admin, master]) {
      await prisma.schedule.upsert({
        where: { staffId_date: { staffId: staffMember.id, date } },
        update: {},
        create: {
          staffId: staffMember.id,
          date,
          startTime: '10:00',
          endTime: '19:00',
          isWorking,
          breaks: isWorking ? JSON.stringify([{ from: '13:00', to: '14:00' }]) : null,
        },
      })
    }
  }
  console.log('✅ Schedule: next 30 days (Mon-Sat 10:00-19:00)')

  console.log('\n🎉 Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
