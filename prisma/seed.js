const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Avval bazani tozalash
  await prisma.user.deleteMany()

  // Admin foydalanuvchi qo‘shish
  await prisma.user.create({
    data: {
      fullName: 'Admin',
      email: 'admin@desco.com',
      password: 'Admin@123',
      role: 'admin'
    }
  })

  // Manager foydalanuvchi qo‘shish
  await prisma.user.create({
    data: {
      fullName: 'Manager',
      email: 'manager@desco.com',
      password: 'Manager@123',
      role: 'manager'
    }
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