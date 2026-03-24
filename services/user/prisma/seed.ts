import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Reusable helper to create or update a role and its associated permissions.
 */
async function upsertRoleWithPermissions(data: {
  id: string;
  name: string;
  priority: number;
  description: string;
  permissionIds: string[];
}) {
  console.log(`Creating/Updating role: ${data.id}...`);

  // 1. Upsert the Role itself
  const role = await prisma.role.upsert({
    where: { id: data.id },
    update: {
      name: data.name,
      priority: data.priority,
      description: data.description,
    },
    create: {
      id: data.id,
      name: data.name,
      priority: data.priority,
      description: data.description,
    },
  });

  // 2. Link permissions to the role
  for (const permissionId of data.permissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permissionId,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permissionId,
      },
    });
  }

  return role;
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Step 1: Define and upsert all possible permissions
  const allPermissions = [
    { id: 'article:read', description: 'Can view articles' },
    { id: 'article:write', description: 'Can create and edit articles' },
    { id: 'profile:edit', description: 'Can edit own profile' },
    { id: 'user:manage', description: 'Can manage other users' },
  ];

  for (const p of allPermissions) {
    await prisma.permission.upsert({
      where: { id: p.id },
      update: { description: p.description },
      create: p,
    });
  }

  // Step 2: Create the standard 'user' role
  await upsertRoleWithPermissions({
    id: 'user',
    name: 'Standard User',
    priority: 10,
    description: 'Default role for all registered users',
    permissionIds: ['article:read', 'profile:edit'],
  });

  // Step 3: Example of adding future roles easily
  await upsertRoleWithPermissions({
    id: 'admin',
    name: 'Administrator',
    priority: 1,
    description: 'Full system access',
    permissionIds: ['article:read', 'article:write', 'profile:edit', 'user:manage'],
  });

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
