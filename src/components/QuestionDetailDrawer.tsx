import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnalyzedQuestion } from '../types/analysis';
import { formatPercent } from '../utils/format';
import {
  DecisionIndicator,
  DifficultyIndicator,
  DiscriminationIndicator,
  DistractorStatusIndicator,
} from './StatusText';

interface QuestionDetailDrawerProps {
  question: AnalyzedQuestion | null;
  totalQuestions: number;
  currentIndex: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

export function QuestionDetailDrawer({
  question,
  totalQuestions,
  currentIndex,
  onClose,
  onNavigate,
}: QuestionDetailDrawerProps) {
  if (!question) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail Soal ${question.slot}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white h-full overflow-y-auto border-l border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-sm font-semibold text-blue-700 shrink-0">
              S#{question.slot}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-medium text-slate-600 truncate">
              {question.category === 'mc'
                ? 'Pilihan Ganda'
                : question.category === 'essay'
                ? 'Esai / Uraian'
                : question.rawType}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => onNavigate(currentIndex - 1)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md disabled:opacity-35 transition-colors cursor-pointer"
              title="Soal sebelumnya"
              aria-label="Soal sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono tabular-nums text-slate-500 px-1">
              {currentIndex + 1}/{totalQuestions}
            </span>
            <button
              type="button"
              disabled={currentIndex >= totalQuestions - 1}
              onClick={() => onNavigate(currentIndex + 1)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md disabled:opacity-35 transition-colors cursor-pointer"
              title="Soal berikutnya"
              aria-label="Soal berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              aria-label="Tutup panel detail"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          <div>
            <div className="mb-2">
              <DecisionIndicator decision={question.decision} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{question.name}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Dikerjakan oleh{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700">
                {question.attempts}
              </span>{' '}
              siswa
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 py-5 border-y border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Indeks Fasilitas (P)</p>
              <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900">
                {formatPercent(question.facilityIndex)}
              </p>
              <DifficultyIndicator level={question.difficultyLevel} />
            </div>

            <div>
              <p className="text-xs text-slate-500">Indeks Diskriminasi (D)</p>
              <p
                className={`mt-1 font-mono tabular-nums text-lg font-semibold ${
                  (question.discriminationIndex ?? 0) < 0
                    ? 'text-red-700'
                    : (question.discriminationIndex ?? 0) < 20
                    ? 'text-red-700'
                    : 'text-slate-900'
                }`}
              >
                {formatPercent(question.discriminationIndex)}
              </p>
              <DiscriminationIndicator level={question.discriminationLevel} />
            </div>

            <div>
              <p className="text-xs text-slate-500">Efisiensi Diskriminatif</p>
              <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900">
                {formatPercent(question.discriminativeEfficiency)}
              </p>
              <span className="text-xs text-slate-500">Proporsi daya beda optimal</span>
            </div>

            <div>
              <p className="text-xs text-slate-500">Standar Deviasi</p>
              <p className="mt-1 font-mono tabular-nums text-base font-medium text-slate-900">
                {formatPercent(question.standardDeviation)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Bobot Diinginkan / Efektif</p>
              <p className="mt-1 font-mono tabular-nums text-base font-medium text-slate-900">
                {formatPercent(question.intendedWeight, 1)}{' '}
                <span className="text-slate-400">/</span>{' '}
                {formatPercent(question.effectiveWeight)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Skor Tebakan Acak</p>
              <p className="mt-1 font-mono tabular-nums text-base font-medium text-slate-900">
                {formatPercent(question.randomGuessScore)}
              </p>
            </div>
          </div>

          {/* Diagnostic Notes & Concrete Improvement Suggestions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Diagnosis & Rekomendasi Guru
            </h3>
            <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
              {question.decisionReasons.map((reason, idx) => (
                <li key={idx} className="leading-relaxed">
                  {reason}
                </li>
              ))}
            </ul>

            {question.improvementSuggestions.length > 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-900">
                  Saran Perbaikan Soal ({question.decision === 'Dibuang' ? 'Prioritas Tinggi' : 'Revisi Terarah'})
                </p>
                <ol className="space-y-2.5 text-sm text-slate-700">
                  {question.improvementSuggestions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="font-mono tabular-nums text-xs font-semibold text-blue-700 mt-0.5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <div>
                        <span className="font-semibold text-slate-900">{item.aspect}: </span>
                        <span>{item.action}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-1">Tindak Lanjut Disarankan</p>
                <p className="leading-relaxed">{question.recommendation}</p>
              </div>
            )}
          </div>

          {/* Distractor Breakdown (for Pilihan Ganda) */}
          {question.responses.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Distribusi Jawaban & Pengecoh
                </h3>
                {question.distractorSummary && (
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {question.distractorSummary.functioningCount}/
                    {question.distractorSummary.totalDistractors} pengecoh berfungsi
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {question.responses.map((opt, idx) => {
                  const barColor = opt.isKey
                    ? 'bg-blue-600'
                    : opt.status === 'Menjebak'
                    ? 'bg-red-600'
                    : opt.status === 'Berfungsi'
                    ? 'bg-slate-400'
                    : 'bg-amber-400';

                  return (
                    <div key={idx} className="p-3.5 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`text-sm leading-snug ${
                            opt.isKey
                              ? 'font-semibold text-slate-900'
                              : opt.isNoResponse
                              ? 'italic text-slate-500'
                              : 'text-slate-700'
                          }`}
                        >
                          {opt.text}
                        </p>
                        <div className="shrink-0 text-right font-mono tabular-nums">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatPercent(opt.frequency)}
                          </span>
                          <span className="block text-xs text-slate-500">{opt.count} siswa</span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-4">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, opt.frequency))}%` }}
                          />
                        </div>
                        <DistractorStatusIndicator status={opt.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            question.category === 'essay' && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800 mb-1">Catatan Soal Esai / Uraian</p>
                Soal bertipe esai tidak memiliki opsi pengecoh. Evaluasi kualitas didasarkan pada
                Indeks Fasilitas (rerata capaian skor), Indeks Diskriminasi (kemampuan membedakan
                siswa berprestasi tinggi dan rendah), serta kesesuaian Bobot Efektif terhadap Bobot
                yang Diinginkan.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
