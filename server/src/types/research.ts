export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  links: string[];
  ok: boolean;
  error?: string;
}

export interface RankedLink {
  url: string;
  score: number;
  reason: string;
}

export interface CompanyResearchResult {
  homepage_url: string;
  company_name: string;
  pages: FetchedPage[];
  pages_used: string[];
  notes: string[];
  hiring_info_found: boolean;
  unreachable: boolean;
}

export interface InterviewDiscussionResult {
  sources: string[];
  excerpts: Array<{ url: string; text: string }>;
  notes: string[];
}
