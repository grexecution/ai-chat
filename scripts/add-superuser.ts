#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create or update the superuser
  const superuserEmail = process.env.SUPERUSER_EMAIL || 'admin@example.com'
  const superuserPassword = process.env.SUPERUSER_PASSWORD || 'admin1234'
  
  const hashedPassword = await bcrypt.hash(superuserPassword, 10)
  
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: superuserEmail }
    })
    
    if (existingUser) {
      // Update existing user to superuser
      const updated = await prisma.user.update({
        where: { email: superuserEmail },
        data: { 
          role: 'superuser',
          passwordHash: hashedPassword
        }
      })
      console.log(`✅ Updated ${updated.email} as superuser`)
    } else {
      // Create new superuser
      const created = await prisma.user.create({
        data: {
          email: superuserEmail,
          passwordHash: hashedPassword,
          name: 'Admin',
          role: 'superuser'
        }
      })
      console.log(`✅ Created superuser: ${created.email}`)
    }
    
    // Also make the first user (if exists) a superuser
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    })
    
    if (firstUser && firstUser.email !== superuserEmail) {
      await prisma.user.update({
        where: { id: firstUser.id },
        data: { role: 'superuser' }
      })
      console.log(`✅ Made ${firstUser.email} a superuser as well`)
    }
    
    // Show all superusers
    const superusers = await prisma.user.findMany({
      where: { role: 'superuser' },
      select: { email: true, name: true }
    })
    
    console.log('\n📋 Current superusers:')
    superusers.forEach(u => console.log(`  - ${u.email} (${u.name || 'No name'})`))
    
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()