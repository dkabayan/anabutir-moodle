import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { AnalysisReport } from '../types/analysis';
import { formatDecimal, formatPercent } from '../utils/format';
import { calculateReliability, ReliabilityScope } from '../utils/reliability';

interface ReliabilityPanelProps {
  report: AnalysisReport;
}

export function ReliabilityPanel({ report }: ReliabilityPanelProps) {
  const [scope, setScope] = useState<ReliabilityScope>('all');

  const baseline = useMemo(() => calculateReliability(report, 'all'), [report]);
  const activeCalc = useMemo(
    () =>
      scope === 'all'
        ? baseline
        : calculateReliability(report, scope, baseline.cronbachAlpha),
    [report, scope, baseline]
  );

  const hasRejected = report.decisionCounts.Dibuang > 0;
  const hasReviseOrRejected = report.priorityItems.length > 0;

  const alpha = activeCalc.cronbachAlpha;
  const markerPct = Math.max(0, Math.min(100, (alpha ?? 0) * 100));
  const baselineMarkerPct = Math.max(0, Math.min(100, (baseline.cronbachAlpha ?? 0) * 100));

  const toneColor =
    activeCalc.interpretation.tone === 'emerald'
      ? 'text-emerald-700'
      : activeCalc.interpretation.tone === 'blue'
      ? 'text-blue-700'
      : activeCalc.interpretation.tone === 'amber'
      ? 'text-amber-700'
      : 'text-red-700';

  const StatusIcon =
    activeCalc.interpretation.tone === 'emerald'
      ? CheckCircle2
      : activeCalc.interpretation.tone === 'blue'
      ? Info
      : activeCalc.interpretation.tone === 'amber'
      ? AlertTriangle
      : XCircle;

  return (
    <section
      aria-label="Perhitungan Koefisien Reliabilitas Cronbach's Alpha"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      {/* Panel Header with Interactive What-If Scope Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Perhitungan Koefisien Reliabilitas (Cronbach&apos;s Alpha)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mengukur konsistensi internal instrumen tes berdasarkan rasio varians butir terbobot
            terhadap varians skor total siswa.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg text-xs shrink-0">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              scope === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Butir ({report.questions.length})
          </button>
          {hasRejected && (
            <button
              type="button"
              onClick={() => setScope('without_rejected')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                scope === 'without_rejected'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tanpa Dibuang ({report.questions.length - report.decisionCounts.Dibuang})
            </button>
          )}
          {hasReviseOrRejected && report.decisionCounts.Diterima >= 2 && (
            <button
              type="button"
              onClick={() => setScope('accepted_only')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                scope === 'accepted_only'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hanya Diterima ({report.decisionCounts.Diterima})
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left (7 cols): Primary Coefficient, Scale Visualization & Cross-Metrics */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Koefisien Cronbach&apos;s Alpha (α) · {activeCalc.scopeLabel}
              </p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                <span className="font-mono tabular-nums text-4xl font-bold text-slate-900">
                  {alpha !== null ? formatDecimal(alpha, 3) : '—'}
                </span>
                <span className="font-mono tabular-nums text-base font-medium text-slate-500">
                  ({formatPercent(activeCalc.cronbachAlphaPct, 1)})
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${toneColor}`}>
                  <StatusIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{activeCalc.interpretation.label}</span>
                </span>
              </div>
            </div>

            {activeCalc.deltaFromBaseline !== null && scope !== 'all' && (
              <div className="text-right font-mono tabular-nums">
                <span className="block text-[11px] font-sans text-slate-500">
                  Perubahan dari awal
                </span>
                <span
                  className={`text-sm font-semibold ${
                    activeCalc.deltaFromBaseline >= 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {activeCalc.deltaFromBaseline >= 0 ? '+' : ''}
                  {formatDecimal(activeCalc.deltaFromBaseline, 3)}
                </span>
              </div>
            )}
          </div>

          {/* Reliability Threshold Scale Bar (0.00 to 1.00) */}
          <div className="pt-1">
            <div className="relative h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
              <div className="w-[40%] bg-red-200/85 border-r border-white" title="Sangat Rendah (<0,40)" />
              <div className="w-[20%] bg-amber-200/85 border-r border-white" title="Rendah (0,40–0,59)" />
              <div className="w-[10%] bg-blue-200/90 border-r border-white" title="Cukup (0,60–0,69)" />
              <div className="w-[10%] bg-emerald-200/90 border-r border-white" title="Tinggi (0,70–0,79)" />
              <div className="w-[20%] bg-emerald-300/90" title="Sangat Tinggi (≥0,80)" />

              {/* Baseline ghost marker when simulating */}
              {scope !== 'all' && baseline.cronbachAlpha !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-500/70"
                  style={{ left: `${baselineMarkerPct}%` }}
                  title={`Awal: ${formatDecimal(baseline.cronbachAlpha, 3)}`}
                  aria-hidden="true"
                />
              )}

              {/* Active Alpha Marker */}
              {alpha !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-slate-900 rounded-full"
                  style={{ left: `calc(${markerPct}% - 3px)` }}
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="mt-2 grid grid-cols-5 text-[11px] font-mono tabular-nums text-slate-500">
              <span>0,00</span>
              <span className="text-center">0,40</span>
              <span className="text-center">0,60</span>
              <span className="text-center text-emerald-700 font-medium">0,70</span>
              <span className="text-right text-emerald-800 font-medium">0,80 – 1,00</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {activeCalc.interpretation.description}
          </p>

          {/* Supporting Reliability Indices */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-slate-500">CIC Laporan Moodle</p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-slate-900">
                {activeCalc.moodleCicPct !== null
                  ? formatDecimal(activeCalc.moodleCicPct / 100, 2)
                  : '—'}
              </p>
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                {formatPercent(activeCalc.moodleCicPct, 1)}
              </span>
            </div>

            <div>
              <p className="text-[11px] text-slate-500">Kesalahan Standar (SEM)</p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-slate-900">
                ±{formatPercent(activeCalc.sem, 1)}
              </p>
              <span className="text-[11px] text-slate-500">Margin skor individu</span>
            </div>

            <div>
              <p className="text-[11px] text-slate-500">Rasio Kesalahan</p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-slate-900">
                {formatPercent(activeCalc.errorRatioPct, 1)}
              </p>
              <span className="text-[11px] text-slate-500">√(1 − α)</span>
            </div>

            <div>
              <p className="text-[11px] text-slate-500">
                {activeCalc.kr20Alpha !== null ? 'Koefisien KR-20' : 'Butir Dianalisis'}
              </p>
              <p className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-slate-900">
                {activeCalc.kr20Alpha !== null
                  ? formatDecimal(activeCalc.kr20Alpha, 3)
                  : `${activeCalc.itemCount} / ${report.questions.length}`}
              </p>
              <span className="text-[11px] text-slate-500">
                {activeCalc.kr20Alpha !== null
                  ? 'Khusus dikotomi (PG)'
                  : activeCalc.excludedCount > 0
                  ? `${activeCalc.excludedCount} butir disimulasi hapus`
                  : 'Semua butir aktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Right (5 cols): Transparent Formula & Component Breakdown */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-900">
              Rincian Perhitungan Rumus Cronbach&apos;s Alpha
            </p>
            <p className="mt-1.5 font-mono text-xs text-blue-800 bg-white border border-slate-200 rounded px-3 py-2">
              α = [ k / (k − 1) ] × [ 1 − (Σσᵢ² / σₜ²) ]
            </p>
          </div>

          <dl className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Jumlah butir soal (k)</dt>
              <dd className="font-mono tabular-nums font-semibold text-slate-900">
                {activeCalc.itemCount} butir
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Jumlah varians butir terbobot (Σσᵢ²)</dt>
              <dd className="font-mono tabular-nums font-semibold text-slate-900">
                {formatDecimal(activeCalc.sumItemVariance, 2)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Varians skor total (σₜ²)</dt>
              <dd className="font-mono tabular-nums font-semibold text-slate-900">
                {formatDecimal(activeCalc.totalVariance, 2)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Rasio varians (Σσᵢ² / σₜ²)</dt>
              <dd className="font-mono tabular-nums font-semibold text-slate-900">
                {formatDecimal(activeCalc.varianceRatio, 4)}
              </dd>
            </div>
            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-4">
              <dt className="font-semibold text-slate-900">Hasil Cronbach&apos;s Alpha (α)</dt>
              <dd className={`font-mono tabular-nums text-sm font-bold ${toneColor}`}>
                {alpha !== null ? formatDecimal(alpha, 3) : '—'}
              </dd>
            </div>
          </dl>

          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Bobot tiap butir dinormalisasi dari kolom Bobot Diinginkan Moodle terhadap simpangan
            baku butir. Pada mode simulasi, varians total dikoreksi menggunakan korelasi item-rest
            (Indeks Diskriminasi).
          </p>
        </div>
      </div>
    </section>
  );
}
