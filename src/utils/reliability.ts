import { AnalysisReport, AnalyzedQuestion } from '../types/analysis';

export type ReliabilityScope = 'all' | 'without_rejected' | 'accepted_only';

export interface ReliabilityCalculation {
  scope: ReliabilityScope;
  scopeLabel: string;
  itemCount: number; // k
  excludedCount: number;
  sumItemVariance: number; // Σ σ_i² (in percentage-points squared)
  totalVariance: number; // σ_T² (in percentage-points squared)
  varianceRatio: number; // Σ σ_i² / σ_T²
  cronbachAlpha: number | null; // 0 to 1 (can be negative if severely inconsistent)
  cronbachAlphaPct: number | null; // 0 to 100%
  moodleCicPct: number | null;
  kr20Alpha: number | null; // Kuder-Richardson 20 for dichotomous/PG items
  sem: number | null; // Standard Error of Measurement (in %)
  errorRatioPct: number | null; // sqrt(1 - alpha) * 100
  deltaFromBaseline: number | null; // change in alpha when simulating item removal
  interpretation: {
    label: string;
    tone: 'emerald' | 'blue' | 'amber' | 'red';
    description: string;
  };
}

function classifyAlpha(alpha: number | null): ReliabilityCalculation['interpretation'] {
  if (alpha === null) {
    return {
      label: 'Tidak Dapat Dihitung',
      tone: 'amber',
      description:
        'Minimal dibutuhkan 2 butir soal dengan varians skor total yang valid untuk menghitung Cronbach’s Alpha.',
    };
  }
  if (alpha >= 0.8) {
    return {
      label: 'Sangat Tinggi',
      tone: 'emerald',
      description:
        'Konsistensi internal sangat kuat (α ≥ 0,80). Instrumen tes sangat andal untuk penilaian sumatif maupun pemeringkatan siswa.',
    };
  }
  if (alpha >= 0.7) {
    return {
      label: 'Tinggi (Baik)',
      tone: 'emerald',
      description:
        'Konsistensi internal baik (0,70 ≤ α < 0,80). Instrumen sudah layak dan stabil untuk evaluasi capaian pembelajaran kelas.',
    };
  }
  if (alpha >= 0.6) {
    return {
      label: 'Cukup / Memadai',
      tone: 'blue',
      description:
        'Konsistensi internal memadai (0,60 ≤ α < 0,70). Memperbaiki butir berdaya beda rendah dapat meningkatkan keandalan tes.',
    };
  }
  if (alpha >= 0.4) {
    return {
      label: 'Rendah',
      tone: 'amber',
      description:
        'Konsistensi internal masih rendah (0,40 ≤ α < 0,60). Disarankan merevisi butir yang ambigu atau menambah butir yang homogen dengan indikator.',
    };
  }
  return {
    label: 'Sangat Rendah',
    tone: 'red',
    description:
      'Konsistensi internal sangat rendah (α < 0,40). Periksa kembali kunci jawaban, keselarasan indikator, dan kualitas butir soal secara menyeluruh.',
  };
}

/**
 * Resolve normalized item weights (summing to 1.0 across all items in the exam)
 */
function getNormalizedWeights(questions: AnalyzedQuestion[]): Map<string, number> {
  const rawWeights = questions.map((q) => {
    if (q.intendedWeight !== null && q.intendedWeight > 0) return q.intendedWeight;
    return 1;
  });
  const totalWeight = rawWeights.reduce((s, w) => s + w, 0) || 1;
  const map = new Map<string, number>();
  questions.forEach((q, idx) => {
    map.set(q.slot, rawWeights[idx] / totalWeight);
  });
  return map;
}

/**
 * Compute classical Cronbach's Alpha directly from Moodle item & test statistics:
 *   α = (k / (k - 1)) * (1 - Σ σ_i² / σ_T²)
 *
 * When simulating item removal (scope !== 'all'), total variance σ_T_sub² is
 * adjusted using classical item-rest covariance derived from Moodle's
 * Discrimination Index (r_i,rest = D_i / 100):
 *   Cov(X_i, T) = σ_i² + σ_i * r_i,rest * σ_T_rest
 */
