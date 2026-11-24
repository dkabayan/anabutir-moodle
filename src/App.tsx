import { useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { CompositionSection } from './components/CompositionSection';
import { DistractorAnalysisSection } from './components/DistractorAnalysisSection';
import { ExportSection } from './components/ExportSection';
import { ItemAnalysisTable } from './components/ItemAnalysisTable';
import { OverviewSection } from './components/OverviewSection';
import { QuestionDetailDrawer } from './components/QuestionDetailDrawer';
import { UploadWorkspace } from './components/UploadWorkspace';
import {
  AnalysisReport,
  AnalyzedQuestion,
  ExportOptions,
  ReportMetadata,
} from './types/analysis';
import { exportReportToExcel } from './utils/exportExcel';
import { exportReportToPdf } from './utils/exportPdf';
import { getTodayIndonesianDate } from './utils/format';
import {
  buildFullMcDemoFromCsv,
  parseCsvToRows,
  parseMoodleFile,
  parseMoodleRows,
} from './utils/moodleParser';
import { StudentGradesImport } from './utils/scoreDistribution';

type ActiveTab = 'overview' | 'items' | 'distractors' | 'composition' | 'export';

const SAMPLE_CSV_PATH =
  '/assets/aistudio/INGGRIS_KHAS_KELAS_X-ASTS_I_20262027_INGGRIS_KHAS-completestats_60391fd1.csv';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB security limit against DoS / memory exhaustion

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeSummary: true,
  includeItemTable: true,
  includeComparison: true,
  includeDistractors: true,
  includeCriteria: true,
  includeSignature: true,
};

function createInitialMetadata(report?: AnalysisReport, prevMeta?: ReportMetadata): ReportMetadata {
  const course = report?.summary.courseName || '';
  const yearMatch = report?.summary.quizName.match(/20\d{2}\/20\d{2}/);
  const classMatch = course.match(/KELAS\s+[A-Z0-9-]+/i);

  return {
    schoolName: prevMeta?.schoolName || 'SMA Plus Muthahhari',
    subjectName: prevMeta?.subjectName || course,
    className: prevMeta?.className || (classMatch ? classMatch[0] : ''),
    academicYear: prevMeta?.academicYear || (yearMatch ? yearMatch[0] : '2026/2027'),
    semester: prevMeta?.semester || 'Ganjil',
    teacherName: prevMeta?.teacherName || '',
    teacherNip: prevMeta?.teacherNip || '',
    principalName: prevMeta?.principalName || '',
    principalNip: prevMeta?.principalNip || '',
    city: prevMeta?.city || 'Bandung',
    reportDate: prevMeta?.reportDate || getTodayIndonesianDate(),
  };
}

