import * as XLSX from 'xlsx';
import { AnalysisReport, QuizSummary } from '../types/analysis';
import { parseCsvToRows, parseMoodleNumber } from './moodleParser';

export interface HistogramBin {
  range: string;
  min: number;
  max: number;
  midpoint: number;
  count: number;
  percentage: number;
}

export interface ClassAverageItem {
  id: string;
  className: string;
  fullName: string;
  average: number;
  median: number | null;
  stdDev: number | null;
  studentCount: number;
  isActive?: boolean;
  reportIndex?: number;
}

export interface StudentGradesImport {
  fileName: string;
  scores: number[]; // Normalized 0-100
  classAverages: ClassAverageItem[];
}

const BIN_EDGES: Array<{ range: string; min: number; max: number; midpoint: number }> = [
  { range: '0–10', min: 0, max: 10, midpoint: 5 },
  { range: '11–20', min: 10, max: 20, midpoint: 15 },
  { range: '21–30', min: 20, max: 30, midpoint: 25 },
  { range: '31–40', min: 30, max: 40, midpoint: 35 },
  { range: '41–50', min: 40, max: 50, midpoint: 45 },
  { range: '51–60', min: 50, max: 60, midpoint: 55 },
  { range: '61–70', min: 60, max: 70, midpoint: 65 },
  { range: '71–80', min: 70, max: 80, midpoint: 75 },
  { range: '81–90', min: 80, max: 90, midpoint: 85 },
  { range: '91–100', min: 90, max: 100, midpoint: 95 },
];

/**
 * Standard normal PDF
 */
function normalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun)
 */
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

/**
 * Estimate a 10-bin student score histogram (0-100) calibrated directly from
 * Moodle's aggregate moments (Mean, SD, Skewness, N) using a Skew-Normal density
 * and largest-remainder rounding so bin counts sum exactly to N.
 */
