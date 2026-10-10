'use client';

import { ReactNode } from 'react';
import Sidebar, { NavSection } from '@/components/Sidebar';
import {
  BookOpen,
  History,
  PlusCircle,
  Bug,
  ClipboardCheck,
} from 'lucide-react';

const sections: NavSection[] = [
  {
    label: 'Assignments',
    items: [
      { name: 'Create Assignment', href: '/faculty/assignments', icon: PlusCircle },
      { name: 'Previous Assignments', href: '/faculty/review', icon: History },
    ],
  },
  {
    label: 'Review',
    items: [
      { name: 'Plagiarism Check', href: '/faculty/plagiarism', icon: Bug },
    ],
  },
];

export default function FacultyLayout({ children }: { children: ReactNode }) {
  return (
    <Sidebar
      sections={sections}
      homeHref="/faculty/assignments"
      roleLabel="Faculty"
    >
      {children}
    </Sidebar>
  );
}