export default function App() {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [activeReportIndex, setActiveReportIndex] = useState<number>(0);
  const [studentGrades, setStudentGrades] = useState<StudentGradesImport | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedQuestionSlot, setSelectedQuestionSlot] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ReportMetadata>(() => createInitialMetadata());
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reuploadInputRef = useRef<HTMLInputElement | null>(null);
  const report = reports[activeReportIndex] ?? null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const applyParsedReports = (parsedList: AnalysisReport[]) => {
    setReports(parsedList);
    setActiveReportIndex(0);
    setStudentGrades(null);
    setMetadata((prev) => createInitialMetadata(parsedList[0], prev));
    setSelectedQuestionSlot(null);
    setActiveTab('overview');
    setErrorMessage(null);
  };

  const handleSelectReportIndex = (idx: number) => {
    if (idx < 0 || idx >= reports.length) return;
    setActiveReportIndex(idx);
    setSelectedQuestionSlot(null);
    setMetadata((prev) => createInitialMetadata(reports[idx], prev));
  };

  const handleFilesSelected = async (files: FileList) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const parsedList: AnalysisReport[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`Ukuran berkas "${file.name}" melebihi batas 25MB.`);
        }
        parsedList.push(await parseMoodleFile(file));
      }
      if (parsedList.length === 0) return;
      applyParsedReports(parsedList);
      showToast(
        parsedList.length > 1
          ? `Berhasil memuat ${parsedList.length} berkas kelas untuk dibandingkan.`
          : `Berhasil menganalisis ${parsedList[0].questions.length} butir soal.`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat membaca berkas. Pastikan format CSV/Excel berasal dari LMS Moodle.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClassFiles = async (files: FileList) => {
    setIsLoading(true);
    try {
      const added: AnalysisReport[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`Ukuran berkas "${file.name}" melebihi batas 25MB.`);
        }
        added.push(await parseMoodleFile(file));
      }
      if (added.length > 0) {
        setReports((prev) => [...prev, ...added]);
        showToast(`Berhasil menambahkan ${added.length} berkas kelas ke perbandingan.`);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menambahkan berkas kelas.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSampleMixed = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(SAMPLE_CSV_PATH);
      if (!res.ok) throw new Error('Berkas contoh tidak dapat dimuat.');
      const text = await res.text();
      const rows = parseCsvToRows(text);
      const parsed = parseMoodleRows(
        rows,
        'INGGRIS_KHAS_KELAS_X-ASTS_I_20262027_INGGRIS_KHAS-completestats.csv'
      );
      applyParsedReports([parsed]);
      showToast('Contoh gabungan (40 PG + 5 Esai) berhasil dimuat.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memuat contoh berkas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSampleFullMc = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(SAMPLE_CSV_PATH);
      if (!res.ok) throw new Error('Berkas contoh tidak dapat dimuat.');
      const text = await res.text();
      const parsed = buildFullMcDemoFromCsv(text);
      applyParsedReports([parsed]);
      showToast('Contoh Full Pilihan Ganda (40 PG) berhasil dimuat.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memuat contoh berkas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!report) return;
    exportReportToPdf(report, metadata, exportOptions);
    showToast('Laporan PDF berhasil dibuat dan diunduh.');
  };

  const handleExportExcel = () => {
    if (!report) return;
    exportReportToExcel(report, metadata, exportOptions);
    showToast('Workbook Excel (.xlsx) berhasil dibuat dan diunduh.');
  };

  const selectedIndex =
    report && selectedQuestionSlot
      ? report.questions.findIndex((q) => q.slot === selectedQuestionSlot)
      : -1;
  const selectedQuestion: AnalyzedQuestion | null =
    report && selectedIndex >= 0 ? report.questions[selectedIndex] : null;

  const navItems: { id: ActiveTab; label: string }[] = report
    ? [
        { id: 'overview', label: 'Ringkasan' },
        { id: 'items', label: 'Butir Soal' },
        { id: 'distractors', label: 'Pengecoh PG' },
        {
          id: 'composition',
          label: report.examFormat === 'mixed' ? 'PG & Esai' : 'Bobot Tes',
        },
        { id: 'export', label: 'Ekspor' },
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-slate-900">
      {/* Hidden input for uploading a new file directly from the top bar */}
      <input
        ref={reuploadInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.ods"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleFilesSelected(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single Wordmark */}
          <button
            type="button"
            onClick={() => {
              setReports([]);
              setActiveReportIndex(0);
              setStudentGrades(null);
              setSelectedQuestionSlot(null);
              setErrorMessage(null);
            }}
            className="text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Anabutir
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Navigasi utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {report ? (
              navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'border-blue-700 text-blue-700 font-semibold'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Analisis Butir Soal LMS Moodle
              </span>
            )}
          </nav>

          {/* Zone 3: 1 Primary CTA Action */}
          <div className="shrink-0">
            {report ? (
              <button
                type="button"
                onClick={() => reuploadInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Unggah Berkas Baru
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleLoadSampleMixed()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Coba Contoh Data
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Strip (only when report is loaded on small screens) */}
        {report && (
          <div className="md:hidden border-t border-slate-100 px-4 overflow-x-auto flex items-center gap-5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2.5 text-xs border-b-2 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-blue-700 text-blue-700 font-semibold'
                      : 'border-transparent text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {!report ? (
          <UploadWorkspace
            onFilesSelected={handleFilesSelected}
            onLoadSampleMixed={handleLoadSampleMixed}
            onLoadSampleFullMc={handleLoadSampleFullMc}
            isLoading={isLoading}
            errorMessage={errorMessage}
            metadata={metadata}
            onChangeMetadata={setMetadata}
          />
        ) : (
          <main className="max-w-[1360px] mx-auto px-6 py-8">
            {activeTab === 'overview' && (
              <OverviewSection
                report={report}
                reports={reports}
                activeReportIndex={activeReportIndex}
                onSelectReportIndex={handleSelectReportIndex}
                onAddClassFiles={handleAddClassFiles}
                studentGrades={studentGrades}
                onImportStudentGrades={(imported) => {
                  setStudentGrades(imported);
                  if (imported) {
                    showToast(
                      `Berhasil memuat ${imported.scores.length} data nilai siswa aktual.`
                    );
                  }
                }}
                onSelectQuestion={(q) => setSelectedQuestionSlot(q.slot)}
                onQuickExportPdf={handleExportPdf}
                onQuickExportExcel={handleExportExcel}
                onGoToItems={() => setActiveTab('items')}
              />
            )}

            {activeTab === 'items' && (
              <ItemAnalysisTable
                report={report}
                onSelectQuestion={(q) => setSelectedQuestionSlot(q.slot)}
              />
            )}

            {activeTab === 'distractors' && (
              <DistractorAnalysisSection
                report={report}
                onSelectQuestion={(q) => setSelectedQuestionSlot(q.slot)}
              />
            )}

            {activeTab === 'composition' && (
              <CompositionSection
                report={report}
                onSelectQuestion={(q) => setSelectedQuestionSlot(q.slot)}
              />
            )}

            {activeTab === 'export' && (
              <ExportSection
                report={report}
                metadata={metadata}
                options={exportOptions}
                onChangeMetadata={setMetadata}
                onChangeOptions={setExportOptions}
                onExportPdf={handleExportPdf}
                onExportExcel={handleExportExcel}
              />
            )}
          </main>
        )}
      </div>

      {/* Quiet Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Anabutir · Analisis Butir Soal LMS Moodle</span>
          <span>Mendukung soal Pilihan Ganda penuh maupun gabungan Pilihan Ganda & Esai</span>
        </div>
      </footer>

      {/* Detail Slide-Over Inspector */}
      <QuestionDetailDrawer
        question={selectedQuestion}
        totalQuestions={report?.questions.length ?? 0}
        currentIndex={selectedIndex}
        onClose={() => setSelectedQuestionSlot(null)}
        onNavigate={(nextIdx) => {
          if (report && report.questions[nextIdx]) {
            setSelectedQuestionSlot(report.questions[nextIdx].slot);
          }
        }}
      />

      {/* Export / Action Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 text-xs font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
