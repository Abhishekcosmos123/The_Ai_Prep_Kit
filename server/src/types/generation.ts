import type { InterviewKit, Requirement, Question, Flashcard } from "./kit.js";
import type { CompanyResearchResult, InterviewDiscussionResult } from "./research.js";

export interface PipelineProgress {
  step: string;
  label: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
  message?: string;
  percent: number;
}

export type ProgressCallback = (progress: PipelineProgress) => void | Promise<void>;

export interface PipelineContext {
  jd: string;
  company_url: string;
  days: number;
  requirements: Requirement[];
  research: CompanyResearchResult;
  discussions: InterviewDiscussionResult;
  kit: Partial<InterviewKit>;
  questions: Question[];
  flashcards: Flashcard[];
  coveragePasses: number;
}

export interface PipelineResult {
  status: "ok" | "failed" | "incomplete";
  kit: InterviewKit | null;
  error: { code: string; message: string } | null;
}
