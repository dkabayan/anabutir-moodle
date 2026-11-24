import { useState } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ArrowRight, FileSpreadsheet, FileText } from 'lucide-react';
import { AnalysisReport, AnalyzedQuestion } from '../types/analysis';
import { formatDecimal, formatPercent } from '../utils/format';
import { StudentGradesImport } from '../utils/scoreDistribution';
import { ItemStatsSummaryPanel } from './ItemStatsSummaryPanel';
import { ReliabilityPanel } from './ReliabilityPanel';
import { ScoreAnalyticsCharts } from './ScoreAnalyticsCharts';
import { DecisionIndicator, DiscriminationIndicator } from './StatusText';

interface OverviewSectionProps {
  report: AnalysisReport;
  reports: AnalysisReport[];
  activeReportIndex: number;
  onSelectReportIndex: (index: number) => void;
  onAddClassFiles: (files: FileList) => Promise<void>;
  studentGrades: StudentGradesImport | null;
  onImportStudentGrades: (imported: StudentGradesImport | null) => void;
  onSelectQuestion: (q: AnalyzedQuestion) => void;
  onQuickExportPdf: () => void;
  onQuickExportExcel: () => void;
  onGoToItems: () => void;
}

interface ScatterPoint {
  slot: string;
  name: string;
  facility: number;
  discrimination: number;
  decision: string;
  category: string;
  question: AnalyzedQuestion;
}

function CustomScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm max-w-xs text-xs">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-mono font-semibold text-blue-700">S#{pt.slot}</span>
        <span className="text-slate-500">{pt.category}</span>
      </div>
      <p className="font-semibold text-slate-900 leading-snug mb-2">{pt.name}</p>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 font-mono tabular-nums">
        <div>
          <span className="text-slate-500 block font-sans">Fasilitas (P)</span>
          <span className="font-semibold text-slate-900">{formatPercent(pt.facility)}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-sans">Diskriminasi (D)</span>
          <span
            className={`font-semibold ${
              pt.discrimination < 20 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {formatPercent(pt.discrimination)}
          </span>
        </div>
      </div>
      <p className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
        Klik titik untuk membuka detail butir
      </p>
    </div>
  );
}

export function OverviewSection({
  report,
  reports,
  activeReportIndex,
  onSelectReportIndex,
  onAddClassFiles,
  studentGrades,
  onImportStudentGrades,
  onSelectQuestion,
  onQuickExportPdf,
  onQuickExportExcel,
  onGoToItems,
}: OverviewSectionProps) {
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Dibuang' | 'Revisi'>('all');
  const totalQ = report.questions.length;
  const acceptedPct = totalQ > 0 ? (report.decisionCounts.Diterima / totalQ) * 100 : 0;

  const filteredPriorityItems = report.priorityItems.filter((q) =>
    priorityFilter === 'all' ? true : q.decision === priorityFilter
  );

  const mcPoints: ScatterPoint[] = report.questions
    .filter(
      (q) =>
        q.category !== 'essay' &&
        q.facilityIndex !== null &&
        q.discriminationIndex !== null
    )
    .map((q) => ({
      slot: q.slot,
      name: q.name,
      facility: q.facilityIndex!,
      discrimination: q.discriminationIndex!,
      decision: q.decision,
      category: 'Pilihan Ganda',
      question: q,
    }));

  const essayPoints: ScatterPoint[] = report.questions
    .filter(
      (q) =>
        q.category === 'essay' &&
        q.facilityIndex !== null &&
        q.discriminationIndex !== null
    )
    .map((q) => ({
      slot: q.slot,
      name: q.name,
      facility: q.facilityIndex!,
      discrimination: q.discriminationIndex!,
      decision: q.decision,
      category: 'Esai / Uraian',
      question: q,
    }));

  const minDisc = Math.min(
    -10,
    ...report.questions
      .map((q) => q.discriminationIndex ?? 0)
      .map((v) => Math.floor(v / 10) * 10 - 10)
  );

  const difficultyBars = [
    { label: 'Sukar (<30%)', count: report.difficultyCounts.Sukar, bar: 'bg-amber-600' },
    { label: 'Sedang (30–70%)', count: report.difficultyCounts.Sedang, bar: 'bg-slate-800' },
    { label: 'Mudah (>70%)', count: report.difficultyCounts.Mudah, bar: 'bg-blue-600' },
  ];

  const discriminationBars = [
    { label: 'Sangat Baik (≥40%)', count: report.discriminationCounts['Sangat Baik'], bar: 'bg-emerald-700' },
    { label: 'Baik (30–39%)', count: report.discriminationCounts.Baik, bar: 'bg-emerald-500' },
    { label: 'Cukup (20–29%)', count: report.discriminationCounts.Cukup, bar: 'bg-amber-500' },
    { label: 'Jelek (0–19%)', count: report.discriminationCounts.Jelek, bar: 'bg-red-500' },
    { label: 'Sangat Jelek (<0%)', count: report.discriminationCounts['Sangat Jelek'], bar: 'bg-red-700' },
  ];

  return (
    <div className="space-y-8">
      {/* Contextual Exam Header & Quick Export Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-blue-700">{report.examFormatLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{report.summary.courseName}</span>
            <span aria-hidden="true">·</span>
            <span>{report.summary.openDate}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{report.summary.totalAttemptsCount} siswa</span>
          </div>
          <h1 className="text-2xl lg:text-[28px] font-bold tracking-tight text-slate-900">
            {report.summary.quizName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onQuickExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={onQuickExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ekspor PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* 4-Column Psychometric KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Rata-rata & Median Nilai</p>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              {formatPercent(report.summary.avgHighestAttempt, 1)}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              Median {formatPercent(report.summary.medianHighest, 1)}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Simpangan baku {formatPercent(report.summary.stdDevHighest, 1)} · {report.summary.firstAttemptsCount} peserta
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Reliabilitas Tes (CIC)</p>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              {formatPercent(report.summary.internalConsistency, 1)}
            </span>
            <span
              className={`text-xs font-semibold ${
                (report.summary.internalConsistency ?? 0) >= 65
                  ? 'text-emerald-700'
                  : (report.summary.internalConsistency ?? 0) >= 50
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}
            >
              {report.reliabilityLabel}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            SEM {formatPercent(report.summary.standardError, 1)} · Error Ratio {formatPercent(report.summary.errorRatio, 1)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Kelayakan Butir Soal</p>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono tabular-nums text-2xl font-bold text-emerald-700">
              {report.decisionCounts.Diterima}/{totalQ}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {formatPercent(acceptedPct, 1)} diterima
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 font-mono tabular-nums">
            <span className="text-amber-700 font-medium">{report.decisionCounts.Revisi} revisi</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-red-700 font-medium">{report.decisionCounts.Dibuang} dibuang</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Komposisi Butir Soal</p>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              {totalQ}
            </span>
            <span className="text-xs text-slate-500">butir dianalisis</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 font-mono tabular-nums">
            {report.mcSummary.count} Pilihan Ganda
            {report.essaySummary.count > 0 ? ` · ${report.essaySummary.count} Esai` : ' · Objektif penuh'}
          </p>
        </div>
      </div>

      {/* Visual Summary Panel: Average Item Difficulty & Discrimination */}
      <ItemStatsSummaryPanel report={report} />

      {/* Internal Consistency / Cronbach's Alpha Calculator & What-If Simulator */}
      <ReliabilityPanel report={report} />

      {/* Student Score Distribution (Histogram) & Class Average Bar Chart */}
      <ScoreAnalyticsCharts
        reports={reports}
        activeReportIndex={activeReportIndex}
        onSelectReportIndex={onSelectReportIndex}
        onAddClassFiles={onAddClassFiles}
        studentGrades={studentGrades}
        onImportStudentGrades={onImportStudentGrades}
      />

      {/* Interactive Psychometric Map + Distribution Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive Scatter Plot */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Peta Kualitas Butir: Kesukaran (P) vs Daya Pembeda (D)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Zona ideal berada pada P 30–70% dan D ≥ 30%. Klik titik butir untuk membuka diagnosis lengkap.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-700 inline-block" />
                Pilihan Ganda ({mcPoints.length})
              </span>
              {essayPoints.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700 inline-block" />
                  Esai ({essayPoints.length})
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 14, right: 18, bottom: 24, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="facility"
                  name="Indeks Fasilitas (P)"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  label={{
                    value: 'Indeks Fasilitas / Tingkat Kesukaran (P %)',
                    position: 'bottom',
                    offset: 6,
                    style: { fontSize: 11, fill: '#64748B' },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="discrimination"
                  name="Indeks Diskriminasi (D)"
                  domain={[minDisc, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  label={{
                    value: 'Daya Pembeda (D %)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    style: { fontSize: 11, fill: '#64748B', textAnchor: 'middle' },
                  }}
                />
                <ZAxis range={[64, 64]} />
                <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                {/* Difficulty boundaries */}
                <ReferenceLine x={30} stroke="#CBD5E1" strokeDasharray="4 4" />
                <ReferenceLine x={70} stroke="#CBD5E1" strokeDasharray="4 4" />
                {/* Discrimination thresholds */}
                <ReferenceLine
                  y={30}
                  stroke="#047857"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Layak (D=30%)',
                    position: 'insideTopRight',
                    fill: '#047857',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  y={20}
                  stroke="#B91C1C"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Batas Kritis (D=20%)',
                    position: 'insideBottomRight',
                    fill: '#B91C1C',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine y={0} stroke="#94A3B8" />
                <Scatter
                  name="Pilihan Ganda"
                  data={mcPoints}
                  fill="#1D4ED8"
                  fillOpacity={0.82}
                  className="cursor-pointer"
                  onClick={(entry) => {
                    const item = entry as unknown as {
                      payload?: ScatterPoint;
                      question?: AnalyzedQuestion;
                    };
                    const q = item.payload?.question ?? item.question;
                    if (q) onSelectQuestion(q);
                  }}
                />
                {essayPoints.length > 0 && (
                  <Scatter
                    name="Esai"
                    data={essayPoints}
                    fill="#047857"
                    shape="square"
                    className="cursor-pointer"
                    onClick={(entry) => {
                      const item = entry as unknown as {
                        payload?: ScatterPoint;
                        question?: AnalyzedQuestion;
                      };
                      const q = item.payload?.question ?? item.question;
                      if (q) onSelectQuestion(q);
                    }}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Distribution Summary & Test Diagnostics */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 pb-4 border-b border-slate-100">
              Sebaran Kesukaran & Daya Pembeda
            </h2>

            {/* Difficulty Bars */}
            <div className="mt-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Tingkat Kesukaran (P)</p>
              {difficultyBars.map((item) => {
                const pct = totalQ > 0 ? (item.count / totalQ) * 100 : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-mono tabular-nums text-slate-900 font-medium">
                        {item.count} ({formatPercent(pct, 0)})
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Discrimination Bars */}
            <div className="mt-6 space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Daya Pembeda (D)</p>
              {discriminationBars.map((item) => {
                const pct = totalQ > 0 ? (item.count / totalQ) * 100 : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-mono tabular-nums text-slate-900 font-medium">
                        {item.count} ({formatPercent(pct, 0)})
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span>Kemiringan (Skewness)</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {formatDecimal(report.summary.skewness)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Kurtosis Distribusi</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {formatDecimal(report.summary.kurtosis)}
              </span>
            </div>
            <p className="pt-2 text-slate-500 leading-relaxed">{report.reliabilityNote}</p>
          </div>
        </div>
      </div>

      {/* Priority Action & Concrete Improvement Suggestions */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Saran Perbaikan Butir Revisi & Dibuang ({report.priorityItems.length} Butir)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekomendasi perbaikan spesifik berdasarkan daya pembeda, tingkat kesukaran, dan pola
              pengecoh masing-masing butir soal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {report.priorityItems.length > 0 && (
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg text-xs">
                {(
                  [
                    { id: 'all', label: `Semua (${report.priorityItems.length})` },
                    { id: 'Dibuang', label: `Dibuang (${report.decisionCounts.Dibuang})` },
                    { id: 'Revisi', label: `Revisi (${report.decisionCounts.Revisi})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPriorityFilter(tab.id)}
                    className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      priorityFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={onGoToItems}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Lihat semua {totalQ} butir</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {filteredPriorityItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            {report.priorityItems.length === 0
              ? 'Seluruh butir soal memenuhi kriteria kelayakan (D ≥ 30% dan tingkat kesukaran proporsional).'
              : 'Tidak ada butir soal pada kategori filter ini.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredPriorityItems.map((q) => (
              <div key={q.slot} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                    <span className="font-mono tabular-nums text-xs font-semibold text-blue-700 shrink-0">
                      S#{q.slot}
                    </span>
                    <DecisionIndicator decision={q.decision} />
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">{q.name}</h3>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs text-slate-500">
                      {q.category === 'mc'
                        ? 'Pilihan Ganda'
                        : q.category === 'essay'
                        ? 'Esai'
                        : q.rawType}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs shrink-0">
                    <span className="font-mono tabular-nums text-slate-600">
                      P:{' '}
                      <strong className="text-slate-900">
                        {formatPercent(q.facilityIndex)}
                      </strong>
                    </span>
                    <span className="font-mono tabular-nums text-slate-600">
                      D:{' '}
                      <strong
                        className={
                          (q.discriminationIndex ?? 0) < 20 ? 'text-red-700' : 'text-amber-700'
                        }
                      >
                        {formatPercent(q.discriminationIndex)}
                      </strong>{' '}
                      (<DiscriminationIndicator level={q.discriminationLevel} />)
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectQuestion(q)}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer"
                    >
                      Buka Detail & Opsi
                    </button>
                  </div>
                </div>

                {q.improvementSuggestions.length > 0 && (
                  <ol className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 pt-3 border-t border-slate-100">
                    {q.improvementSuggestions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed">
                        <span className="font-mono tabular-nums font-semibold text-slate-400 mt-0.5 shrink-0">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900">{item.aspect}: </span>
                          <span className="text-slate-700">{item.action}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
