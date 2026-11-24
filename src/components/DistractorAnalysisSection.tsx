import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AnalysisReport, AnalyzedQuestion } from '../types/analysis';
import { formatPercent } from '../utils/format';
import { DecisionIndicator, DistractorStatusIndicator } from './StatusText';

interface DistractorAnalysisSectionProps {
  report: AnalysisReport;
  onSelectQuestion: (q: AnalyzedQuestion) => void;
}

type DistractorFilter = 'all' | 'problematic' | 'dominant' | 'good';

export function DistractorAnalysisSection({
  report,
  onSelectQuestion,
}: DistractorAnalysisSectionProps) {
  const [filter, setFilter] = useState<DistractorFilter>('all');
  const [search, setSearch] = useState('');

  const mcQuestions = useMemo(
    () => report.questions.filter((q) => q.responses.length > 0),
    [report.questions]
  );

  const stats = useMemo(() => {
    let totalDistractors = 0;
    let functioning = 0;
    let nonFunctioning = 0;
    let dominant = 0;

    mcQuestions.forEach((q) => {
      if (!q.distractorSummary) return;
      totalDistractors += q.distractorSummary.totalDistractors;
      functioning += q.distractorSummary.functioningCount;
      nonFunctioning += q.distractorSummary.nonFunctioningCount;
      dominant += q.distractorSummary.dominantCount;
    });

    return { totalDistractors, functioning, nonFunctioning, dominant };
  }, [mcQuestions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return mcQuestions.filter((q) => {
      const ds = q.distractorSummary;
      if (filter === 'problematic' && ds && ds.qualityLabel === 'Baik') return false;
      if (filter === 'dominant' && (!ds || ds.dominantCount === 0)) return false;
      if (filter === 'good' && (!ds || ds.qualityLabel !== 'Baik')) return false;
      if (query) {
        const optionText = q.responses.map((r) => r.text).join(' ');
        const haystack = `${q.slot} ${q.name} ${optionText}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [mcQuestions, filter, search]);

  if (mcQuestions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <h1 className="text-lg font-semibold text-slate-900">
          Data Analisis Pengecoh Tidak Tersedia
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
          Berkas yang diunggah tidak memuat tabel distribusi model jawaban (pilihan ganda), atau
          seluruh soal pada ujian ini bertipe esai. Pastikan Anda mengunduh{' '}
          <span className="font-mono text-slate-800">Laporan Lengkap (Complete stats)</span> dari
          Moodle untuk menyertakan analisis pengecoh.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Analisis Pengecoh Pilihan Ganda
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Pengecoh dinilai berfungsi apabila dipilih minimal 5% peserta, namun tidak melebihi
          frekuensi kunci jawaban (menjebak).
        </p>
      </div>

      {/* 4-Column Distractor KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Opsi Pengecoh</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-900">
            {stats.totalDistractors}
          </p>
          <p className="mt-1 text-xs text-slate-500">Dari {mcQuestions.length} soal pilihan ganda</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Pengecoh Berfungsi (≥5%)</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-bold text-emerald-700">
            {stats.functioning - stats.dominant}
          </p>
          <p className="mt-1 text-xs text-slate-500">Menarik siswa secara proporsional</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Tidak Berfungsi (&lt;5%)</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-bold text-amber-700">
            {stats.nonFunctioning}
          </p>
          <p className="mt-1 text-xs text-slate-500">Jarang atau tidak pernah dipilih siswa</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Menjebak / Dominan</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-bold text-red-700">
            {stats.dominant}
          </p>
          <p className="mt-1 text-xs text-slate-500">Dipilih lebih banyak dari kunci jawaban</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari soal atau teks opsi jawaban..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600"
          />
        </div>

        <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg text-xs">
          {(
            [
              { id: 'all', label: `Semua (${mcQuestions.length})` },
              {
                id: 'problematic',
                label: `Perlu Perhatian (${
                  mcQuestions.filter((q) => q.distractorSummary?.qualityLabel !== 'Baik').length
                })`,
              },
              {
                id: 'dominant',
                label: `Menjebak (${
                  mcQuestions.filter((q) => (q.distractorSummary?.dominantCount ?? 0) > 0).length
                })`,
              },
              {
                id: 'good',
                label: `Semua Berfungsi (${
                  mcQuestions.filter((q) => q.distractorSummary?.qualityLabel === 'Baik').length
                })`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question Distractor Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            Tidak ada soal pilihan ganda yang sesuai dengan filter.
          </div>
        ) : (
          filtered.map((q) => (
            <div
              key={q.slot}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-semibold text-blue-700 shrink-0">
                    S#{q.slot}
                  </span>
                  <h2 className="text-sm font-semibold text-slate-900 truncate">{q.name}</h2>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="font-mono tabular-nums text-slate-600">
                    P: {formatPercent(q.facilityIndex)} · D: {formatPercent(q.discriminationIndex)}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    |
                  </span>
                  <DecisionIndicator decision={q.decision} />
                  <button
                    type="button"
                    onClick={() => onSelectQuestion(q)}
                    className="ml-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer"
                  >
                    Detail
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {q.responses
                  .filter((opt) => !(opt.isNoResponse && opt.count === 0))
                  .map((opt, idx) => {
                    const barColor = opt.isKey
                      ? 'bg-blue-600'
                      : opt.status === 'Menjebak'
                      ? 'bg-red-600'
                      : opt.status === 'Berfungsi'
                      ? 'bg-slate-400'
                      : 'bg-amber-400';

                    return (
                      <div
                        key={idx}
                        className="px-5 py-2.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-sm"
                      >
                        <div className="md:col-span-6">
                          <p
                            className={
                              opt.isKey
                                ? 'font-semibold text-slate-900'
                                : opt.isNoResponse
                                ? 'italic text-slate-500'
                                : 'text-slate-700'
                            }
                          >
                            {opt.text}
                          </p>
                        </div>

                        <div className="md:col-span-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${Math.min(100, Math.max(0, opt.frequency))}%` }}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 text-left md:text-right font-mono tabular-nums text-xs text-slate-800">
                          <span className="font-semibold">{formatPercent(opt.frequency)}</span>
                          <span className="text-slate-500 ml-1.5">({opt.count})</span>
                        </div>

                        <div className="md:col-span-2 md:text-right">
                          <DistractorStatusIndicator status={opt.status} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
