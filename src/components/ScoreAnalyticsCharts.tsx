import { useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Plus, RotateCcw, Upload } from 'lucide-react';
import { AnalysisReport } from '../types/analysis';
import { formatPercent } from '../utils/format';
import {
  buildClassAveragesFromReports,
  buildHistogramFromScores,
  ClassAverageItem,
  computeKkmSummary,
  estimateHistogramFromSummary,
  HistogramBin,
  parseStudentGradesFile,
  StudentGradesImport,
} from '../utils/scoreDistribution';

interface ScoreAnalyticsChartsProps {
  reports: AnalysisReport[];
  activeReportIndex: number;
  onSelectReportIndex: (index: number) => void;
  onAddClassFiles: (files: FileList) => Promise<void>;
  studentGrades: StudentGradesImport | null;
  onImportStudentGrades: (imported: StudentGradesImport | null) => void;
}

function HistogramTooltip({
  active,
  payload,
  kkm,
}: {
  active?: boolean;
  payload?: Array<{ payload: HistogramBin }>;
  kkm: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bin = payload[0].payload;
  const statusLabel =
    bin.min >= kkm
      ? 'Di atas KKM (Tuntas)'
      : bin.max <= kkm
      ? 'Di bawah KKM'
      : 'Rentang batas KKM';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-xs">
      <p className="font-semibold text-slate-900 mb-1">Rentang Nilai {bin.range}</p>
      <div className="font-mono tabular-nums space-y-0.5 text-slate-700">
        <p>
          Jumlah Siswa: <strong className="text-slate-900">{bin.count} siswa</strong>
        </p>
        <p>
          Proporsi: <strong className="text-slate-900">{formatPercent(bin.percentage, 1)}</strong>
        </p>
      </div>
      <p className="mt-1.5 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
        {statusLabel}
      </p>
    </div>
  );
}

function ClassAverageTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ClassAverageItem }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-xs max-w-xs">
      <p className="font-semibold text-slate-900 leading-snug mb-1.5">{item.fullName}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono tabular-nums text-slate-700">
        <span>Rata-rata:</span>
        <strong className="text-right text-blue-700">{formatPercent(item.average, 1)}</strong>
        {item.median !== null && (
          <>
            <span>Median:</span>
            <strong className="text-right text-slate-900">{formatPercent(item.median, 1)}</strong>
          </>
        )}
        {item.stdDev !== null && (
          <>
            <span>Simpangan Baku:</span>
            <span className="text-right text-slate-700">{formatPercent(item.stdDev, 1)}</span>
          </>
        )}
        <span>Jumlah Siswa:</span>
        <span className="text-right text-slate-700">{item.studentCount} siswa</span>
      </div>
    </div>
  );
}

