/**
 * DB Auto-Migration — Server startupda avtomatik ishga tushadi.
 * PostgreSQL (Supabase) uchun moslashtirilgan.
 */
async function runMigrations(prisma) {
  console.log('🔧 DB migration boshlandi...')

  // 1. Default Pipeline
  try {
    const exists = await prisma.pipeline.findFirst({ where: { isDefault: true } })
    if (!exists) {
      await prisma.pipeline.create({
        data: {
          name: 'Asosiy voronka',
          isDefault: true,
          color: '#007AFF',
          order: 1
        }
      })
      console.log('✅ Default Pipeline yaratildi')
    } else {
      console.log('✅ Default Pipeline mavjud')
    }
  } catch (e) { console.log('ℹ️  Pipeline:', e.message?.slice(0, 80)) }

  // 2. Default stages
  try {
    const pipeline = await prisma.pipeline.findFirst({ where: { isDefault: true } })
    if (pipeline) {
      const stageCount = await prisma.pipelineStage.count({ where: { pipelineId: pipeline.id } })
      if (stageCount === 0) {
        const stages = [
          { name: 'Yangi', color: '#1565C0', order: 1, isDefault: true, pipelineId: pipeline.id },
          { name: 'Muzokaralar', color: '#F57F17', order: 2, isDefault: false, pipelineId: pipeline.id },
          { name: 'Taklif', color: '#512DA8', order: 3, isDefault: false, pipelineId: pipeline.id },
          { name: 'Yutilgan', color: '#2E7D32', order: 4, isDefault: false, pipelineId: pipeline.id },
          { name: "Yo'qotilgan", color: '#C62828', order: 5, isDefault: false, pipelineId: pipeline.id },
        ]
        for (const s of stages) {
          await prisma.pipelineStage.create({ data: s })
        }
        console.log('✅ Default stages yaratildi')
      } else {
        console.log('✅ Default stages mavjud')
      }
    }
  } catch (e) { console.log('ℹ️  Stages:', e.message?.slice(0, 80)) }

  // 3. Default company settings
  try {
    const settings = await prisma.companySettings.findFirst()
    if (!settings) {
      await prisma.companySettings.create({
        data: { companyName: 'DESCO CRM', currency: 'UZS' }
      })
      console.log('✅ Default CompanySettings yaratildi')
    }
  } catch (e) { console.log('ℹ️  CompanySettings:', e.message?.slice(0, 80)) }

  // 4. Admin user (agar mavjud bo'lmasa)
  try {
    const bcrypt = require('bcryptjs')
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@desco.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123'
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!existing) {
      const hash = await bcrypt.hash(adminPassword, 12)
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hash,
          fullName: 'Administrator',
          role: 'admin'
        }
      })
      console.log('✅ Admin user yaratildi: ' + adminEmail)
    } else {
      console.log('✅ Admin user mavjud')
    }
  } catch (e) { console.log('ℹ️  Admin user:', e.message?.slice(0, 80)) }

  console.log('✅ DB migration tugadi')
}

module.exports = runMigrations
