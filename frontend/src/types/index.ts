export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface User {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  source_type: "github_url" | "zip_upload";
  source_ref: string;
  resume_text: string;
  jd_text: string;
  analysis_status: "pending" | "analyzing" | "completed" | "failed";
  analysis_result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  source_type: string;
  analysis_status: string;
  created_at: string;
}

export interface AnalysisStatus {
  status: string;
  message: string;
  progress: number;
}

export interface Interview {
  id: string;
  project_id: string;
  user_id: string;
  status: "in_progress" | "completed" | "abandoned";
  current_phase: number;
  config: Record<string, unknown> | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface InterviewListItem {
  id: string;
  project_id: string;
  status: string;
  current_phase: number;
  created_at: string;
  project_name: string | null;
}

export interface Message {
  id: string;
  session_id: string;
  role: "interviewer" | "candidate";
  content: string;
  phase: number;
  metadata_: Record<string, unknown> | null;
  created_at: string;
}

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ReviewDimension {
  key: string;
  label: string;
  score: number;
  comment: string;
}

export interface ReviewReport {
  dimensions: ReviewDimension[];
  overall_score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}
