import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import puppeteer from 'puppeteer';

const router = Router();

router.get('/:submissionId', authenticate, requireRole('student'), async (req: AuthRequest, res: Response) => {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.submissionId },
    include: {
      assignment: true,
      student: { select: { id: true, name: true, email: true } },
      comments: { include: { faculty: { select: { id: true, name: true } } }, orderBy: { lineNumber: 'asc' } },
      rubricScores: true,
      feedback: true,
    },
  });

  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  if (submission.studentId !== req.user!.userId) {
    throw new AppError('Access denied', 403);
  }

  if (!submission.feedback) {
    throw new AppError('Feedback not yet published', 404);
  }

  res.json({
    submission: {
      ...submission,
      assignment: { ...submission.assignment, rubric: typeof submission.assignment.rubricJson === 'string' ? JSON.parse(submission.assignment.rubricJson) : submission.assignment.rubricJson },
    },
    ...submission.feedback,
  });
});

router.get('/:submissionId/pdf', authenticate, requireRole('student'), async (req: AuthRequest, res: Response) => {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.submissionId },
    include: {
      assignment: true,
      student: { select: { id: true, name: true, email: true } },
      comments: { include: { faculty: { select: { id: true, name: true } } }, orderBy: { lineNumber: 'asc' } },
      rubricScores: true,
      feedback: true,
    },
  });

  if (!submission || !submission.feedback) {
    throw new AppError('Feedback not found', 404);
  }

  if (submission.studentId !== req.user!.userId) {
    throw new AppError('Access denied', 403);
  }

  const html = generateFeedbackHTML(submission);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="feedback-${submission.id}.pdf"`);
    res.send(pdf);
  } finally {
    await browser.close();
  }
});

function generateFeedbackHTML(submission: any): string {
  const { assignment, student, comments, rubricScores, feedback, codeContent, language } = submission;
  const rubric = typeof assignment.rubricJson === 'string' ? JSON.parse(assignment.rubricJson) : assignment.rubricJson;
  const totalMax = rubric.reduce((sum: number, r: any) => sum + r.maxScore, 0);
  const percentage = Math.round((feedback.totalGrade / totalMax) * 100);

  const commentsByLine: Record<number, string[]> = {};
  comments.forEach((c: any) => {
    if (!commentsByLine[c.lineNumber]) commentsByLine[c.lineNumber] = [];
    commentsByLine[c.lineNumber].push(c.content);
  });

  const languageMap: Record<string, string> = { cpp: 'cpp', python: 'python', javascript: 'javascript', java: 'java' };
  const hlLanguage = languageMap[language] || 'text';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Feedback - ${assignment.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #1e3a5f; }
    .header { border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 20px; }
    .grade-badge { display: inline-block; background: #0ea5e9; color: white; padding: 10px 20px; border-radius: 8px; font-size: 1.2em; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #e0e0e0; }
    th { background: #f8fafc; font-weight: 600; }
    tr.total { font-weight: bold; background: #f0f9ff; }
    .code-block { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: 'Monaco', 'Consolas', monospace; font-size: 13px; line-height: 1.5; white-space: pre; }
    .commented-line { background: rgba(245, 158, 11, 0.2); }
    .comment-glyph::before { content: "💬"; margin-right: 5px; }
    .comments-section { margin-top: 30px; }
    .comment { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 15px; margin: 10px 0; border-radius: 0 6px 6px 0; }
    .comment-header { font-weight: bold; color: #92400e; margin-bottom: 5px; }
    .general-feedback { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${assignment.title}</h1>
    <p><strong>Student:</strong> ${student.name} (${student.email})</p>
    <p><strong>Published:</strong> ${new Date(feedback.publishedAt).toLocaleString()}</p>
    <span class="grade-badge">Grade: ${feedback.totalGrade}/${totalMax} (${percentage}%)</span>
  </div>

  <h2>Rubric Breakdown</h2>
  <table>
    <thead>
      <tr><th>Criterion</th><th>Max Score</th><th>Awarded</th></tr>
    </thead>
    <tbody>
      ${rubricScores.map((rs: any) => `
        <tr>
          <td>${rs.criterion}</td>
          <td>${rs.maxScore}</td>
          <td>${rs.awardedScore ?? 0}/${rs.maxScore}</td>
        </tr>
      `).join('')}
      <tr class="total">
        <td>Total</td>
        <td>${totalMax}</td>
        <td>${feedback.totalGrade}/${totalMax}</td>
      </tr>
    </tbody>
  </table>

  ${feedback.generalComment ? `
  <h2>General Feedback</h2>
  <div class="general-feedback">${feedback.generalComment.replace(/\n/g, '<br>')}</div>
  ` : ''}

  <h2>Submitted Code with Inline Comments</h2>
  <div class="code-block">${escapeHtml(codeContent).split('\n').map((line: string, i: number) => {
    const lineNum = i + 1;
    const hasComment = commentsByLine[lineNum];
    return `<div class="${hasComment ? 'commented-line' : ''}"><span class="comment-glyph">${lineNum}:</span> ${line}</div>`;
  }).join('')}</div>

  ${Object.keys(commentsByLine).length > 0 ? `
  <div class="comments-section">
    <h2>Comments</h2>
    ${Object.entries(commentsByLine).map(([lineNum, commentList]) => `
      <div class="comment">
        <div class="comment-header">Line ${lineNum}</div>
        ${commentList.map(c => `<div>${escapeHtml(c).replace(/\n/g, '<br>')}</div>`).join('<hr style="margin: 8px 0; border: none; border-top: 1px solid #fcd34d;">')}
      </div>
    `).join('')}
  </div>
  ` : ''}
</body>
</html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default router;