export function ScoreAnalyticsCharts({
  reports,
  activeReportIndex,
  onSelectReportIndex,
  onAddClassFiles,
  studentGrades,
  onImportStudentGrades,
}: ScoreAnalyticsChartsProps) {
  const [kkm, setKkm] = useState<number>(70);
  const [gradesError, setGradesError] = useState<string | null>(null);

  const gradesInputRef = useRef<HTMLInputElement | null>(null);
  const addClassInputRef = useRef<HTMLInputElement | null>(null);

  const activeReport = reports[activeReportIndex];

  // Histogram data: use exact imported student scores if provided, otherwise auto-estimate from Moodle stats
  const histogramBins = useMemo(() => {
    if (studentGrades && studentGrades.scores.length > 0) {
      return buildHistogramFromScores(studentGrades.scores);
    }
    return estimateHistogramFromSummary(activeReport.summary);
  }, [activeReport.summary, studentGrades]);

  const kkmStats = useMemo(
    () => computeKkmSummary(histogramBins, kkm, studentGrades?.scores ?? null),
    [histogramBins, kkm, studentGrades]
  );

  // Per-class average data:
  // Priority 1: Multiple Moodle class files loaded -> compare all classes directly
  // Priority 2: Imported student grades file with class/group column -> show exact per-class averages
  // Priority 3: Single Moodle class file -> show active class + segment breakdown (PG & Esai if mixed)
  const { classChartData, classChartMode } = useMemo(() => {
    if (reports.length > 1) {
      return {
        classChartData: buildClassAveragesFromReports(reports, activeReportIndex),
        classChartMode: 'multi_reports' as const,
      };
    }

    if (studentGrades && studentGrades.classAverages.length > 1) {
      return {
        classChartData: studentGrades.classAverages,
        classChartMode: 'grades_groups' as const,
      };
    }

    const singleClass = buildClassAveragesFromReports(reports, activeReportIndex)[0];
    const items: ClassAverageItem[] = [singleClass];

    if (activeReport.examFormat === 'mixed') {
      if (activeReport.mcSummary.avgFacility !== null) {
        items.push({
          id: 'segment-mc',
          className: 'Subskor PG',
          fullName: `${singleClass.className} · Rerata Pilihan Ganda (${activeReport.mcSummary.count} soal)`,
          average: Number(activeReport.mcSummary.avgFacility.toFixed(1)),
          median: null,
          stdDev: null,
          studentCount: activeReport.summary.totalAttemptsCount,
        });
      }
      if (activeReport.essaySummary.avgFacility !== null) {
        items.push({
          id: 'segment-essay',
          className: 'Subskor Esai',
          fullName: `${singleClass.className} · Rerata Esai (${activeReport.essaySummary.count} soal)`,
          average: Number(activeReport.essaySummary.avgFacility.toFixed(1)),
          median: null,
          stdDev: null,
          studentCount: activeReport.summary.totalAttemptsCount,
        });
      }
    }

    return {
      classChartData: items,
      classChartMode: 'single_class' as const,
    };
  }, [reports, activeReportIndex, activeReport, studentGrades]);

  // Nearest bin range string for the Mean reference line on categorical XAxis
  const meanScore =
    studentGrades && studentGrades.scores.length > 0
      ? Number(
          (
            studentGrades.scores.reduce((s, v) => s + v, 0) / studentGrades.scores.length
          ).toFixed(1)
        )
      : activeReport.summary.avgHighestAttempt ?? 0;

  const meanBinLabel = useMemo(() => {
    const idx = meanScore >= 100 ? 9 : Math.max(0, Math.min(9, Math.floor(meanScore / 10)));
    return histogramBins[idx]?.range;
  }, [meanScore, histogramBins]);

  const handleGradesUpload = async (file: File) => {
    setGradesError(null);
    try {
      const parsed = await parseStudentGradesFile(file);
      onImportStudentGrades(parsed);
    } catch (err) {
      setGradesError(
        err instanceof Error ? err.message : 'Gagal membaca berkas nilai siswa.'
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Hidden inputs for optional grades & additional class stats */}
      <input
        ref={gradesInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.ods"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleGradesUpload(file);
          e.target.value = '';
        }}
      />
      <input
        ref={addClassInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.ods"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void onAddClassFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* Left (6 cols): Distribusi Nilai Siswa (Histogram) */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Distribusi Nilai Siswa (Histogram)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {studentGrades
                  ? `Data nilai aktual dari ${studentGrades.fileName} (${studentGrades.scores.length} siswa)`
                  : `Estimasi sebaran 10 interval dari parameter Moodle (N=${kkmStats.total}, Rerata ${formatPercent(
                      meanScore,
                      1
                    )}, SD ${formatPercent(activeReport.summary.stdDevHighest, 1)})`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label
                htmlFor="kkm-input"
                className="text-xs font-medium text-slate-600 whitespace-nowrap"
              >
                KKM
              </label>
              <input
                id="kkm-input"
                type="number"
                min={0}
                max={100}
                step={5}
                value={kkm}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setKkm(Math.max(0, Math.min(100, v)));
                }}
                className="w-16 px-2 py-1 text-xs font-mono tabular-nums text-right bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
          </div>

          {/* Tuntas vs Belum Tuntas inline summary */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-700 inline-block" />
                Tuntas (≥{kkm}):{' '}
                <strong className="text-slate-900">
                  {kkmStats.passed} siswa ({formatPercent(kkmStats.passRate, 1)})
                </strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
                Belum Tuntas: <strong className="text-slate-800">{kkmStats.failed} siswa</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {studentGrades && (
                <button
                  type="button"
                  onClick={() => onImportStudentGrades(null)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => gradesInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer whitespace-nowrap"
                title="Opsional: unggah berkas Nilai (Grades) individu dari Moodle untuk mengganti estimasi"
              >
                <Upload className="w-3 h-3" aria-hidden="true" />
                <span>{studentGrades ? 'Ganti Nilai' : 'Impor Nilai Siswa'}</span>
              </button>
            </div>
          </div>

          {gradesError && (
            <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {gradesError}
            </p>
          )}
        </div>

        <div className="mt-4 h-[265px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={histogramBins}
              margin={{ top: 18, right: 12, left: -12, bottom: 8 }}
              barCategoryGap="12%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: '#475569' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: 'Siswa',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 18,
                  style: { fontSize: 11, fill: '#64748B', textAnchor: 'middle' },
                }}
              />
              <Tooltip
                content={<HistogramTooltip kkm={kkm} />}
                cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
              />
              {meanBinLabel && (
                <ReferenceLine
                  x={meanBinLabel}
                  stroke="#047857"
                  strokeDasharray="4 4"
                  label={{
                    value: `Rerata ${formatPercent(meanScore, 0)}`,
                    position: 'top',
                    fill: '#047857',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
              <Bar dataKey="count" name="Jumlah Siswa" radius={[4, 4, 0, 0]} maxBarSize={38}>
                {histogramBins.map((bin) => (
                  <Cell
                    key={bin.range}
                    fill={bin.min >= kkm ? '#1D4ED8' : bin.max <= kkm ? '#94A3B8' : '#64748B'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right (6 cols): Rata-rata Skor per Kelas */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Rata-rata Skor per Kelas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {classChartMode === 'multi_reports'
                  ? `Perbandingan otomatis ${reports.length} kelas yang diunggah. Klik batang kelas untuk berpindah analisis.`
                  : classChartMode === 'grades_groups'
                  ? `Rata-rata dan median aktual dari ${classChartData.length} grup/kelas pada berkas nilai.`
                  : 'Menampilkan skor kelas aktif. Tambah berkas kelas lain untuk membandingkan antar kelas.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => addClassInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              <span>Tambah Kelas</span>
            </button>
          </div>

          {/* Class switcher / summary metadata row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            {reports.length > 1 ? (
              reports.map((rep, idx) => {
                const active = idx === activeReportIndex;
                return (
                  <button
                    key={`${rep.fileName}-${idx}`}
                    type="button"
                    onClick={() => onSelectReportIndex(idx)}
                    className={`transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'font-semibold text-blue-700 underline underline-offset-4'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {buildClassAveragesFromReports(reports, activeReportIndex)[idx]?.className} (
                    {formatPercent(rep.summary.avgHighestAttempt, 0)})
                  </button>
                );
              })
            ) : (
              <span className="font-mono tabular-nums text-slate-600">
                Kelas aktif: <strong className="text-slate-900">{activeReport.summary.courseName}</strong> ·
                Rerata <strong className="text-blue-700">{formatPercent(activeReport.summary.avgHighestAttempt, 1)}</strong> ·
                Median <strong className="text-slate-900">{formatPercent(activeReport.summary.medianHighest, 1)}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 h-[265px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classChartData}
              margin={{ top: 18, right: 16, left: -10, bottom: 8 }}
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="className"
                tick={{ fontSize: 11, fill: '#334155' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ClassAverageTooltip />}
                cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine
                y={kkm}
                stroke="#B45309"
                strokeDasharray="4 4"
                label={{
                  value: `KKM ${kkm}%`,
                  position: 'insideTopRight',
                  fill: '#B45309',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <Bar
                dataKey="average"
                name="Rata-rata Skor"
                fill="#1D4ED8"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
                className={classChartMode === 'multi_reports' ? 'cursor-pointer' : ''}
                onClick={(entry) => {
                  const item = entry as unknown as {
                    payload?: ClassAverageItem;
                    reportIndex?: number;
                  };
                  const idx = item.payload?.reportIndex ?? item.reportIndex;
                  if (typeof idx === 'number' && reports.length > 1) {
                    onSelectReportIndex(idx);
                  }
                }}
              >
                {classChartData.map((item) => (
                  <Cell
                    key={item.id}
                    fill={
                      item.id === 'segment-essay'
                        ? '#047857'
                        : item.id === 'segment-mc'
                        ? '#3B82F6'
                        : item.isActive === false && reports.length > 1
                        ? '#93C5FD'
                        : '#1D4ED8'
                    }
                  />
                ))}
              </Bar>
              {classChartData.some((d) => d.median !== null) && (
                <Bar
                  dataKey="median"
                  name="Median"
                  fill="#0F172A"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