export function calculateReliability(
  report: AnalysisReport,
  scope: ReliabilityScope = 'all',
  baselineAlpha?: number | null
): ReliabilityCalculation {
  const allQuestions = report.questions;
  const scopeLabel =
    scope === 'all'
      ? 'Seluruh Butir Soal'
      : scope === 'without_rejected'
      ? 'Simulasi Tanpa Butir Dibuang'
      : 'Simulasi Hanya Butir Diterima';

  const includedQuestions = allQuestions.filter((q) => {
    if (scope === 'without_rejected') return q.decision !== 'Dibuang';
    if (scope === 'accepted_only') return q.decision === 'Diterima';
    return true;
  });

  const excludedQuestions = allQuestions.filter(
    (q) => !includedQuestions.some((inc) => inc.slot === q.slot)
  );

  const k = includedQuestions.length;
  const totalSd = report.summary.stdDevHighest;
  const moodleCicPct = report.summary.internalConsistency;

  if (k < 2 || totalSd === null || totalSd <= 0) {
    return {
      scope,
      scopeLabel,
      itemCount: k,
      excludedCount: excludedQuestions.length,
      sumItemVariance: 0,
      totalVariance: totalSd ? Number((totalSd * totalSd).toFixed(2)) : 0,
      varianceRatio: 0,
      cronbachAlpha: null,
      cronbachAlphaPct: null,
      moodleCicPct,
      kr20Alpha: null,
      sem: report.summary.standardError,
      errorRatioPct: report.summary.errorRatio,
      deltaFromBaseline: null,
      interpretation: classifyAlpha(null),
    };
  }

  const weights = getNormalizedWeights(allQuestions);
  const fullTotalVariance = totalSd * totalSd; // in (% points)^2

  // Compute weighted item SD and variance on the 0-100% total score scale
  const getItemWeightedSd = (q: AnalyzedQuestion): number => {
    const w = weights.get(q.slot) ?? 1 / allQuestions.length;
    const itemSd = q.standardDeviation ?? 0;
    return w * itemSd;
  };

  let sumItemVariance = includedQuestions.reduce((acc, q) => {
    const wSd = getItemWeightedSd(q);
    return acc + wSd * wSd;
  }, 0);

  // Adjust total variance when simulating item deletion using item-rest correlation (D_i / 100)
  let adjustedTotalVariance = fullTotalVariance;
  if (excludedQuestions.length > 0) {
    let removedVarianceContribution = 0;
    for (const q of excludedQuestions) {
      const sigmaI = getItemWeightedSd(q);
      const rRest = (q.discriminationIndex ?? 0) / 100;
      // Var(T - X_i) = Var(T) - σ_i² - 2 * σ_i * r_rest * σ_rest
      // Approximating σ_rest ≈ sqrt(max(1, fullTotalVariance - sigmaI²))
      const sigmaRest = Math.sqrt(Math.max(1, fullTotalVariance - sigmaI * sigmaI));
      removedVarianceContribution += sigmaI * sigmaI + 2 * sigmaI * rRest * sigmaRest;
    }

    // Re-scale to remaining weights if total weight changes
    const remainingWeightSum =
      includedQuestions.reduce((s, q) => s + (weights.get(q.slot) ?? 0), 0) || 1;
    const scaleSq = 1 / (remainingWeightSum * remainingWeightSum);

    adjustedTotalVariance = Math.max(
      sumItemVariance * 1.02,
      (fullTotalVariance - removedVarianceContribution) * scaleSq
    );
    sumItemVariance = sumItemVariance * scaleSq;
  }

  const varianceRatio = adjustedTotalVariance > 0 ? sumItemVariance / adjustedTotalVariance : 1;
  const rawAlpha = (k / (k - 1)) * (1 - varianceRatio);
  const clampedAlpha = Number(Math.max(-1, Math.min(0.999, rawAlpha)).toFixed(3));
  const cronbachAlphaPct = Number((clampedAlpha * 100).toFixed(1));

  // Optional KR-20 calculation for dichotomous (Full MC) exams using p_i * q_i
  let kr20Alpha: number | null = null;
  if (report.examFormat === 'full_mc' && k >= 2) {
    const sumPqWeighted = includedQuestions.reduce((acc, q) => {
      const p = (q.facilityIndex ?? 50) / 100;
      const pqVar = p * (1 - p) * 10000; // in (% points)^2
      const w = weights.get(q.slot) ?? 1 / allQuestions.length;
      const remainingWeightSum =
        includedQuestions.reduce((s, item) => s + (weights.get(item.slot) ?? 0), 0) || 1;
      const wNorm = w / remainingWeightSum;
      return acc + wNorm * wNorm * pqVar;
    }, 0);
    const rawKr20 = (k / (k - 1)) * (1 - sumPqWeighted / adjustedTotalVariance);
    kr20Alpha = Number(Math.max(-1, Math.min(0.999, rawKr20)).toFixed(3));
  }

  const positiveOneMinusAlpha = Math.max(0, 1 - clampedAlpha);
  const errorRatioPct = Number((Math.sqrt(positiveOneMinusAlpha) * 100).toFixed(1));
  const effectiveSd = Math.sqrt(adjustedTotalVariance);
  const sem = Number((effectiveSd * Math.sqrt(positiveOneMinusAlpha)).toFixed(1));

  const deltaFromBaseline =
    baselineAlpha !== undefined && baselineAlpha !== null
      ? Number((clampedAlpha - baselineAlpha).toFixed(3))
      : null;

  return {
    scope,
    scopeLabel,
    itemCount: k,
    excludedCount: excludedQuestions.length,
    sumItemVariance: Number(sumItemVariance.toFixed(2)),
    totalVariance: Number(adjustedTotalVariance.toFixed(2)),
    varianceRatio: Number(varianceRatio.toFixed(4)),
    cronbachAlpha: clampedAlpha,
    cronbachAlphaPct,
    moodleCicPct,
    kr20Alpha,
    sem,
    errorRatioPct,
    deltaFromBaseline,
    interpretation: classifyAlpha(clampedAlpha),
  };
}
