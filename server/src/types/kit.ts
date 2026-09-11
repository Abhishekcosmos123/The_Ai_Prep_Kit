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

export type GenerationStepStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface GenerationStep {
  id: string;
  label: string;
  status: GenerationStepStatus;
  message?: string;
}

export type GenerationStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "incomplete";

export interface PracticeConfidence {
  flashcard_id: string;
  confidence: 1 | 2 | 3;
  updated_at: string;
}

export interface GenerateKitInput {
  jd: string;
  company_url: string;
  days: number;
  case_id?: string;
}

export interface AppErrorBody {
  code: string;
  message: string;
}

/** Accept American "behavioral" from LLMs; persist brief spelling "behavioural". */
export function normalizeRequirementKind(value: unknown): RequirementKind {
  const raw = String(value ?? "")
    .toLowerCase()
    .trim();
  if (raw === "technical") return "technical";
  if (raw === "behavioural" || raw === "behavioral") return "behavioural";
  if (raw === "domain") return "domain";
  if (raw === "experience") return "experience";
  if (raw === "other") return "other";
  if (raw.includes("behav") || raw.includes("soft")) return "behavioural";
  if (raw.includes("tech") || raw.includes("skill") || raw.includes("stack")) return "technical";
  if (raw.includes("domain") || raw.includes("industry")) return "domain";
  if (raw.includes("exp") || raw.includes("year")) return "experience";
  return "other";
}
