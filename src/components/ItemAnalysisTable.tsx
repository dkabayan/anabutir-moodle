import { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import {
  AnalysisReport,
  AnalyzedQuestion,
  DifficultyLevel,
  ItemDecision,
  QuestionCategory,
} from '../types/analysis';
import { formatPercent } from '../utils/format';
import {
  DecisionIndicator,
  DifficultyIndicator,
  DiscriminationIndicator,
} from './StatusText';

interface ItemAnalysisTableProps {
  report: AnalysisReport;
  onSelectQuestion: (q: AnalyzedQuestion) => void;
}

type SortField = 'slot' | 'facility' | 'discrimination' | 'effectiveWeight' | 'efficiency';

export function ItemAnalysisTable({ report, onSelectQuestion }: ItemAnalysisTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | QuestionCategory>('all');
  const [decisionFilter, setDecisionFilter] = useState<'all' | ItemDecision>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DifficultyLevel>('all');
  const [sortField, setSortField] = useState<SortField>('slot');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'slot');
    }
  };

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return report.questions
      .filter((q) => {
        if (typeFilter !== 'all' && q.category !== typeFilter) return false;
        if (decisionFilter !== 'all' && q.decision !== decisionFilter) return false;
        if (difficultyFilter !== 'all' && q.difficultyLevel !== difficultyFilter) return false;
        if (query) {
          const haystack = `${q.slot} ${q.name} ${q.rawType} ${q.decision}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortAsc ? 1 : -1;
        switch (sortField) {
          case 'facility':
            return ((a.facilityIndex ?? -999) - (b.facilityIndex ?? -999)) * dir;
          case 'discrimination':
            return ((a.discriminationIndex ?? -999) - (b.discriminationIndex ?? -999)) * dir;
          case 'effectiveWeight':
            return ((a.effectiveWeight ?? -999) - (b.effectiveWeight ?? -999)) * dir;
          case 'efficiency':
            return ((a.discriminativeEfficiency ?? -999) - (b.discriminativeEfficiency ?? -999)) * dir;
          case 'slot':
          default:
            return (a.slotOrder - b.slotOrder) * dir;
        }
      });
  }, [report.questions, search, typeFilter, decisionFilter, difficultyFilter, sortField, sortAsc]);

  const isMixed = report.examFormat === 'mixed';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tabel Analisis Butir Soal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Menampilkan{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {filteredQuestions.length}
            </span>{' '}
            dari{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {report.questions.length}
            </span>{' '}
            butir soal. Klik baris mana pun untuk membuka detail diagnosis dan sebaran opsi.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor atau nama butir soal..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600"
          />
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {isMixed && (
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg text-xs">
              {(
                [
                  { id: 'all', label: 'Semua Jenis' },
                  { id: 'mc', label: `PG (${report.mcSummary.count})` },
                  { id: 'essay', label: `Esai (${report.essaySummary.count})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    typeFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg text-xs">
            {(
              [
                { id: 'all', label: 'Semua Status' },
                { id: 'Diterima', label: 'Diterima' },
                { id: 'Revisi', label: 'Revisi' },
                { id: 'Dibuang', label: 'Dibuang' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDecisionFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  decisionFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter Tingkat Kesukaran"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as 'all' | DifficultyLevel)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">Semua Kesukaran</option>
            <option value="Sukar">Sukar (&lt;30%)</option>
            <option value="Sedang">Sedang (30–70%)</option>
            <option value="Mudah">Mudah (&gt;70%)</option>
          </select>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 w-14">
                  <button
                    type="button"
                    onClick={() => toggleSort('slot')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>S#</span>
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-4 w-28">Jenis</th>
                <th className="py-3 px-4 min-w-[240px]">Nama / Indikator Soal</th>
                <th className="py-3 px-4 text-right w-28">
                  <button
                    type="button"
                    onClick={() => toggleSort('facility')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Fasilitas (P)</span>
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-4 w-24">Kesukaran</th>
                <th className="py-3 px-4 text-right w-28">
                  <button
                    type="button"
                    onClick={() => toggleSort('discrimination')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Diskrim. (D)</span>
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-4 w-28">Daya Pembeda</th>
                <th className="py-3 px-4 text-right w-28">
                  <button
                    type="button"
                    onClick={() => toggleSort('effectiveWeight')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Bobot Efektif</span>
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right w-24">
                  <button
                    type="button"
                    onClick={() => toggleSort('efficiency')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <span>Efisiensi</span>
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-4 w-28">Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-slate-500">
                    Tidak ada butir soal yang cocok dengan filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q) => (
                  <tr
                    key={q.slot}
                    onClick={() => onSelectQuestion(q)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs font-semibold text-slate-700">
                      {q.slot}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {q.category === 'mc'
                        ? 'Pilihan Ganda'
                        : q.category === 'essay'
                        ? 'Esai'
                        : q.rawType}
                    </td>
                    <td className="py-2.5 px-4 text-slate-900 font-medium max-w-md">
                      <span className="line-clamp-1">{q.name}</span>
                      {q.improvementSuggestions.length > 0 && (
                        <span className="mt-0.5 block text-xs font-normal text-slate-600 line-clamp-1">
                          <span
                            className={`font-semibold ${
                              q.decision === 'Dibuang' ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            Saran ({q.improvementSuggestions[0].aspect}):
                          </span>{' '}
                          {q.improvementSuggestions[0].action}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-800">
                      {formatPercent(q.facilityIndex)}
                    </td>
                    <td className="py-2.5 px-4">
                      <DifficultyIndicator level={q.difficultyLevel} />
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono tabular-nums text-xs font-semibold ${
                        (q.discriminationIndex ?? 0) < 20
                          ? 'text-red-700'
                          : (q.discriminationIndex ?? 0) < 30
                          ? 'text-amber-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatPercent(q.discriminationIndex)}
                    </td>
                    <td className="py-2.5 px-4">
                      <DiscriminationIndicator level={q.discriminationLevel} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                      {formatPercent(q.effectiveWeight)}
                      <span className="text-slate-400">
                        {' '}
                        / {formatPercent(q.intendedWeight, 0)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                      {formatPercent(q.discriminativeEfficiency)}
                    </td>
                    <td className="py-2.5 px-4">
                      <DecisionIndicator decision={q.decision} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
