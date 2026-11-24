import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalysisReport, AnalyzedQuestion } from '../types/analysis';
import { formatPercent } from '../utils/format';
import { DecisionIndicator } from './StatusText';

interface CompositionSectionProps {
  report: AnalysisReport;
  onSelectQuestion: (q: AnalyzedQuestion) => void;
}

export function CompositionSection({ report, onSelectQuestion }: CompositionSectionProps) {
  const isMixed = report.examFormat === 'mixed';
  const essayQuestions = report.questions.filter((q) => q.category === 'essay');

  const weightCompareData = [
    {
      name: 'Pilihan Ganda',
      'Bobot Diinginkan': report.mcSummary.totalIntendedWeight,
      'Bobot Efektif': report.mcSummary.totalEffectiveWeight,
    },
    ...(report.essaySummary.count > 0
      ? [
          {
            name: 'Esai / Uraian',
            'Bobot Diinginkan': report.essaySummary.totalIntendedWeight,
            'Bobot Efektif': report.essaySummary.totalEffectiveWeight,
          },
        ]
      : []),
  ];

  const perItemWeightData = report.questions.map((q) => ({
    slot: `S#${q.slot}`,
    'Bobot Diinginkan': q.intendedWeight ?? 0,
    'Bobot Efektif': q.effectiveWeight ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isMixed
            ? 'Komposisi & Perbandingan Pilihan Ganda vs Esai'
            : 'Profil Bobot & Keseimbangan Instrumen Tes'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-3xl">
          {isMixed
            ? 'Analisis perbandingan kualitas psikometrik serta keseimbangan bobot antara butir Pilihan Ganda dan butir Esai pada ujian gabungan.'
            : 'Evaluasi kontribusi bobot efektif tiap butir terhadap varians skor akhir siswa pada ujian objektif penuh.'}
        </p>
      </div>

      {isMixed ? (
        <>
          {/* Comparison Table & Weight Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Ringkasan Perbandingan Metrik
                </h2>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-5">Indikator Psikometrik</th>
                      <th className="py-3 px-5 text-right">Pilihan Ganda</th>
                      <th className="py-3 px-5 text-right">Esai / Uraian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    <tr>
                      <td className="py-3 px-5 text-slate-700">Jumlah Butir Soal</td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {report.mcSummary.count} butir
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {report.essaySummary.count} butir
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-slate-700">Rata-rata Indeks Fasilitas (P)</td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-900">
                        {formatPercent(report.mcSummary.avgFacility)}
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-900">
                        {formatPercent(report.essaySummary.avgFacility)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-slate-700">Rata-rata Indeks Diskriminasi (D)</td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatPercent(report.mcSummary.avgDiscrimination)}
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {formatPercent(report.essaySummary.avgDiscrimination)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-slate-700">Rata-rata Efisiensi Diskriminatif</td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-900">
                        {formatPercent(report.mcSummary.avgEfficiency)}
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-900">
                        {formatPercent(report.essaySummary.avgEfficiency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-slate-700">Total Bobot yang Diinginkan</td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-900">
                        {formatPercent(report.mcSummary.totalIntendedWeight, 1)}
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-900">
                        {formatPercent(report.essaySummary.totalIntendedWeight, 1)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-slate-700">Total Bobot Efektif Aktual</td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-blue-700">
                        {formatPercent(report.mcSummary.totalEffectiveWeight, 2)}
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {formatPercent(report.essaySummary.totalEffectiveWeight, 2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-slate-700">Keputusan (Diterima / Revisi / Dibuang)</td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-xs">
                        <span className="text-emerald-700 font-semibold">{report.mcSummary.acceptedCount}</span>
                        {' / '}
                        <span className="text-amber-700 font-semibold">{report.mcSummary.reviseCount}</span>
                        {' / '}
                        <span className="text-red-700 font-semibold">{report.mcSummary.rejectCount}</span>
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-xs">
                        <span className="text-emerald-700 font-semibold">{report.essaySummary.acceptedCount}</span>
                        {' / '}
                        <span className="text-amber-700 font-semibold">{report.essaySummary.reviseCount}</span>
                        {' / '}
                        <span className="text-red-700 font-semibold">{report.essaySummary.rejectCount}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Bobot Diinginkan vs Bobot Efektif (%)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bobot efektif menunjukkan seberapa besar kontribusi aktual kelompok soal terhadap
                  varians nilai akhir siswa.
                </p>
              </div>

              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weightCompareData} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155' }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      formatter={(val) =>
                        formatPercent(typeof val === 'number' ? val : Number(val ?? 0), 2)
                      }
                      contentStyle={{
                        fontSize: '12px',
                        borderRadius: '8px',
                        borderColor: '#E2E8F0',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Bobot Diinginkan" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Bobot Efektif" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                {report.essaySummary.totalEffectiveWeight <
                report.essaySummary.totalIntendedWeight - 10
                  ? `Catatan: Kontribusi efektif Esai (${formatPercent(
                      report.essaySummary.totalEffectiveWeight,
                      1
                    )}) lebih rendah dibanding bobot rencana (${formatPercent(
                      report.essaySummary.totalIntendedWeight,
                      1
                    )}). Hal ini lazim terjadi saat rentang skor rubrik esai siswa lebih sempit (simpangan baku lebih kecil) dibanding soal pilihan ganda.`
                  : 'Distribusi bobot efektif antara Pilihan Ganda dan Esai relatif seimbang terhadap bobot yang dirancang di Moodle.'}
              </p>
            </div>
          </div>

          {/* Dedicated Essay Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Rincian Butir Soal Esai / Uraian ({essayQuestions.length} Butir)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik baris untuk melihat diagnosis kualitas rubrik dan diskriminasi soal esai.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4 w-14">S#</th>
                    <th className="py-2.5 px-4">Nama / Topik Esai</th>
                    <th className="py-2.5 px-4 text-right w-28">Fasilitas (P)</th>
                    <th className="py-2.5 px-4 text-right w-28">Standar Dev.</th>
                    <th className="py-2.5 px-4 text-right w-32">Bobot Diing./Efek.</th>
                    <th className="py-2.5 px-4 text-right w-28">Diskrim. (D)</th>
                    <th className="py-2.5 px-4 text-right w-24">Efisiensi</th>
                    <th className="py-2.5 px-4 w-28">Keputusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {essayQuestions.map((q) => (
                    <tr
                      key={q.slot}
                      onClick={() => onSelectQuestion(q)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-xs font-semibold text-slate-700">
                        {q.slot}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{q.name}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800">
                        {formatPercent(q.facilityIndex)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                        {formatPercent(q.standardDeviation)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                        {formatPercent(q.intendedWeight, 0)} / {formatPercent(q.effectiveWeight)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-emerald-700">
                        {formatPercent(q.discriminationIndex)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                        {formatPercent(q.discriminativeEfficiency)}
                      </td>
                      <td className="py-3 px-4">
                        <DecisionIndicator decision={q.decision} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Full Pilihan Ganda (or Full Essay) Weight & Balance Profile */
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Sebaran Bobot Efektif vs Bobot Diinginkan per Butir
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pada ujian {report.examFormatLabel}, butir dengan daya pembeda tinggi menyumbang
                bobot efektif lebih besar terhadap peringkat skor akhir siswa.
              </p>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-600">
              Total Bobot Efektif: {formatPercent(report.mcSummary.totalEffectiveWeight + report.essaySummary.totalEffectiveWeight, 1)}
            </div>
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={perItemWeightData}
                margin={{ top: 10, right: 16, left: -8, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="slot"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  interval={Math.max(0, Math.floor(perItemWeightData.length / 20))}
                />
                <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(val) =>
                    formatPercent(typeof val === 'number' ? val : Number(val ?? 0), 2)
                  }
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    borderColor: '#E2E8F0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Bobot Diinginkan" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Bobot Efektif" fill="#1D4ED8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
