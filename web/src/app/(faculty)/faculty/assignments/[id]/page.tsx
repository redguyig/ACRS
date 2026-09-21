'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Box, Chip, Divider, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  LinearProgress
} from '@mui/material';
import {
  ArrowLeft, Eye, FileCode, Clock, CheckCircle, AlertCircle, ShieldAlert, Users
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { assignmentApi } from '@/lib/api';

function StatusChip({ status }: { status: string }) {
  switch (status) {
    case 'reviewed':
      return <Chip icon={<CheckCircle size={14} />} label="Reviewed" color="success" size="small" variant="outlined" />;
    case 'submitted':
      return <Chip icon={<FileCode size={14} />} label="Submitted" color="info" size="small" variant="outlined" />;
    default:
      return <Chip icon={<Clock size={14} />} label="Pending" color="warning" size="small" variant="outlined" />;
  }
}

export default function FacultyAssignmentDetailPage() {
  const params = useParams();
  const assignmentId = params.id as string;

  const { data: assignment, isLoading, error } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => assignmentApi.get(assignmentId).then(res => res.data),
  });

  const { data: submissionsData } = useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: () => assignmentApi.getSubmissions(assignmentId).then(res => res.data),
    enabled: !!assignmentId,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </Box>
    );
  }

  if (error || !assignment) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="error.main" gutterBottom>
          Assignment not found
        </Typography>
        <Button variant="contained" component={Link} href="/faculty/assignments">
          Back to Assignments
        </Button>
      </Box>
    );
  }

  const submissions = submissionsData?.data || [];
  const rubric = assignment.rubric || (typeof assignment.rubricJson === 'string' ? JSON.parse(assignment.rubricJson) : []);
  const totalMax = rubric.reduce((sum: number, r: any) => sum + r.maxScore, 0);
  const isDeadlinePassed = new Date(assignment.deadline) < new Date();
  const reviewedCount = submissions.filter((s: any) => s.status === 'reviewed').length;
  const submittedCount = submissions.length;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" startIcon={<ArrowLeft size={18} />} component={Link} href="/faculty/assignments">
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          color="secondary"
          startIcon={<ShieldAlert size={18} />}
          component={Link}
          href={`/faculty/plagiarism/${assignmentId}`}
        >
          Plagiarism Check
        </Button>
      </Box>

      {/* Assignment Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h4" gutterBottom>
              {assignment.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label={assignment.language.toUpperCase()} size="small" variant="outlined" />
              {isDeadlinePassed
                ? <Chip label="Deadline Passed" size="small" color="error" />
                : <Chip label={`Due ${formatDistanceToNow(parseISO(assignment.deadline), { addSuffix: true })}`} size="small" color="warning" variant="outlined" />
              }
            </Box>
          </Box>
          <Typography variant="body1" color="text.secondary" paragraph>
            {assignment.description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Deadline: {new Date(assignment.deadline).toLocaleString()}
            {assignment.anonymous && ' · Anonymous grading enabled'}
          </Typography>
        </CardContent>
      </Card>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="primary.main">{submittedCount}</Typography>
            <Typography variant="body2" color="text.secondary">Submissions</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="success.main">{reviewedCount}</Typography>
            <Typography variant="body2" color="text.secondary">Reviewed</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="warning.main">{submittedCount - reviewedCount}</Typography>
            <Typography variant="body2" color="text.secondary">Pending Review</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h3">{totalMax}</Typography>
            <Typography variant="body2" color="text.secondary">Total Points</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Rubric */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Rubric</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Criterion</TableCell>
                  <TableCell align="right">Max Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rubric.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{r.criterion}</TableCell>
                    <TableCell align="right">{r.maxScore} pts</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ fontWeight: 700 }}>
                  <TableCell><strong>Total</strong></TableCell>
                  <TableCell align="right"><strong>{totalMax} pts</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Users size={20} />
            <Typography variant="h6">Submissions ({submittedCount})</Typography>
          </Box>
          {submissions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No submissions yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Submitted At</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((sub: any, index: number) => {
                    const grade = sub.feedback?.totalGrade;
                    return (
                      <TableRow key={sub.id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{sub.student?.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{sub.student?.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(sub.submittedAt).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={sub.status} />
                        </TableCell>
                        <TableCell>
                          {grade !== undefined && grade !== null ? (
                            <Chip label={`${grade}/${totalMax}`} size="small" color="primary" variant="filled" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Eye size={16} />}
                            component={Link}
                            href={`/faculty/review/${sub.id}`}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
