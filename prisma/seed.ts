import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo user
  const demoPassword = await bcrypt.hash('demo1234', 10)
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {
      passwordHash: demoPassword,
      name: 'Demo User'
    },
    create: {
      email: 'demo@example.com',
      passwordHash: demoPassword,
      name: 'Demo User',
      role: 'user'
    },
  })

  console.log('✅ Demo user created/updated:', { id: demoUser.id, email: demoUser.email })
  
  // Create admin user
  const adminPassword = await bcrypt.hash('admin1234', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: adminPassword,
      name: 'Admin',
      role: 'superuser'
    },
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: 'Admin',
      role: 'superuser'
    }
  })
  
  console.log('✅ Admin user created/updated:', { id: adminUser.id, email: adminUser.email })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })