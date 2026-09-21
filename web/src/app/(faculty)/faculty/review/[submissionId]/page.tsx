'use client';

import { useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Box, Button, TextField, Chip, Divider,
  Slider, IconButton, Paper, Alert, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip
} from '@mui/material';
import {
  ArrowLeft, Send, Save, MessageSquare, Trash2, Edit3, CheckCircle, X
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import Link from 'next/link';
import { submissionApi, commentApi } from '@/lib/api';

const languageMap: Record<string, string> = {
  cpp: 'cpp', python: 'python', javascript: 'javascript', java: 'java',
};

interface CommentData {
  id: string;
  lineNumber: number;
  content: string;
  faculty?: { id: string; name: string };
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const submissionId = params.submissionId as string;
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  const [generalComment, setGeneralComment] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const { data: submission, isLoading } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => submissionApi.get(submissionId).then(res => res.data),
  });

  // Initialize rubric scores from submission data
  const initScores = useCallback(() => {
    if (submission?.rubricScores) {
      const scores: Record<string, number> = {};
      submission.rubricScores.forEach((rs: any) => {
        scores[rs.criterion] = rs.awardedScore ?? 0;
      });
      setRubricScores(scores);
    }
  }, [submission]);

  // Run once when data loads
  useState(() => { initScores(); });

  const addCommentMutation = useMutation({
    mutationFn: (data: { submissionId: string; lineNumber: number; content: string }) =>
      commentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
      setCommentText('');
      setSelectedLine(null);
      setSnackbar({ open: true, message: 'Comment added', severity: 'success' });
    },
    onError: () => setSnackbar({ open: true, message: 'Failed to add comment', severity: 'error' }),
  });

  const editCommentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentApi.update(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
      setEditingComment(null);
      setSnackbar({ open: true, message: 'Comment updated', severity: 'success' });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => commentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
      setSnackbar({ open: true, message: 'Comment deleted', severity: 'success' });
    },
  });

  const saveRubricMutation = useMutation({
    mutationFn: () => {
      const rubric = submission?.assignment?.rubric || [];
      const scores = rubric.map((r: any) => ({
        criterion: r.criterion,
        maxScore: r.maxScore,
        awardedScore: rubricScores[r.criterion] ?? 0,
      }));
      return submissionApi.updateRubric(submissionId, scores);
    },
    onSuccess: () => setSnackbar({ open: true, message: 'Rubric scores saved', severity: 'success' }),
    onError: () => setSnackbar({ open: true, message: 'Failed to save rubric', severity: 'error' }),
  });

  const publishMutation = useMutation({
    mutationFn: () => {
      const rubric = submission?.assignment?.rubric || [];
      const scores = rubric.map((r: any) => ({
        criterion: r.criterion,
        maxScore: r.maxScore,
        awardedScore: rubricScores[r.criterion] ?? 0,
      }));
      return submissionApi.publish(submissionId, {
        rubricScores: scores,
        generalComment,
      });
    },
    onSuccess: () => {
      setPublishDialogOpen(false);
      setSnackbar({ open: true, message: 'Feedback published successfully!', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to publish';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    },
  });

  const handleAddComment = () => {
    if (!selectedLine || !commentText.trim()) return;
    addCommentMutation.mutate({
      submissionId,
      lineNumber: selectedLine,
      content: commentText.trim(),
    });
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Click on gutter line number to add comment
    editor.onMouseDown((e: any) => {
      if (e.target?.type === 2 || e.target?.type === 3) { // glyph margin or line numbers
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          setSelectedLine(lineNumber);
          setCommentText('');
        }
      }
    });

    updateDecorations(editor, monaco);
  };

  const updateDecorations = (editor: any, monaco: any) => {
    if (!submission?.comments || !editor || !monaco) return;

    const decorations = submission.comments.map((c: CommentData) => ({
      range: new monaco.Range(c.lineNumber, 1, c.lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'commented-line',
        glyphMarginClassName: 'comment-glyph',
        glyphMarginHoverMessage: { value: c.content },
      },
    }));
    editor.deltaDecorations([], decorations);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </Box>
    );
  }

  if (!submission) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="error.main">Submission not found</Typography>
        <Button variant="contained" component={Link} href="/faculty/assignments" sx={{ mt: 2 }}>
          Back to Assignments
        </Button>
      </Box>
    );
  }

  const { codeContent, language, assignment, student, comments = [], feedback } = submission;
  const rubric = assignment?.rubric || [];
  const totalMax = rubric.reduce((sum: number, r: any) => sum + r.maxScore, 0);
  const totalAwarded = Object.values(rubricScores).reduce((sum, v) => sum + v, 0);
  const isAlreadyPublished = submission.status === 'reviewed';

  // Group comments by line
  const commentsByLine: Record<number, CommentData[]> = {};
  comments.forEach((c: CommentData) => {
    if (!commentsByLine[c.lineNumber]) commentsByLine[c.lineNumber] = [];
    commentsByLine[c.lineNumber].push(c);
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowLeft size={18} />} component={Link}
          href={`/faculty/assignments/${assignment?.id}`}>
          Back
        </Button>
        <Box>
          <Typography variant="h5">{assignment?.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            Student: {student?.name} ({student?.email})
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {isAlreadyPublished ? (
          <Chip icon={<CheckCircle size={16} />} label="Feedback Published" color="success" />
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Save size={16} />} onClick={() => saveRubricMutation.mutate()}
              disabled={saveRubricMutation.isPending}>
              Save Draft
            </Button>
            <Button variant="contained" color="success" startIcon={<Send size={16} />}
              onClick={() => setPublishDialogOpen(true)}>
              Publish Feedback
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* Left: Code Editor */}
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <Card>
            <CardContent sx={{ p: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {language?.toUpperCase()} · Click a line number to add a comment
                </Typography>
                <Chip label={`${comments.length} comments`} size="small" variant="outlined" />
              </Box>
              <div style={{ height: '600px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                <Editor
                  height="100%"
                  language={languageMap[language] || 'python'}
                  theme="vs"
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
                  onMount={handleEditorMount}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Comment Panel */}
          {selectedLine && !isAlreadyPublished && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2, borderColor: 'primary.main', borderWidth: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="primary.main">
                  <MessageSquare size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Add comment on Line {selectedLine}
                </Typography>
                <IconButton size="small" onClick={() => setSelectedLine(null)}>
                  <X size={16} />
                </IconButton>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Type your comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                size="small"
              />
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Send size={14} />}
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                >
                  Add Comment
                </Button>
              </Box>
            </Paper>
          )}

          {/* Comments List */}
          {comments.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Inline Comments ({comments.length})
                </Typography>
                {Object.entries(commentsByLine)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([lineNum, lineComments]) => (
                    <Paper key={lineNum} variant="outlined" sx={{ mb: 2, p: 2 }}>
                      <Typography variant="subtitle2" color="primary.main" gutterBottom>
                        Line {lineNum}
                      </Typography>
                      {lineComments.map((comment) => (
                        <Box key={comment.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                          {editingComment?.id === comment.id ? (
                            <Box sx={{ flex: 1 }}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                size="small"
                                value={editingComment.content}
                                onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                              />
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                <Button size="small" variant="contained"
                                  onClick={() => editCommentMutation.mutate({ id: comment.id, content: editingComment.content })}>
                                  Save
                                </Button>
                                <Button size="small" onClick={() => setEditingComment(null)}>Cancel</Button>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ flex: 1 }}>{comment.content}</Typography>
                              {!isAlreadyPublished && (
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Tooltip title="Edit">
                                    <IconButton size="small"
                                      onClick={() => setEditingComment({ id: comment.id, content: comment.content })}>
                                      <Edit3 size={14} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" color="error"
                                      onClick={() => deleteCommentMutation.mutate(comment.id)}>
                                      <Trash2 size={14} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              )}
                            </>
                          )}
                        </Box>
                      ))}
                    </Paper>
                  ))}
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Right: Rubric Panel */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Rubric Scoring
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Total: {totalAwarded}/{totalMax} ({totalMax > 0 ? Math.round((totalAwarded / totalMax) * 100) : 0}%)
              </Typography>

              {rubric.map((r: any) => {
                const score = rubricScores[r.criterion] ?? 0;
                return (
                  <Box key={r.criterion} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>{r.criterion}</Typography>
                      <Chip label={`${score}/${r.maxScore}`} size="small"
                        color={score === r.maxScore ? 'success' : score > 0 ? 'warning' : 'default'}
                        variant="outlined" />
                    </Box>
                    <Slider
                      value={score}
                      min={0}
                      max={r.maxScore}
                      step={1}
                      onChange={(_e, value) => setRubricScores(prev => ({ ...prev, [r.criterion]: value as number }))}
                      disabled={isAlreadyPublished}
                      valueLabelDisplay="auto"
                      size="small"
                    />
                  </Box>
                );
              })}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>General Feedback</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Overall comments about the submission..."
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                disabled={isAlreadyPublished}
                size="small"
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Publish Feedback?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Once published, the student will be able to see all comments, rubric scores, and the general feedback. This action cannot be undone.
          </Alert>
          <Typography variant="body2">
            <strong>Grade:</strong> {totalAwarded}/{totalMax} ({totalMax > 0 ? Math.round((totalAwarded / totalMax) * 100) : 0}%)
          </Typography>
          <Typography variant="body2">
            <strong>Comments:</strong> {comments.length} inline comments
          </Typography>
          {generalComment && (
            <Typography variant="body2">
              <strong>General Feedback:</strong> {generalComment.substring(0, 100)}...
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}>
            {publishMutation.isPending ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogActions>
      </Dialog>

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
