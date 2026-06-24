/**
 * DB Auto-Migration — Server startupda avtomatik ishga tushadi.
 */
async function runMigrations(prisma) {
  console.log('🔧 DB migration boshlandi...')

  // 1. Pipeline jadvali
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Pipeline" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        isDefault INTEGER NOT NULL DEFAULT 0,
        color TEXT NOT NULL DEFAULT '#007AFF',
        "order" INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Pipeline table ready')
  } catch (e) { console.log('ℹ️  Pipeline:', e.message?.slice(0, 60)) }

  // 2. PipelineStage jadvali
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PipelineStage" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#5D4037',
        "order" INTEGER NOT NULL DEFAULT 0,
        isDefault INTEGER NOT NULL DEFAULT 0,
        pipelineId INTEGER REFERENCES "Pipeline"(id),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ PipelineStage table ready')
  } catch (e) { console.log('ℹ️  PipelineStage:', e.message?.slice(0, 60)) }

  // 3. ActivityLog jadvali
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        dealId INTEGER REFERENCES "Deal"(id) ON DELETE CASCADE,
        userId INTEGER REFERENCES "User"(id)
      )
    `)
  } catch (e) {}

  // 4. CompanySettings jadvali
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CompanySettings" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        companyName TEXT NOT NULL DEFAULT 'DESCO CRM',
        currency TEXT NOT NULL DEFAULT 'UZS',
        logoUrl TEXT,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch (e) {}

  // 5–9. Ustunlar qo'shish
  const cols = [
    [`ALTER TABLE "Deal" ADD COLUMN "stageId" INTEGER`, 'Deal.stageId'],
    [`ALTER TABLE "Deal" ADD COLUMN "deadline" DATETIME`, 'Deal.deadline'],
    [`ALTER TABLE "Deal" ADD COLUMN "pipelineId" INTEGER REFERENCES "Pipeline"(id)`, 'Deal.pipelineId'],
    [`ALTER TABLE "PipelineStage" ADD COLUMN "pipelineId" INTEGER REFERENCES "Pipeline"(id)`, 'PipelineStage.pipelineId'],
    [`ALTER TABLE "Task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium'`, 'Task.priority'],
    [`ALTER TABLE "Task" ADD COLUMN "clientId" INTEGER REFERENCES "Client"(id)`, 'Task.clientId'],
    [`ALTER TABLE "Client" ADD COLUMN "companyAddress" TEXT`, 'Client.companyAddress'],
  ]
  for (const [sql, name] of cols) {
    try { await prisma.$executeRawUnsafe(sql); console.log('✅ ' + name + ' added') }
    catch (e) { /* already exists */ }
  }

  // 10. Default Pipeline
  try {
    await prisma.$executeRawUnsafe(`
      INSERT OR IGNORE INTO "Pipeline" (id, name, isDefault, color, "order", createdAt, updatedAt)
      VALUES (1, 'Asosiy voronka', 1, '#007AFF', 1, datetime('now'), datetime('now'))
    `)
    console.log('✅ Default Pipeline ready')
  } catch (e) { console.log('ℹ️  Pipeline default:', e.message?.slice(0, 60)) }

  // 11. Default stages
  try {
    await prisma.$executeRawUnsafe(`
      INSERT OR IGNORE INTO "PipelineStage" (id, name, color, "order", isDefault, pipelineId) VALUES
        (1, 'Yangi', '#1565C0', 1, 1, 1),
        (2, 'Muzokaralar', '#F57F17', 2, 0, 1),
        (3, 'Taklif', '#512DA8', 3, 0, 1),
        (4, 'Yutilgan', '#2E7D32', 4, 0, 1),
        (5, 'Yoqotilgan', '#C62828', 5, 0, 1)
    `)
    console.log('✅ Default stages ready')
  } catch (e) {}

  // 12. Mavjud stage'larni pipelineId=1 ga bog'lash
  try {
    await prisma.$executeRawUnsafe(`UPDATE "PipelineStage" SET pipelineId=1 WHERE pipelineId IS NULL`)
    console.log('✅ Stages linked to default pipeline')
  } catch (e) {}

  // 13. Mavjud deal'larni pipelineId=1 ga bog'lash
  try {
    await prisma.$executeRawUnsafe(`UPDATE "Deal" SET pipelineId=1 WHERE pipelineId IS NULL`)
    console.log('✅ Deals linked to default pipeline')
  } catch (e) {}

  // 14. Default company settings
  try {
    await prisma.$executeRawUnsafe(`
      INSERT OR IGNORE INTO "CompanySettings" (id, companyName, currency, updatedAt)
      VALUES (1, 'DESCO CRM', 'UZS', datetime('now'))
    `)
  } catch (e) {}

  // 15. Indexes on Deal.stageId / Deal.managerId — Kanban drag-and-drop and
  // dashboard queries filter/group by these columns constantly, so without
  // an index every drag-drop, column render, and KPI query does a full
  // table scan. CREATE INDEX IF NOT EXISTS is idempotent and safe to run
  // on every startup.
  const indexes = [
    [`CREATE INDEX IF NOT EXISTS "Deal_stageId_idx" ON "Deal"("stageId")`, 'Deal.stageId index'],
    [`CREATE INDEX IF NOT EXISTS "Deal_managerId_idx" ON "Deal"("managerId")`, 'Deal.managerId index'],
  ]
  for (const [sql, name] of indexes) {
    try { await prisma.$executeRawUnsafe(sql); console.log('✅ ' + name + ' ready') }
    catch (e) { console.log('ℹ️  ' + name + ':', e.message?.slice(0, 60)) }
  }

  console.log('✅ DB migration tugadi')
}

module.exports = runMigrations
