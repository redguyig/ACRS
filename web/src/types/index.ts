export type Role = 'student' | 'faculty' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  courseId: string | null;
  course?: Course;
}

export interface Course {
  id: string;
  name: string;
  department: string;
  batchYear: number;
}

export interface RubricCriterion {
  criterion: string;
  maxScore: number;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  language: 'cpp' | 'python' | 'javascript' | 'java';
  deadline: string;
  rubric: RubricCriterion[];
  anonymous: boolean;
  courseId: string;
  createdBy: string;
  createdAt: string;
  course?: Course;
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  codeContent: string;
  language: string;
  submittedAt: string;
  status: 'pending' | 'submitted' | 'reviewed';
  assignment?: Assignment;
  student?: User;
  comments?: Comment[];
  rubricScores?: RubricScore[];
  feedback?: Feedback;
}

export interface Comment {
  id: string;
  submissionId: string;
  facultyId: string;
  lineNumber: number;
  content: string;
  createdAt: string;
  faculty?: User;
}

export interface RubricScore {
  id: string;
  submissionId: string;
  criterion: string;
  maxScore: number;
  awardedScore: number | null;
}

export interface Feedback {
  id: string;
  submissionId: string;
  generalComment: string;
  totalGrade: number;
  publishedAt: string;
}

export interface PlagiarismResult {
  id: string;
  assignmentId: string;
  studentAId: string;
  studentBId: string;
  similarityPct: number;
  status: 'flagged' | 'reviewed' | 'escalated';
  mossReportUrl: string | null;
  studentA?: User;
  studentB?: User;
}

export interface AuthResponse {
  user: User;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}