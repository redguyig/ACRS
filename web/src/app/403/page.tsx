'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '@/lib/auth';

export default function Forbidden() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case 'student':
          router.push('/student/assignments');
          break;
        case 'faculty':
          router.push('/faculty/assignments');
          break;
        case 'admin':
          router.push('/admin/users');
          break;
      }
    }
  }, [user, router]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
        <Typography variant="h1" sx={{ color: 'error.main', mb: 2 }}>
          403
        </Typography>
        <Typography variant="h5" gutterBottom>
          Access Denied
        </Typography>
        <Typography color="text.secondary" paragraph>
          You don't have permission to access this page.
        </Typography>
        <Button variant="contained" onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    </Box>
  );
}