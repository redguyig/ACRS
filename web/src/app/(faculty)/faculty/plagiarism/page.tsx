'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Typography, Box, Button, Chip, Grid } from '@mui/material';
import { Users, Bug, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { assignmentApi } from '@/lib/api';

export default function FacultyPlagiarismPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentApi.list().then(res => res.data),
  });

  const assignments = data?.data || [];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Plagiarism Checks</Typography>
        <Typography variant="body1" color="text.secondary">
          Run and view plagiarism detection reports across all submissions for an assignment.
        </Typography>
      </Box>

      {assignments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No assignments yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create an assignment and wait for submissions to run plagiarism checks.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {assignments.map((a: any) => {
            return (
              <Grid item xs={12} sm={6} lg={4} key={a.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6">{a.title}</Typography>
                      <Chip label={a.language.toUpperCase()} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1, mt: 2 }}>
                      <Chip icon={<Users size={14} />} label={`${a.submissionCount || a._count?.submissions || 0} submissions`} size="small" variant="outlined" />
                    </Box>
                  </CardContent>
                  <CardContent sx={{ pt: 0, borderTop: 1, borderColor: 'divider' }}>
                    <Button
                      component={Link}
                      href={`/faculty/plagiarism/${a.id}`}
                      variant="contained"
                      color="secondary"
                      fullWidth
                      startIcon={<Bug size={18} />}
                    >
                      View Report
                    </Button>
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
