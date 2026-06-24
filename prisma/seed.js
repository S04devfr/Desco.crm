const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  // Avval bazani tozalash
  await prisma.task.deleteMany()
  await prisma.expense.deleteMany()
  try { await prisma.$executeRawUnsafe('DELETE FROM "ActivityLog"') } catch(e) {}
  await prisma.deal.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()
  try { await prisma.$executeRawUnsafe('DELETE FROM "PipelineStage"') } catch(e) {}

  // Default pipeline bosqichlari
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PipelineStage" (id, name, color, "order", isDefault, createdAt, updatedAt) VALUES
        (1, 'Yangi', '#1565C0', 1, 1, datetime('now'), datetime('now')),
        (2, 'Muzokaralar', '#F57F17', 2, 0, datetime('now'), datetime('now')),
        (3, 'Taklif', '#512DA8', 3, 0, datetime('now'), datetime('now')),
        (4, 'Yutilgan', '#2E7D32', 4, 0, datetime('now'), datetime('now')),
        (5, 'Yoqotilgan', '#C62828', 5, 0, datetime('now'), datetime('now'))
    `)
    console.log('✅ Pipeline stages seeded')
  } catch(e) { console.log('Pipeline stages error:', e.message) }

  const adminPassword = await bcrypt.hash('Admin@123', 10)
  const managerPassword = await bcrypt.hash('Manager@123', 10)

  // Admin foydalanuvchi qo'shish
  const admin = await prisma.user.create({
    data: {
      fullName: 'Admin',
      email: 'admin@desco.com',
      password: adminPassword,
      role: 'admin'
    }
  })

  // Manager foydalanuvchilar qo'shish
  const manager1 = await prisma.user.create({
    data: {
      fullName: 'Abdumalik',
      email: 'abdumalik@desco.com',
      password: managerPassword,
      role: 'manager'
    }
  })

  const manager2 = await prisma.user.create({
    data: {
      fullName: 'Qodirjon',
      email: 'qodirjon@desco.com',
      password: managerPassword,
      role: 'manager'
    }
  })

  // Mijozlar
  const client1 = await prisma.client.create({
    data: { name: 'Aziz Karimov', phone: '+998901234567', email: 'aziz@example.com', company: 'Aziz LLC', ownerId: manager1.id }
  })

  const client2 = await prisma.client.create({
    data: { name: 'Dilnoza Yusupova', phone: '+998901112233', email: 'dilnoza@example.com', company: 'Dilnoza Trade', ownerId: manager2.id }
  })

  // Sdelkalar (stageId bilan)
  const deal1 = await prisma.deal.create({
    data: { productName: 'Noutbuk', amount: 8000000, paidAmount: 8000000, status: 'won', clientId: client1.id, managerId: manager1.id }
  })
  try { await prisma.$executeRawUnsafe('UPDATE "Deal" SET stageId=4 WHERE id=?', deal1.id) } catch(e) {}

  const deal2 = await prisma.deal.create({
    data: { productName: 'Telefon', amount: 4500000, paidAmount: 2000000, status: 'new', clientId: client2.id, managerId: manager2.id }
  })
  try { await prisma.$executeRawUnsafe('UPDATE "Deal" SET stageId=2 WHERE id=?', deal2.id) } catch(e) {}

  const deal3 = await prisma.deal.create({
    data: { productName: 'Monitor', amount: 1500000, paidAmount: 1500000, status: 'won', clientId: client1.id, managerId: manager1.id }
  })
  try { await prisma.$executeRawUnsafe('UPDATE "Deal" SET stageId=3 WHERE id=?', deal3.id) } catch(e) {}

  // Xarajatlar
  await prisma.expense.create({
    data: { description: 'Yoqilg\'i', amount: 300000, category: 'logistics', createdById: admin.id }
  })

  await prisma.expense.create({
    data: { description: 'Ofis ijarasi', amount: 1000000, category: 'office', createdById: admin.id }
  })

  // Vazifalar
  const today = new Date()
  today.setHours(18, 0, 0, 0)

  await prisma.task.create({
    data: { title: 'Aziz bilan bog\'lanish', dueDate: today, dueTime: '18:00', assignedToId: manager1.id }
  })

  await prisma.task.create({
    data: { title: 'Dilnoza uchun hujjat tayyorlash', dueDate: today, dueTime: '17:00', assignedToId: manager2.id }
  })
}

main()
  .then(() => {
    console.log('✅ db seeding completed')
  })
  .catch((e) => {
    console.error('❌ db seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
