import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create course
  const course = await prisma.course.upsert({
    where: { id: 'course-cse-2024' },
    update: {},
    create: {
      id: 'course-cse-2024',
      name: 'CSE 401 - Software Engineering',
      department: 'Computer Science',
      batchYear: 2024,
    },
  });
  console.log('✅ Course created:', course.name);

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: 'admin',
      courseId: course.id,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create faculty user
  const facultyPassword = await bcrypt.hash('faculty123', 10);
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@demo.com' },
    update: {},
    create: {
      email: 'faculty@demo.com',
      name: 'Dr. Faculty',
      passwordHash: facultyPassword,
      role: 'faculty',
      courseId: course.id,
    },
  });
  console.log('✅ Faculty created:', faculty.email);

  // Create student users
  const studentPassword = await bcrypt.hash('student123', 10);
  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: 'student1@demo.com' },
      update: {},
      create: {
        email: 'student1@demo.com',
        name: 'Alice Johnson',
        passwordHash: studentPassword,
        role: 'student',
        courseId: course.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'student2@demo.com' },
      update: {},
      create: {
        email: 'student2@demo.com',
        name: 'Bob Smith',
        passwordHash: studentPassword,
        role: 'student',
        courseId: course.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'student3@demo.com' },
      update: {},
      create: {
        email: 'student3@demo.com',
        name: 'Carol Davis',
        passwordHash: studentPassword,
        role: 'student',
        courseId: course.id,
      },
    }),
  ]);
  console.log('✅ Students created:', students.map(s => s.email).join(', '));

  // Create assignment
  const assignment = await prisma.assignment.upsert({
    where: { id: 'assignment-1' },
    update: {},
    create: {
      id: 'assignment-1',
      title: 'Implement Binary Search Tree',
      description: 'Implement a binary search tree with insert, delete, and search operations. Include unit tests.',
      language: 'cpp',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      rubricJson: JSON.stringify([
        { criterion: 'Correctness', maxScore: 40 },
        { criterion: 'Code Quality', maxScore: 20 },
        { criterion: 'Test Coverage', maxScore: 20 },
        { criterion: 'Documentation', maxScore: 10 },
        { criterion: 'Performance', maxScore: 10 },
      ]),
      anonymous: false,
      createdBy: faculty.id,
      courseId: course.id,
    },
  });
  console.log('✅ Assignment created:', assignment.title);

  // Create a second assignment
  const assignment2 = await prisma.assignment.upsert({
    where: { id: 'assignment-2' },
    update: {},
    create: {
      id: 'assignment-2',
      title: 'Python Data Analysis',
      description: 'Analyze the provided dataset using pandas and create visualizations with matplotlib.',
      language: 'python',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      rubricJson: JSON.stringify([
        { criterion: 'Data Cleaning', maxScore: 30 },
        { criterion: 'Analysis Depth', maxScore: 30 },
        { criterion: 'Visualizations', maxScore: 25 },
        { criterion: 'Insights', maxScore: 15 },
      ]),
      anonymous: true,
      createdBy: faculty.id,
      courseId: course.id,
    },
  });
  console.log('✅ Assignment created:', assignment2.title);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });