const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', passwordHash: hash, role: 'admin' }
  })
  const userHash = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where: { email: 'user@demo.com' },
    update: {},
    create: { email: 'user@demo.com', passwordHash: userHash, role: 'user' }
  })
  console.log('Seed completado. Admin: admin@demo.com / admin123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
