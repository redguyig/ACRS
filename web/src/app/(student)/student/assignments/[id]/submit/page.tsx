'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card, CardContent, Typography, Button, Box, Alert, Divider,
  TextField, InputAdornment, IconButton, Snackbar, Chip
} from '@mui/material';
import { FileCode, Upload, Save, CheckCircle, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentApi, submissionApi } from '@/lib/api';
import { Assignment } from '@/types';

const submitSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
});

type SubmitForm = z.infer<typeof submitSchema>;

const languageMap: Record<string, string> = {
  cpp: 'cpp',
  python: 'python',
  javascript: 'javascript',
  java: 'java',
};

export default function SubmitPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const assignmentId = params.id as string;
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [editorMounted, setEditorMounted] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);

  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => assignmentApi.get(assignmentId).then(res => res.data),
  });

  const { data: existingSubmission } = useQuery({
    queryKey: ['submission', assignmentId],
    queryFn: () => assignmentApi.getSubmissions(assignmentId).then(res => res.data?.find((s: any) => s.studentId === 'current')),
    enabled: !!assignmentId,
  });

  const submitMutation = useMutation({
    mutationFn: (data: SubmitForm) => submissionApi.create({
      assignmentId,
      code: data.code,
      language: assignment?.language || 'python',
    }),
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Code submitted successfully!', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setTimeout(() => router.push('/student/assignments'), 1500);
    },
    onError: (err: unknown) => {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setSnackbar({ open: true, message: axiosError.response?.data?.error || 'Submission failed', severity: 'error' });
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubmitForm>({
    resolver: zodResolver(submitSchema),
    defaultValues: { code: existingSubmission?.codeContent || '' },
  });

  const code = watch('code');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      setSnackbar({ open: true, message: 'File size must be less than 100 KB', severity: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setValue('code', content);
      setFileUploaded(true);
    };
    reader.readAsText(file);
  };

  const isDeadlinePassed = assignment ? new Date(assignment.deadline) < new Date() : false;

  if (assignmentLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </Box>
    );
  }

  if (!assignment) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="error.main" gutterBottom>
          Assignment not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {assignment.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {assignment.description}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip label={assignment.language.toUpperCase()} size="small" variant="outlined" />
          <Chip label={`Deadline: ${new Date(assignment.deadline).toLocaleString()}`} size="small" variant="outlined" />
          {isDeadlinePassed && <Chip label="Deadline Passed" size="small" color="error" variant="filled" />}
        </Box>
      </Box>

      {isDeadlinePassed && (
        <Alert severity="error" sx={{ mb: 3 }}>
          The submission deadline has passed. You can no longer submit code for this assignment.
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Rubric
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Criterion</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>Max Score</th>
                </tr>
              </thead>
              <tbody>
                {assignment.rubric.map((criterion: any, index: number) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 12px' }}>{criterion.criterion}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{criterion.maxScore} pts</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 600 }}>
                  <td style={{ padding: '12px 8px 8px' }}>Total</td>
                  <td style={{ padding: '12px 8px 8px', textAlign: 'right' }}>
                    {assignment.rubric.reduce((sum: number, r: any) => sum + r.maxScore, 0)} pts
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Code Editor
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <input
                type="file"
                id="file-upload"
                accept=".txt,.cpp,.py,.js,.java,.zip"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isDeadlinePassed}
              />
              <Button
                variant="outlined"
                startIcon={<Upload size={18} />}
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isDeadlinePassed}
              >
                Upload File
              </Button>
            </Box>
          </Box>

          {fileUploaded && (
            <Alert severity="success" sx={{ mb: 2 }}>
              File uploaded and code loaded into editor.
            </Alert>
          )}

          <form onSubmit={handleSubmit((data) => submitMutation.mutate(data))}>
            <div style={{ height: '500px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <Editor
                height="100%"
                language={languageMap[assignment.language] || 'python'}
                theme="vs"
                value={code}
                onChange={(value) => setValue('code', value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
                onMount={() => setEditorMounted(true)}
              />
            </div>

            {errors.code && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1, display: 'block' }}>
                {errors.code.message}
              </Typography>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isDeadlinePassed || isSubmitting}
                startIcon={isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={18} />}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Code'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.severity === 'success' ? <CheckCircle size={20} style={{ marginRight: 8 }} /> : <AlertCircle size={20} style={{ marginRight: 8 }} />}
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}