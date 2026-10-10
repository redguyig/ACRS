'use client';

import { ReactNode } from 'react';
import Sidebar, { NavSection } from '@/components/Sidebar';
import {
  Users,
  BookOpen,
  BarChart3,
  Settings,
  Shield,
  GraduationCap,
} from 'lucide-react';

const sections: NavSection[] = [
  {
    label: 'Management',
    items: [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Courses', href: '/admin/courses', icon: GraduationCap },
    ],
  },
  {
    label: 'Academics',
    items: [
      { name: 'Assignments', href: '/admin/assignments', icon: BookOpen },
      { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Sidebar
      sections={sections}
      homeHref="/admin/users"
      roleLabel="Administrator"
    >
      {children}
    </Sidebar>
  );
}
