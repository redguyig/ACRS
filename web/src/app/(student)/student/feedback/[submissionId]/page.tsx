'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Box, Grid, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { feedbackApi } from '@/lib/api';
import { useState, useEffect } from 'react';

export default function FeedbackPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setPrintMode(true);
    const handleAfterPrint = () => setPrintMode(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const { data: feedback, isLoading, error } = useQuery({
    queryKey: ['feedback', submissionId],
    queryFn: () => feedbackApi.get(submissionId).then(res => res.data),
  });

  const handleDownloadPdf = async () => {
    try {
      const response = await feedbackApi.downloadPdf(submissionId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feedback-${submissionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </Box>
    );
  }

  if (error || !feedback) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="error.main" gutterBottom>
          Feedback not found
        </Typography>
        <Button variant="contained" component={Link} href="/student/assignments">
          Back to Assignments
        </Button>
      </Box>
    );
  }

  const { submission, generalComment, totalGrade, rubricScores, publishedAt } = feedback;
  const { codeContent, language, assignment } = submission;

  const commentsByLine: Record<number, string[]> = {};
  submission.comments?.forEach((comment: any) => {
    if (!commentsByLine[comment.lineNumber]) {
      commentsByLine[comment.lineNumber] = [];
    }
    commentsByLine[comment.lineNumber].push(comment.content);
  });

  const languageMap: Record<string, string> = {
    cpp: 'cpp',
    python: 'python',
    javascript: 'javascript',
    java: 'java',
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" startIcon={<ArrowLeft size={18} />} component={Link} href="/student/assignments">
          Back to Assignments
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" startIcon={<Download size={18} />} onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        <Button variant="contained" onClick={() => window.print()}>
          Print
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                {assignment?.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Published on {new Date(publishedAt).toLocaleString()}
              </Typography>
            </Box>
            <Chip
              label={`Grade: ${totalGrade}/${assignment?.rubric.reduce((sum: number, r: any) => sum + r.maxScore, 0)}`}
              color="primary"
              variant="filled"
              icon={<Typography variant="h6" sx={{ fontWeight: 700 }}>{Math.round((totalGrade / (assignment?.rubric.reduce((sum: number, r: any) => sum + r.maxScore, 1)) * 100))}%</Typography>}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" gutterBottom>
            Rubric Breakdown
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Criterion</TableCell>
                  <TableCell align="right">Max Score</TableCell>
                  <TableCell align="right">Awarded</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rubricScores?.map((score: any) => (
                  <TableRow key={score.id}>
                    <TableCell>{score.criterion}</TableCell>
                    <TableCell align="right">{score.maxScore}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${score.awardedScore ?? 0}/${score.maxScore}`}
                        size="small"
                        color={score.awardedScore === score.maxScore ? 'success' : score.awardedScore && score.awardedScore > 0 ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow style={{ fontWeight: 700 }}>
                  <TableCell>Total</TableCell>
                  <TableCell align="right">{assignment?.rubric.reduce((sum: number, r: any) => sum + r.maxScore, 0)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${totalGrade}/${assignment?.rubric.reduce((sum: number, r: any) => sum + r.maxScore, 0)}`}
                      size="small"
                      color="primary"
                      variant="filled"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {generalComment && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              General Feedback
            </Typography>
            <ReactMarkdown>{generalComment}</ReactMarkdown>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Submitted Code with Inline Comments
          </Typography>
          <div style={{ height: '600px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <Editor
              height="100%"
              language={languageMap[language] || 'python'}
              theme={printMode ? 'vs' : 'vs'}
              value={codeContent}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                glyphMargin: true,
              }}
              onMount={(editor, monaco) => {
                const decorations = Object.entries(commentsByLine).map(([lineNum, comments]) => ({
                  range: new monaco.Range(parseInt(lineNum), 1, parseInt(lineNum), 1),
                  options: {
                    isWholeLine: true,
                    className: 'commented-line',
                    glyphMarginClassName: 'comment-glyph',
                    glyphMarginHoverMessage: { value: comments.join('\n\n---\n\n') },
                  },
                }));
                editor.deltaDecorations([], decorations);

                if (printMode) {
                  editor.updateOptions({ lineNumbers: 'off', glyphMargin: false });
                }
              }}
            />
          </div>

          {Object.keys(commentsByLine).length > 0 && !printMode && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Comments
              </Typography>
              {Object.entries(commentsByLine).map(([lineNum, comments]) => (
                <Paper key={lineNum} variant="outlined" sx={{ mb: 2, p: 2 }}>
                  <Typography variant="subtitle2" color="primary.main" gutterBottom>
                    Line {lineNum}
                  </Typography>
                  {comments.map((comment, idx) => (
                    <ReactMarkdown key={idx}>{comment}</ReactMarkdown>
                  ))}
                </Paper>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}