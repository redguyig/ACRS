'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Typography, Chip, Button, Box, Grid } from '@mui/material';
import { ArrowRight, FileCode, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { assignmentApi } from '@/lib/api';
import { Assignment } from '@/types';

function StatusBadge({ status, deadline }: { status: Assignment['status']; deadline: string }) {
  const isOverdue = new Date(deadline) < new Date();
  
  if (status === 'reviewed') {
    return (
      <Chip
        icon={<CheckCircle size={16} />}
        label="Reviewed"
        color="success"
        variant="outlined"
        size="small"
      />
    );
  }
  
  if (status === 'submitted') {
    return (
      <Chip
        icon={<FileCode size={16} />}
        label="Submitted"
        color="info"
        variant="outlined"
        size="small"
      />
    );
  }
  
  if (isOverdue) {
    return (
      <Chip
        icon={<AlertCircle size={16} />}
        label="Overdue"
        color="error"
        variant="outlined"
        size="small"
      />
    );
  }
  
  return (
    <Chip
      icon={<Clock size={16} />}
      label="Pending"
      color="warning"
      variant="outlined"
      size="small"
    />
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const isOverdue = new Date(assignment.deadline) < new Date() && assignment.status !== 'reviewed';
  const timeLeft = isOverdue ? null : formatDistanceToNow(parseISO(assignment.deadline), { addSuffix: true });

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {assignment.title}
          </Typography>
          <StatusBadge status={assignment.status} deadline={assignment.deadline} />
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph sx={{ flexGrow: 1 }}>
          {assignment.description}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip
            label={assignment.language.toUpperCase()}
            size="small"
            variant="outlined"
            color="default"
          />
          <Chip
            label={`${assignment.rubric.reduce((sum, r) => sum + r.maxScore, 0)} pts total`}
            size="small"
            variant="outlined"
            color="default"
          />
        </Box>
        <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
          Deadline: {parseISO(assignment.deadline).toLocaleString()}
          {timeLeft && !isOverdue && <span> · {timeLeft} left</span>}
        </Typography>
      </CardContent>
      <CardContent sx={{ pt: 0, borderTop: 1, borderColor: 'divider' }}>
        {assignment.status === 'reviewed' ? (
          <Button
            component={Link}
            href={`/student/feedback/${assignment.submissions?.[0]?.id}`}
            variant="contained"
            fullWidth
            startIcon={<ArrowRight size={18} />}
          >
            View Feedback
          </Button>
        ) : assignment.status === 'submitted' ? (
          <Button
            component={Link}
            href={`/student/assignments/${assignment.id}/submit`}
            variant="outlined"
            fullWidth
            startIcon={<FileCode size={18} />}
          >
            View Submission
          </Button>
        ) : (
          <Button
            component={Link}
            href={`/student/assignments/${assignment.id}/submit`}
            variant="contained"
            fullWidth
            startIcon={<FileCode size={18} />}
            disabled={isOverdue}
          >
            {isOverdue ? 'Deadline Passed' : 'Submit Code'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudentAssignmentsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentApi.list().then(res => res.data),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="error.main" gutterBottom>
          Failed to load assignments
        </Typography>
        <Button variant="contained" onClick={() => refetch()}>
          Retry
        </Button>
      </Box>
    );
  }

  const assignments = data?.data || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Assignments
        </Typography>
      </Box>
      {assignments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No assignments yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check back later for new assignments from your faculty.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {assignments.map((assignment: Assignment) => (
            <Grid item xs={12} sm={6} lg={4} key={assignment.id}>
              <AssignmentCard assignment={assignment} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}