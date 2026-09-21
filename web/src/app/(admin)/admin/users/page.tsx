'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Box, Button, Chip, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Snackbar, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Tabs, Tab, Avatar,
} from '@mui/material';
import {
  UserPlus, Edit3, Trash2, Users, BookOpen, Plus,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

function RoleChip({ role }: { role: string }) {
  const config: Record<string, { color: any; label: string }> = {
    admin: { color: 'error', label: 'Admin' },
    faculty: { color: 'primary', label: 'Faculty' },
    student: { color: 'success', label: 'Student' },
  };
  const c = config[role] || { color: 'default', label: role };
  return <Chip label={c.label} color={c.color} size="small" variant="outlined" />;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('student');
  const [formCourseId, setFormCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDept, setCourseDept] = useState('');
  const [courseYear, setCourseYear] = useState(2024);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then(res => res.data),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => adminApi.listCourses().then(res => res.data),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserDialogOpen(false);
      resetUserForm();
      setSnackbar({ open: true, message: 'User created', severity: 'success' });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Failed to create user', severity: 'error' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      setUserDialogOpen(false);
      resetUserForm();
      setSnackbar({ open: true, message: 'User updated', severity: 'success' });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Failed to update user', severity: 'error' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteConfirm(null);
      setSnackbar({ open: true, message: 'User deleted', severity: 'success' });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Failed to delete user', severity: 'error' });
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: (data: any) => adminApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setCourseDialogOpen(false);
      setCourseName('');
      setCourseDept('');
      setCourseYear(2024);
      setSnackbar({ open: true, message: 'Course created', severity: 'success' });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Failed to create course', severity: 'error' });
    },
  });

  const resetUserForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('student');
    setFormCourseId('');
    setEditingUser(null);
  };

  const openCreateUser = () => {
    resetUserForm();
    setUserDialogOpen(true);
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormCourseId(user.courseId || '');
    setUserDialogOpen(true);
  };

  const handleUserSubmit = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: { name: formName, email: formEmail, role: formRole, courseId: formCourseId || undefined },
      });
    } else {
      createUserMutation.mutate({
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
        courseId: formCourseId || undefined,
      });
    }
  };

  const users = usersData?.data || [];
  const courses = coursesData?.data || [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Administration</Typography>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<Users size={18} />} iconPosition="start" label={`Users (${users.length})`} />
        <Tab icon={<BookOpen size={18} />} iconPosition="start" label={`Courses (${courses.length})`} />
      </Tabs>

      {/* Users Tab */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Users</Typography>
              <Button variant="contained" startIcon={<UserPlus size={18} />} onClick={openCreateUser}>
                Add User
              </Button>
            </Box>
            {usersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Course</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user: any, index: number) => (
                      <TableRow key={user.id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: user.role === 'admin' ? 'error.main' : user.role === 'faculty' ? 'primary.main' : 'success.main' }}>
                              {user.name?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{user.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell><RoleChip role={user.role} /></TableCell>
                        <TableCell>
                          <Typography variant="body2">{user.course?.name || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{new Date(user.createdAt).toLocaleDateString()}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEditUser(user)}>
                              <Edit3 size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirm(user.id)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Courses Tab */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Courses</Typography>
              <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setCourseDialogOpen(true)}>
                Add Course
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Batch Year</TableCell>
                    <TableCell align="center">Users</TableCell>
                    <TableCell align="center">Assignments</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courses.map((course: any, index: number) => (
                    <TableRow key={course.id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell><Typography variant="body2" fontWeight={600}>{course.name}</Typography></TableCell>
                      <TableCell>{course.department}</TableCell>
                      <TableCell>{course.batchYear}</TableCell>
                      <TableCell align="center">
                        <Chip label={course._count?.users ?? 0} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={course._count?.assignments ?? 0} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => { setUserDialogOpen(false); resetUserForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" fullWidth value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <TextField label="Email" fullWidth type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
            {!editingUser && (
              <TextField label="Password" fullWidth type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} required helperText="Minimum 6 characters" />
            )}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={formRole} label="Role" onChange={(e) => setFormRole(e.target.value)}>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="faculty">Faculty</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Course (Optional)</InputLabel>
              <Select value={formCourseId} label="Course (Optional)" onChange={(e) => setFormCourseId(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {courses.map((course: any) => (
                  <MenuItem key={course.id} value={course.id}>{course.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setUserDialogOpen(false); resetUserForm(); }}>Cancel</Button>
          <Button variant="contained" onClick={handleUserSubmit}
            disabled={!formName || !formEmail || (!editingUser && !formPassword) || createUserMutation.isPending || updateUserMutation.isPending}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Course Dialog */}
      <Dialog open={courseDialogOpen} onClose={() => setCourseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Course</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Course Name" fullWidth value={courseName} onChange={(e) => setCourseName(e.target.value)} required placeholder="e.g. CSE 401 - Software Engineering" />
            <TextField label="Department" fullWidth value={courseDept} onChange={(e) => setCourseDept(e.target.value)} required placeholder="e.g. Computer Science" />
            <TextField label="Batch Year" fullWidth type="number" value={courseYear} onChange={(e) => setCourseYear(parseInt(e.target.value))} required />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => createCourseMutation.mutate({ name: courseName, department: courseDept, batchYear: courseYear })}
            disabled={!courseName || !courseDept || createCourseMutation.isPending}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete User?</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            This action cannot be undone. The user and all their associated data will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => deleteConfirm && deleteUserMutation.mutate(deleteConfirm)}
            disabled={deleteUserMutation.isPending}>
            Delete
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
