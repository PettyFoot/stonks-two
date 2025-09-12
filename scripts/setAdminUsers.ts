import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAdminUsers() {
  try {
    // Update user with email dannyvera127@gmail.com to be admin
    const userByEmail = await prisma.user.updateMany({
      where: { email: 'dannyvera127@gmail.com' },
      data: { isAdmin: true }
    });
    
    console.log(`Updated ${userByEmail.count} user(s) with email dannyvera127@gmail.com to admin`);

    // Update user with id cmetebqgb0000uajo7mvvgowi to be admin
    const userById = await prisma.user.updateMany({
      where: { id: 'cmetebqgb0000uajo7mvvgowi' },
      data: { isAdmin: true }
    });
    
    console.log(`Updated ${userById.count} user(s) with id cmetebqgb0000uajo7mvvgowi to admin`);

    // Verify the changes
    const adminUsers = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true
      }
    });

    console.log('All admin users:');
    adminUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
    });

  } catch (error) {
    console.error('Error setting admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminUsers();