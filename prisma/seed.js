const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcryptjs.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@desco.com',
      password: adminPassword,
      fullName: 'Admin User',
      role: 'admin',
      active: true
    }
  });
  console.log('✅ Admin created:', admin.email);

  // Create managers
  const manager1Password = await bcryptjs.hash('Manager@123', 10);
  const manager1 = await prisma.user.create({
    data: {
      email: 'abdumalik@desco.com',
      password: manager1Password,
      fullName: 'Abdumalik',
      role: 'manager',
      active: true
    }
  });

  const manager2Password = await bcryptjs.hash('Manager@123', 10);
  const manager2 = await prisma.user.create({
    data: {
      email: 'qodirjon@desco.com',
      password: manager2Password,
      fullName: 'Qodirjon',
      role: 'manager',
      active: true
    }
  });
  console.log('✅ Managers created');

  // Create sample clients
  const client1 = await prisma.client.create({
    data: {
      name: 'Texnik Xizmat Ltd',
      phone: '+998901234567',
      email: 'info@texnik.uz',
      region: 'Tashkent',
      address: 'Tashkent City',
      createdBy: admin.id
    }
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Global Trade Co',
      phone: '+998902345678',
      email: 'contact@globaltrade.uz',
      region: 'Samarkand',
      address: 'Samarkand',
      createdBy: admin.id
    }
  });
  console.log('✅ Sample clients created');

  // Create sample deals
  const deal1 = await prisma.deal.create({
    data: {
      clientId: client1.id,
      productName: 'Industrial Equipment',
      contractAmount: 50000,
      downPayment: 10000,
      totalReceived: 10000,
      remainingDebt: 40000,
      status: 'yetkazilmoqda',
      debtStatus: 'aktiv',
      managerId: manager1.id,
      createdBy: manager1.id
    }
  });

  const deal2 = await prisma.deal.create({
    data: {
      clientId: client2.id,
      productName: 'Logistics Services',
      contractAmount: 30000,
      downPayment: 30000,
      totalReceived: 30000,
      remainingDebt: 0,
      status: 'muvaffaqiyatli',
      debtStatus: 'to\'langan',
      managerId: manager2.id,
      createdBy: manager2.id
    }
  });
  console.log('✅ Sample deals created');

  // Create sample payments
  await prisma.payment.create({
    data: {
      dealId: deal1.id,
      amount: 10000,
      notes: 'Initial down payment'
    }
  });

  console.log('✅ Sample payments created');

  // Create sample expenses
  await prisma.expense.create({
    data: {
      dealId: deal1.id,
      driverName: 'Hamid',
      deliveryCost: 5000,
      miscExpenses: 1000,
      totalExpense: 6000,
      userId: manager1.id
    }
  });

  console.log('✅ Sample expenses created');

  // Create sample tasks
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.task.create({
    data: {
      title: 'Follow up with Texnik Xizmat',
      description: 'Call to confirm delivery date',
      dueDate: tomorrow,
      dueTime: '10:00',
      assignedTo: manager1.id
    }
  });

  console.log('✅ Sample tasks created');

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
