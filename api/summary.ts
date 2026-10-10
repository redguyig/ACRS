import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.user.findMany({
    where: { role: 'student' },
    include: { submissions: true }
  });

  const totalAssignments = await prisma.assignment.count();

  console.log(`\n=== STUDENT SUMMARY ===`);
  for (const student of students) {
    const submitted = student.submissions.length;
    const notSubmitted = totalAssignments - submitted;
    const reviewed = student.submissions.filter(s => s.status === 'reviewed').length;
    const flagged = await prisma.plagiarism.count({
      where: {
        OR: [{ studentAId: student.id }, { studentBId: student.id }]
      }
    });

    console.log(`\n${student.name} (${student.email}):`);
    console.log(`  - Submitted: ${submitted}`);
    console.log(`  - Not Submitted: ${notSubmitted}`);
    console.log(`  - Reviewed/Checked: ${reviewed}`);
    if (flagged > 0) {
      console.log(`  - ⚠️ Flagged for Plagiarism in ${flagged} assignment(s)`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
