export type QuestionCategory = 'mc' | 'essay' | 'other';

export type ExamFormat = 'full_mc' | 'mixed' | 'full_essay';

export type DifficultyLevel = 'Sukar' | 'Sedang' | 'Mudah';

export type DiscriminationLevel =
  | 'Sangat Baik'
  | 'Baik'
  | 'Cukup'
  | 'Jelek'
  | 'Sangat Jelek';

export type ItemDecision = 'Diterima' | 'Revisi' | 'Dibuang';

export type DistractorStatus =
  | 'Kunci Jawaban'
  | 'Berfungsi'
  | 'Tidak Berfungsi'
  | 'Menjebak'
  | 'Tidak Menjawab';

export interface QuizSummary {
  quizName: string;
  courseName: string;
  openDate: string;
  firstAttemptsCount: number;
  totalAttemptsCount: number;
  avgFirstAttempt: number | null;
  avgAllAttempts: number | null;
  avgLastAttempt: number | null;
  avgHighestAttempt: number | null;
  medianHighest: number | null;
  stdDevHighest: number | null;
  skewness: number | null;
  kurtosis: number | null;
  internalConsistency: number | null; // Cronbach's alpha / CIC in percentage (0-100)
  errorRatio: number | null;
  standardError: number | null;
}

export interface ResponseOption {
  text: string;
  partialCredit: number; // 0 to 100
  count: number;
  frequency: number; // 0 to 100
  isKey: boolean;
  isNoResponse: boolean;
  status: DistractorStatus;
}

export interface DistractorSummary {
  totalDistractors: number;
  functioningCount: number;
  nonFunctioningCount: number;
  dominantCount: number; // distractors chosen more often than the correct answer
  noResponseCount: number;
  effectivenessPct: number;
  qualityLabel: 'Baik' | 'Perlu Revisi' | 'Kurang Baik';
}

export interface ImprovementSuggestion {
  aspect: string;
  action: string;
}

export interface AnalyzedQuestion {
  slot: string;
  slotOrder: number;
  rawType: string;
  category: QuestionCategory;
  name: string;
  attempts: number;
  facilityIndex: number | null; // 0-100 (%)
  standardDeviation: number | null; // 0-100 (%)
  randomGuessScore: number | null; // 0-100 (%)
  intendedWeight: number | null; // 0-100 (%)
  effectiveWeight: number | null; // 0-100 (%)
  discriminationIndex: number | null; // -100 to 100 (%)
  discriminativeEfficiency: number | null; // -100 to 100 (%)
  difficultyLevel: DifficultyLevel;
  discriminationLevel: DiscriminationLevel;
  decision: ItemDecision;
  decisionReasons: string[];
  recommendation: string;
  improvementSuggestions: ImprovementSuggestion[];
  responses: ResponseOption[];
  distractorSummary: DistractorSummary | null;
}

export interface CategorySummary {
  count: number;
  avgFacility: number | null;
  avgDiscrimination: number | null;
  avgEfficiency: number | null;
  totalIntendedWeight: number;
  totalEffectiveWeight: number;
  acceptedCount: number;
  reviseCount: number;
  rejectCount: number;
}

export interface AnalysisReport {
  fileName: string;
  uploadedAt: string;
  examFormat: ExamFormat;
  examFormatLabel: string;
  summary: QuizSummary;
  questions: AnalyzedQuestion[];
  hasDistractorData: boolean;
  mcSummary: CategorySummary;
  essaySummary: CategorySummary;
  otherSummary: CategorySummary;
  decisionCounts: Record<ItemDecision, number>;
  difficultyCounts: Record<DifficultyLevel, number>;
  discriminationCounts: Record<DiscriminationLevel, number>;
  reliabilityLabel: string;
  reliabilityNote: string;
  priorityItems: AnalyzedQuestion[];
}

export interface ReportMetadata {
  schoolName: string;
  schoolLogo?: string; // Base64 Data URL (PNG/JPEG)
  subjectName: string;
  className: string;
  academicYear: string;
  semester: string;
  teacherName: string;
  teacherNip: string;
  principalName: string;
  principalNip: string;
  city: string;
  reportDate: string;
}

export interface ExportOptions {
  includeSummary: boolean;
  includeItemTable: boolean;
  includeComparison: boolean;
  includeDistractors: boolean;
  includeCriteria: boolean;
  includeSignature: boolean;
}