export function estimateHistogramFromSummary(summary: QuizSummary): HistogramBin[] {
  const n = Math.max(1, summary.totalAttemptsCount || summary.firstAttemptsCount || 1);
  const mean = summary.avgHighestAttempt ?? summary.avgFirstAttempt ?? 50;
  const sd = Math.max(3, summary.stdDevHighest ?? 15);
  const rawSkew = summary.skewness ?? 0;

  // Map sample skewness (clamped to [-0.95, 0.95]) to skew-normal shape alpha
  const g1 = Math.max(-0.92, Math.min(0.92, rawSkew));
  const absG1 = Math.abs(g1);
  const absG1TwoThirds = Math.pow(absG1, 2 / 3);
  const deltaSq =
    (Math.PI / 2) *
    (absG1TwoThirds / (absG1TwoThirds + Math.pow((4 - Math.PI) / 2, 2 / 3)));
  const delta = Math.sign(g1) * Math.sqrt(Math.min(0.98, Math.max(0, deltaSq)));
  const alpha = delta / Math.sqrt(Math.max(1e-6, 1 - delta * delta));

  // Derive location (xi) and scale (omega) matching target mean & sd
  const omega = sd / Math.sqrt(Math.max(0.1, 1 - (2 * delta * delta) / Math.PI));
  const xi = mean - omega * delta * Math.sqrt(2 / Math.PI);

  // Numerically integrate skew-normal PDF on each 10-point bin
  const rawWeights = BIN_EDGES.map((bin) => {
    const steps = 10;
    const stepSize = (bin.max - bin.min) / steps;
    let area = 0;
    for (let s = 0; s < steps; s++) {
      const x = bin.min + (s + 0.5) * stepSize;
      const z = (x - xi) / omega;
      const density = (2 / omega) * normalPdf(z) * normalCdf(alpha * z);
      area += density * stepSize;
    }
    return Math.max(0, area);
  });

  const weightSum = rawWeights.reduce((acc, w) => acc + w, 0) || 1;
  const exactCounts = rawWeights.map((w) => (w / weightSum) * n);
  const floorCounts = exactCounts.map((c) => Math.floor(c));
  let remainder = n - floorCounts.reduce((acc, c) => acc + c, 0);

  // Largest-remainder distribution so integer counts sum strictly to N
  const rankedIndices = exactCounts
    .map((c, idx) => ({ idx, frac: c - floorCounts[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < remainder && i < rankedIndices.length; i++) {
    floorCounts[rankedIndices[i].idx] += 1;
  }

  return BIN_EDGES.map((bin, idx) => {
    const count = floorCounts[idx];
    return {
      ...bin,
      count,
      percentage: Number(((count / n) * 100).toFixed(1)),
    };
  });
}

/**
 * Build an exact 10-bin histogram from real individual student scores (0-100)
 */
export function buildHistogramFromScores(scores: number[]): HistogramBin[] {
  const n = scores.length || 1;
  const counts = new Array<number>(BIN_EDGES.length).fill(0);

  for (const rawScore of scores) {
    const clamped = Math.max(0, Math.min(100, rawScore));
    const idx = clamped === 100 ? 9 : Math.min(9, Math.floor(clamped / 10));
    counts[idx] += 1;
  }

  return BIN_EDGES.map((bin, idx) => ({
    ...bin,
    count: counts[idx],
    percentage: Number(((counts[idx] / n) * 100).toFixed(1)),
  }));
}

/**
 * Compute passing (tuntas >= kkm) count from histogram bins
 */
export function computeKkmSummary(
  bins: HistogramBin[],
  kkm: number,
  exactScores?: number[] | null
): { total: number; passed: number; failed: number; passRate: number } {
  if (exactScores && exactScores.length > 0) {
    const total = exactScores.length;
    const passed = exactScores.filter((s) => s >= kkm).length;
    const failed = total - passed;
    return {
      total,
      passed,
      failed,
      passRate: Number(((passed / total) * 100).toFixed(1)),
    };
  }

  const total = bins.reduce((sum, b) => sum + b.count, 0) || 1;
  let passed = 0;
  for (const b of bins) {
    if (b.min >= kkm) {
      passed += b.count;
    } else if (b.max > kkm && b.min < kkm) {
      // Proportional split if KKM sits inside a bin (e.g., KKM=75 inside 71-80)
      const fraction = (b.max - kkm) / (b.max - b.min);
      passed += Math.round(b.count * fraction);
    }
  }
  passed = Math.min(total, Math.max(0, passed));
  const failed = total - passed;

  return {
    total,
    passed,
    failed,
    passRate: Number(((passed / total) * 100).toFixed(1)),
  };
}

/**
 * Extract a concise readable class label from Moodle courseName / quizName
 */
export function extractClassLabel(report: AnalysisReport, index: number): string {
  const course = report.summary.courseName.trim();
  const kelasMatch = course.match(/kelas\s+[a-z0-9\-/]+/i);
  if (kelasMatch) {
    return kelasMatch[0].replace(/\s+/g, ' ').trim();
  }
  if (course && course !== 'Kursus Moodle') {
    return course.length > 22 ? `${course.slice(0, 20)}…` : course;
  }
  return `Kelas ${index + 1}`;
}

/**
 * Build per-class comparison items from all uploaded Moodle class reports
 */
export function buildClassAveragesFromReports(
  reports: AnalysisReport[],
  activeIndex: number
): ClassAverageItem[] {
  // Check if labels collide; disambiguate with quiz name or suffix
  const baseLabels = reports.map((r, i) => extractClassLabel(r, i));
  const labelCounts = new Map<string, number>();
  baseLabels.forEach((l) => labelCounts.set(l, (labelCounts.get(l) || 0) + 1));

  const seenCount = new Map<string, number>();

  return reports.map((r, idx) => {
    const base = baseLabels[idx];
    let displayLabel = base;
    if ((labelCounts.get(base) || 0) > 1) {
      const next = (seenCount.get(base) || 0) + 1;
      seenCount.set(base, next);
      displayLabel = `${base} (${next})`;
    }

    return {
      id: `${r.fileName}-${idx}`,
      className: displayLabel,
      fullName: `${r.summary.courseName} — ${r.summary.quizName}`,
      average: Number((r.summary.avgHighestAttempt ?? r.summary.avgFirstAttempt ?? 0).toFixed(1)),
      median: r.summary.medianHighest !== null ? Number(r.summary.medianHighest.toFixed(1)) : null,
      stdDev: r.summary.stdDevHighest !== null ? Number(r.summary.stdDevHighest.toFixed(1)) : null,
      studentCount: r.summary.totalAttemptsCount || r.summary.firstAttemptsCount,
      isActive: idx === activeIndex,
      reportIndex: idx,
    };
  });
}

function calcMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function calcStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Parse an optional Moodle Grades (Nilai) CSV/XLSX export containing individual student scores
 * and optional Kelas / Grup / Group columns.
 */
export async function parseStudentGradesFile(file: File): Promise<StudentGradesImport> {
  let rows: string[][] = [];
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.ods')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: false });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error('Berkas Excel nilai tidak memiliki lembar kerja.');
    const sheet = workbook.Sheets[firstSheet];
    const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    rows = rawRows
      .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : []))
      .filter((r) => r.some((c) => c.trim() !== ''));
  } else {
    const text = await file.text();
    rows = parseCsvToRows(text);
  }

  if (rows.length < 2) {
    throw new Error('Berkas nilai siswa kosong atau tidak memiliki baris data.');
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());

  // Locate grade column (Moodle ID: "Nilai/100,00" or "Nilai", EN: "Grade/100.00" or "Grade", or "Skor")
  const gradeColIdx = headers.findIndex(
    (h) => h.startsWith('nilai') || h.startsWith('grade') || h.startsWith('skor') || h === 'score'
  );
  if (gradeColIdx === -1) {
    throw new Error(
      'Kolom Nilai/Grade tidak ditemukan. Pastikan berkas berasal dari ekspor Nilai (Grades) Moodle.'
    );
  }

  // Detect max score denominator from header like "Nilai/100,00" or "Grade/10.00"
  const gradeHeader = headers[gradeColIdx];
  const denomMatch = gradeHeader.match(/\/\s*([0-9]+[.,]?[0-9]*)/);
  const maxScale = denomMatch ? parseMoodleNumber(denomMatch[1]) || 100 : 100;

  // Locate optional class/group column
  const classColIdx = headers.findIndex(
    (h) =>
      h.includes('kelas') ||
      h.includes('grup') ||
      h.includes('group') ||
      h.includes('rombel') ||
      h.includes('departemen') ||
      h.includes('department') ||
      h.includes('class')
  );

  const scores: number[] = [];
  const groupedScores = new Map<string, number[]>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const firstCell = (row[0] || '').trim().toLowerCase();
    // Skip Moodle's bottom "Overall average" / "Rata-rata keseluruhan" summary row
    if (
      firstCell.includes('rata-rata') ||
      firstCell.includes('overall average') ||
      firstCell.includes('average')
    ) {
      continue;
    }

    const rawVal = parseMoodleNumber(row[gradeColIdx]);
    if (rawVal === null) continue;

    const normalizedScore = maxScale > 0 && maxScale !== 100 ? (rawVal / maxScale) * 100 : rawVal;
    const clamped = Number(Math.max(0, Math.min(100, normalizedScore)).toFixed(2));
    scores.push(clamped);

    if (classColIdx !== -1) {
      const cls = (row[classColIdx] || '').trim() || 'Tanpa Kelas';
      const bucket = groupedScores.get(cls) || [];
      bucket.push(clamped);
      groupedScores.set(cls, bucket);
    }
  }

  if (scores.length === 0) {
    throw new Error('Tidak ditemukan nilai angka yang valid pada kolom Nilai/Grade.');
  }

  const classAverages: ClassAverageItem[] = Array.from(groupedScores.entries()).map(
    ([clsName, vals], idx) => {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      return {
        id: `grade-cls-${idx}`,
        className: clsName,
        fullName: clsName,
        average: Number(avg.toFixed(1)),
        median: Number(calcMedian(vals).toFixed(1)),
        stdDev: Number(calcStdDev(vals, avg).toFixed(1)),
        studentCount: vals.length,
      };
    }
  );

  return {
    fileName: file.name,
    scores,
    classAverages,
  };
}
