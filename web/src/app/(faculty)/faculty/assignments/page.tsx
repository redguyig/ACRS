'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Box, Button, Chip, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton,
  Switch, FormControlLabel, Snackbar, Alert,
} from '@mui/material';
import {
  Plus, Users, Clock, CheckCircle, FileCode, ArrowRight, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { assignmentApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function FacultyAssignmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [deadline, setDeadline] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [rubric, setRubric] = useState([{ criterion: '', maxScore: 10 }]);

  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentApi.list().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: () => assignmentApi.create({
      title, description, language, anonymous,
      deadline: new Date(deadline).toISOString(),
      rubric: rubric.filter(r => r.criterion.trim()),
      courseId: user?.courseId || '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setCreateOpen(false);
      resetForm();
      setSnackbar({ open: true, message: 'Assignment created!', severity: 'success' });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Failed to create', severity: 'error' });
    },
  });

  const resetForm = () => {
    setTitle(''); setDescription(''); setLanguage('cpp');
    setDeadline(''); setAnonymous(false);
    setRubric([{ criterion: '', maxScore: 10 }]);
  };

  const addRubricRow = () => setRubric([...rubric, { criterion: '', maxScore: 10 }]);
  const removeRubricRow = (i: number) => setRubric(rubric.filter((_, idx) => idx !== i));
  const updateRubric = (i: number, field: string, value: any) => {
    const updated = [...rubric];
    (updated[i] as any)[field] = value;
    setRubric(updated);
  };

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Assignments</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>
          Create Assignment
        </Button>
      </Box>

      {assignments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No assignments yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create your first assignment to get started.
            </Typography>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {assignments.map((a: any) => {
            const isOverdue = new Date(a.deadline) < new Date();
            const totalMax = (a.rubric || []).reduce((sum: number, r: any) => sum + r.maxScore, 0);
            return (
              <Grid item xs={12} sm={6} lg={4} key={a.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6">{a.title}</Typography>
                      <Chip label={a.language.toUpperCase()} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph sx={{ minHeight: 40 }}>
                      {a.description?.substring(0, 100)}{a.description?.length > 100 ? '...' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                      <Chip icon={<Users size={14} />} label={`${a.submissionCount || a._count?.submissions || 0} submissions`} size="small" variant="outlined" />
                      <Chip label={`${totalMax} pts`} size="small" variant="outlined" />
                      {a.anonymous && <Chip label="Anonymous" size="small" color="info" variant="outlined" />}
                    </Box>
                    <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                      {isOverdue ? 'Deadline passed' : `Due ${formatDistanceToNow(parseISO(a.deadline), { addSuffix: true })}`}
                      {' · '}
                      {new Date(a.deadline).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardContent sx={{ pt: 0, borderTop: 1, borderColor: 'divider' }}>
                    <Button
                      component={Link}
                      href={`/faculty/assignments/${a.id}`}
                      variant="contained"
                      fullWidth
                      startIcon={<ArrowRight size={18} />}
                    >
                      View Submissions
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Assignment Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Implement Binary Search Tree" />
            <TextField label="Description" fullWidth multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Language</InputLabel>
                <Select value={language} label="Language" onChange={(e) => setLanguage(e.target.value)}>
                  <MenuItem value="cpp">C++</MenuItem>
                  <MenuItem value="python">Python</MenuItem>
                  <MenuItem value="javascript">JavaScript</MenuItem>
                  <MenuItem value="java">Java</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Deadline"
                type="datetime-local"
                sx={{ flex: 1 }}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <FormControlLabel
              control={<Switch checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />}
              label="Anonymous grading (hide student names during review)"
            />

            <Typography variant="subtitle2" sx={{ mt: 1 }}>Rubric Criteria</Typography>
            {rubric.map((r, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label={`Criterion ${i + 1}`}
                  sx={{ flex: 3 }}
                  size="small"
                  value={r.criterion}
                  onChange={(e) => updateRubric(i, 'criterion', e.target.value)}
                  placeholder="e.g. Correctness"
                />
                <TextField
                  label="Max Score"
                  type="number"
                  sx={{ flex: 1 }}
                  size="small"
                  value={r.maxScore}
                  onChange={(e) => updateRubric(i, 'maxScore', parseInt(e.target.value) || 0)}
                />
                {rubric.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeRubricRow(i)}>
                    <Trash2 size={16} />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button variant="outlined" size="small" startIcon={<Plus size={16} />} onClick={addRubricRow}>
              Add Criterion
            </Button>
            <Typography variant="caption" color="text.secondary">
              Total: {rubric.reduce((sum, r) => sum + (r.maxScore || 0), 0)} points
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => createMutation.mutate()}
            disabled={!title || !deadline || rubric.filter(r => r.criterion.trim()).length === 0 || createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
