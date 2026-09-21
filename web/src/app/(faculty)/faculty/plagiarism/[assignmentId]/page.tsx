'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import {
  Card, CardContent, Typography, Box, Button, Chip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, IconButton, Tooltip, Snackbar, Menu, MenuItem,
} from '@mui/material';
import {
  ArrowLeft, ShieldAlert, RefreshCw, CheckCircle, AlertTriangle,
  MoreVertical, Eye, Flag,
} from 'lucide-react';
import Link from 'next/link';
import { assignmentApi, plagiarismApi } from '@/lib/api';

function SeverityChip({ pct }: { pct: number }) {
  if (pct >= 70) return <Chip label={`${pct}%`} size="small" sx={{ bgcolor: '#fecaca', color: '#991b1b', fontWeight: 700 }} />;
  if (pct >= 50) return <Chip label={`${pct}%`} size="small" sx={{ bgcolor: '#fed7aa', color: '#9a3412', fontWeight: 700 }} />;
  return <Chip label={`${pct}%`} size="small" sx={{ bgcolor: '#fef08a', color: '#854d0e', fontWeight: 700 }} />;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'reviewed':
      return <Chip icon={<CheckCircle size={14} />} label="Reviewed" color="success" size="small" />;
    case 'escalated':
      return <Chip icon={<AlertTriangle size={14} />} label="Escalated" color="error" size="small" />;
    default:
      return <Chip icon={<Flag size={14} />} label="Flagged" color="warning" size="small" />;
  }
}

export default function PlagiarismPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const assignmentId = params.assignmentId as string;
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const { data: assignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => assignmentApi.get(assignmentId).then(res => res.data),
  });

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['plagiarism-status', assignmentId],
    queryFn: () => plagiarismApi.status(assignmentId).then(res => res.data),
  });

  const { data: resultsData, refetch: refetchResults } = useQuery({
    queryKey: ['plagiarism-results', assignmentId],
    queryFn: () => plagiarismApi.results(assignmentId).then(res => res.data),
  });

  const runMutation = useMutation({
    mutationFn: () => plagiarismApi.run(assignmentId),
    onSuccess: (res) => {
      setSnackbar({ open: true, message: 'Plagiarism check started', severity: 'info' });
      startPolling();
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Failed to start check', severity: 'error' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'reviewed' | 'escalated' }) =>
      plagiarismApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plagiarism-results', assignmentId] });
      setMenuAnchor(null);
      setSnackbar({ open: true, message: 'Status updated', severity: 'success' });
    },
  });

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await plagiarismApi.status(assignmentId);
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        refetchStatus();
        refetchResults();
        setSnackbar({
          open: true,
          message: data.status === 'completed' ? 'Plagiarism check completed!' : 'Plagiarism check failed',
          severity: data.status === 'completed' ? 'success' : 'error',
        });
      }
    }, 3000);
  };

  useEffect(() => {
    if (statusData?.status === 'pending' || statusData?.status === 'running') {
      startPolling();
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [statusData?.status]);

  const results = resultsData?.data || [];
  const isRunning = statusData?.status === 'pending' || statusData?.status === 'running';
  const isDeadlinePassed = assignment ? new Date(assignment.deadline) < new Date() : false;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowLeft size={18} />} component={Link}
          href={`/faculty/assignments/${assignmentId}`}>
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Plagiarism Check</Typography>
          <Typography variant="body2" color="text.secondary">
            {assignment?.title}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="warning"
          startIcon={isRunning ? <RefreshCw size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
          onClick={() => runMutation.mutate()}
          disabled={isRunning || runMutation.isPending}
        >
          {isRunning ? 'Running...' : 'Run Plagiarism Check'}
        </Button>
      </Box>



      {isRunning && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body1" gutterBottom>Plagiarism check in progress...</Typography>
            <LinearProgress color="warning" />
          </CardContent>
        </Card>
      )}

      {/* Status summary */}
      {statusData && statusData.status !== 'not_started' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">{results.length}</Typography>
              <Typography variant="body2" color="text.secondary">Pairs Found</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="error.main">
                {results.filter((r: any) => r.similarityPct >= 70).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">High Similarity (≥70%)</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {results.filter((r: any) => r.status === 'reviewed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Reviewed</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Results Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Similarity Results
          </Typography>
          {results.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {statusData?.status === 'not_started' || !statusData
                ? 'No plagiarism check has been run yet. Click "Run Plagiarism Check" to start.'
                : statusData?.status === 'completed'
                  ? 'No suspicious pairs found above the threshold.'
                  : 'Waiting for results...'}
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Student A</TableCell>
                    <TableCell>Student B</TableCell>
                    <TableCell align="center">Similarity</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result: any, index: number) => (
                    <TableRow key={result.id} hover
                      sx={{
                        bgcolor: result.similarityPct >= 70
                          ? 'rgba(239, 68, 68, 0.05)'
                          : result.similarityPct >= 50
                            ? 'rgba(249, 115, 22, 0.05)'
                            : 'transparent',
                      }}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{result.studentA?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{result.studentA?.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{result.studentB?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{result.studentB?.email}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <SeverityChip pct={result.similarityPct} />
                      </TableCell>
                      <TableCell align="center">
                        <StatusBadge status={result.status} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small"
                          onClick={(e) => setMenuAnchor({ el: e.currentTarget, id: result.id })}>
                          <MoreVertical size={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          if (menuAnchor) updateStatusMutation.mutate({ id: menuAnchor.id, status: 'reviewed' });
        }}>
          <CheckCircle size={16} style={{ marginRight: 8 }} /> Mark as Reviewed
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuAnchor) updateStatusMutation.mutate({ id: menuAnchor.id, status: 'escalated' });
        }}>
          <AlertTriangle size={16} style={{ marginRight: 8, color: '#ef4444' }} /> Escalate
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
