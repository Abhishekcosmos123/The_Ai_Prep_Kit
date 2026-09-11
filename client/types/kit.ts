export type RequirementKind =
  | "technical"
  | "behavioural"
  | "domain"
  | "experience"
  | "other";

export type RequirementPriority = "must" | "nice";
export type ContentState = "generated" | "edited" | "user";

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: string;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  state?: ContentState;
  pinned?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  state?: ContentState;
  pinned?: boolean;
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface InterviewKit {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: {
    days_available: number;
    days: ScheduleDay[];
  };
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
}

export interface GenerationStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
  message?: string;
}

export interface KitSummary {
  id: string;
  company: string;
  role: string;
  generationStatus: string;
  generationPercent: number;
  createdAt: string;
  updatedAt: string;
  coverage: number | null;
  days_available: number;
  company_url: string;
}

export interface KitDetail extends KitSummary {
  input: { jd: string; company_url: string; days: number };
  kit: InterviewKit | null;
  generationProgress: GenerationStep[];
  generationError: { code?: string; message?: string } | null;
  practice: {
    confidences: Array<{ flashcard_id: string; confidence: 1 | 2 | 3; updated_at: string }>;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
}
