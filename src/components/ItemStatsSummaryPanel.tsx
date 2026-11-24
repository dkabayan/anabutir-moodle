import { useMemo } from 'react';
import { AnalysisReport } from '../types/analysis';
import { formatPercent } from '../utils/format';
import { classifyDifficulty, classifyDiscrimination } from '../utils/moodleParser';
import { DifficultyIndicator, DiscriminationIndicator } from './StatusText';

interface ItemStatsSummaryPanelProps {
  report: AnalysisReport;
}

export function ItemStatsSummaryPanel({ report }: ItemStatsSummaryPanelProps) {
  const stats = useMemo(() => {
    const validP = report.questions
      .map((q) => q.facilityIndex)
      .filter((v): v is number => v !== null);
    const validD = report.questions
      .map((q) => q.discriminationIndex)
      .filter((v): v is number => v !== null);
    const validEff = report.questions
      .map((q) => q.discriminativeEfficiency)
      .filter((v): v is number => v !== null);

    const avgP =
      validP.length > 0 ? validP.reduce((s, v) => s + v, 0) / validP.length : null;
    const minP = validP.length > 0 ? Math.min(...validP) : null;
    const maxP = validP.length > 0 ? Math.max(...validP) : null;

    const avgD =
      validD.length > 0 ? validD.reduce((s, v) => s + v, 0) / validD.length : null;
    const minD = validD.length > 0 ? Math.min(...validD) : null;
    const maxD = validD.length > 0 ? Math.max(...validD) : null;

    const avgEff =
      validEff.length > 0 ? validEff.reduce((s, v) => s + v, 0) / validEff.length : null;

    const totalQ = report.questions.length || 1;
    const idealDifficultyPct = (report.difficultyCounts.Sedang / totalQ) * 100;
    const goodDiscCount =
      report.discriminationCounts['Sangat Baik'] + report.discriminationCounts.Baik;
    const goodDiscPct = (goodDiscCount / totalQ) * 100;
    const criticalDiscCount =
      report.discriminationCounts.Jelek + report.discriminationCounts['Sangat Jelek'];

    return {
      avgP,
      minP,
      maxP,
      avgD,
      minD,
      maxD,
      avgEff,
      idealDifficultyPct,
      goodDiscCount,
      goodDiscPct,
      criticalDiscCount,
      totalQ: report.questions.length,
    };
  }, [report]);

  const clampedP = Math.max(0, Math.min(100, stats.avgP ?? 0));
  const clampedD = Math.max(0, Math.min(100, stats.avgD ?? 0));
  const difficultyLevel = classifyDifficulty(stats.avgP);
  const discriminationLevel = classifyDiscrimination(stats.avgD);
  const isMixed = report.examFormat === 'mixed';

  return (
    <section
      aria-label="Ringkasan Statistik Butir Soal"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Ringkasan Statistik Butir Soal
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Posisi rata-rata tingkat kesukaran (P) dan daya pembeda (D) dari seluruh{' '}
            <span className="font-mono tabular-nums font-medium text-slate-700">
              {stats.totalQ}
            </span>{' '}
            butir soal terhadap rentang ideal psikometrik.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
          Efisiensi Diskriminatif Rerata:{' '}
          <strong className="text-slate-900">{formatPercent(stats.avgEff)}</strong>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:divide-x lg:divide-slate-200">
        {/* Left: Average Difficulty (Tingkat Kesukaran / P) */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Rata-rata Tingkat Kesukaran (Indeks Fasilitas / P)
              </p>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="font-mono tabular-nums text-3xl font-bold text-slate-900">
                  {formatPercent(stats.avgP)}
                </span>
                <DifficultyIndicator level={difficultyLevel} />
              </div>
            </div>
            <div className="text-right text-xs font-mono tabular-nums text-slate-500">
              <span className="block">Rentang aktual</span>
              <span className="font-medium text-slate-800">
                {formatPercent(stats.minP, 1)} – {formatPercent(stats.maxP, 1)}
              </span>
            </div>
          </div>

          {/* Visual 3-Zone Scale Bar for Difficulty (0-30 Sukar, 30-70 Sedang/Ideal, 70-100 Mudah) */}
          <div className="pt-2">
            <div className="relative h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
              <div className="w-[30%] bg-amber-200/80 border-r border-white" title="Sukar (0–30%)" />
              <div className="w-[40%] bg-emerald-200/90 border-r border-white" title="Sedang / Ideal (30–70%)" />
              <div className="w-[30%] bg-blue-200/80" title="Mudah (70–100%)" />

              {/* Marker Pin */}
              {stats.avgP !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-slate-900 rounded-full"
                  style={{ left: `calc(${clampedP}% - 2px)` }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Scale Labels */}
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
              <span>0% · Sukar</span>
              <span className="text-emerald-800 font-medium">30% – 70% · Ideal (Sedang)</span>
              <span>Mudah · 100%</span>
            </div>
          </div>

          {/* Breakdown & Mixed PG vs Essay sub-bars */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
              <span>Proporsi butir pada zona ideal (Sedang):</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {report.difficultyCounts.Sedang}/{stats.totalQ} butir (
                {formatPercent(stats.idealDifficultyPct, 1)})
              </span>
            </div>

            {isMixed && (
              <div className="grid grid-cols-2 gap-4 pt-1 font-mono tabular-nums">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-sans text-slate-500">Rerata PG</span>
                    <span className="font-semibold text-slate-800">
                      {formatPercent(report.mcSummary.avgFacility)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-700 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, report.mcSummary.avgFacility ?? 0))}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-sans text-slate-500">Rerata Esai</span>
                    <span className="font-semibold text-slate-800">
                      {formatPercent(report.essaySummary.avgFacility)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-700 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, report.essaySummary.avgFacility ?? 0))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Average Discrimination (Daya Pembeda / D) */}
        <div className="lg:pl-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Rata-rata Daya Pembeda (Indeks Diskriminasi / D)
              </p>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span
                  className={`font-mono tabular-nums text-3xl font-bold ${
                    (stats.avgD ?? 0) >= 30
                      ? 'text-emerald-700'
                      : (stats.avgD ?? 0) >= 20
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {formatPercent(stats.avgD)}
                </span>
                <DiscriminationIndicator level={discriminationLevel} />
              </div>
            </div>
            <div className="text-right text-xs font-mono tabular-nums text-slate-500">
              <span className="block">Rentang aktual</span>
              <span className="font-medium text-slate-800">
                {formatPercent(stats.minD, 1)} – {formatPercent(stats.maxD, 1)}
              </span>
            </div>
          </div>

          {/* Visual 4-Zone Scale Bar for Discrimination (0-20 Jelek, 20-30 Cukup, 30-40 Baik, 40-100 Sangat Baik) */}
          <div className="pt-2">
            <div className="relative h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
              <div className="w-[20%] bg-red-200/90 border-r border-white" title="Jelek (<20%)" />
              <div className="w-[10%] bg-amber-200/90 border-r border-white" title="Cukup (20–30%)" />
              <div className="w-[10%] bg-emerald-200/80 border-r border-white" title="Baik (30–40%)" />
              <div className="w-[60%] bg-emerald-300/80" title="Sangat Baik (≥40%)" />

              {/* Marker Pin */}
              {stats.avgD !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-slate-900 rounded-full"
                  style={{ left: `calc(${clampedD}% - 2px)` }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Scale Labels */}
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
              <span className="text-red-700">&lt;20% · Jelek</span>
              <span className="text-amber-700">20–30% · Cukup</span>
              <span className="text-emerald-800 font-medium">≥30% · Baik – Sangat Baik</span>
            </div>
          </div>

          {/* Breakdown & Mixed PG vs Essay sub-bars */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
              <span>Butir berdaya beda baik/sangat baik (D ≥ 30%):</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {stats.goodDiscCount}/{stats.totalQ} butir ({formatPercent(stats.goodDiscPct, 1)})
                {stats.criticalDiscCount > 0 && (
                  <span className="ml-1.5 text-red-700 font-medium">
                    · {stats.criticalDiscCount} kritis
                  </span>
                )}
              </span>
            </div>

            {isMixed && (
              <div className="grid grid-cols-2 gap-4 pt-1 font-mono tabular-nums">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-sans text-slate-500">Rerata PG</span>
                    <span className="font-semibold text-slate-800">
                      {formatPercent(report.mcSummary.avgDiscrimination)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-700 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, report.mcSummary.avgDiscrimination ?? 0))}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-sans text-slate-500">Rerata Esai</span>
                    <span className="font-semibold text-emerald-700">
                      {formatPercent(report.essaySummary.avgDiscrimination)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-700 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, report.essaySummary.avgDiscrimination ?? 0)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
