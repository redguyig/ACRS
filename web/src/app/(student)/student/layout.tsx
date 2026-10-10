'use client';

import { ReactNode } from 'react';
import Sidebar, { NavSection } from '@/components/Sidebar';
import {
  BookOpen,
  History,
  MessageSquare,
} from 'lucide-react';

const sections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Assignments', href: '/student/assignments', icon: BookOpen },
    ],
  },
  {
    label: 'History',
    items: [
      { name: 'Previous Assignments', href: '/student/feedback', icon: History },
    ],
  },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <Sidebar
      sections={sections}
      homeHref="/student/assignments"
      roleLabel="Student"
    >
      {children}
    </Sidebar>
  );
}