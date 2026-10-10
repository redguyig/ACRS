'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Typography, Chip, Button, Box, Grid } from '@mui/material';
import { ArrowRight, FileCode, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { submissionApi } from '@/lib/api';

export default function PreviousAssignmentsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => submissionApi.listMy().then(res => res.data),
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
          Failed to load submissions
        </Typography>
        <Button variant="contained" onClick={() => refetch()}>
          Retry
        </Button>
      </Box>
    );
  }

  const submissions = data?.data || [];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Previous Assignments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View your past assignment submissions and feedback
        </Typography>
      </Box>

      {submissions.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              📋 No submissions yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your submitted assignments will appear here once you submit code.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {submissions.map((submission: any) => {
            const assignment = submission.assignment;
            const isReviewed = submission.status === 'reviewed';
            const totalMax = submission.rubricScores?.reduce((s: number, r: any) => s + r.maxScore, 0) || 0;
            const totalAwarded = submission.feedback?.totalGrade ?? null;

            return (
              <Grid item xs={12} sm={6} lg={4} key={submission.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {assignment.title}
                      </Typography>
                      {isReviewed ? (
                        <Chip
                          icon={<CheckCircle size={16} />}
                          label="Reviewed"
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<Clock size={16} />}
                          label="Awaiting Review"
                          color="warning"
                          variant="outlined"
                          size="small"
                        />
                      )}
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
                      {assignment.course && (
                        <Chip
                          label={assignment.course.name}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      )}
                      {isReviewed && totalAwarded !== null && (
                        <Chip
                          label={`Score: ${totalAwarded}/${totalMax}`}
                          size="small"
                          color="success"
                        />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      Submitted: {new Date(submission.submittedAt).toLocaleString()}
                    </Typography>
                  </CardContent>
                  <CardContent sx={{ pt: 0, borderTop: 1, borderColor: 'divider' }}>
                    {isReviewed ? (
                      <Button
                        component={Link}
                        href={`/student/feedback/${submission.id}`}
                        variant="contained"
                        fullWidth
                        startIcon={<ArrowRight size={18} />}
                      >
                        View Feedback
                      </Button>
                    ) : (
                      <Button
                        component={Link}
                        href={`/student/assignments/${assignment.id}/submit`}
                        variant="outlined"
                        fullWidth
                        startIcon={<FileCode size={18} />}
                      >
                        View Submission
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
