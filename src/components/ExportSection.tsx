import { useRef, useState } from 'react';
import { Archive, FileSpreadsheet, FileText, ImagePlus, Trash2 } from 'lucide-react';
import { AnalysisReport, ExportOptions, ReportMetadata } from '../types/analysis';
import { readLogoFileAsDataUrl } from '../utils/logoHelper';

interface ExportSectionProps {
  report: AnalysisReport;
  reportsCount: number;
  metadata: ReportMetadata;
  options: ExportOptions;
  onChangeMetadata: (next: ReportMetadata) => void;
  onChangeOptions: (next: ExportOptions) => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onExportBatchZip: () => void;
  isExportingZip?: boolean;
}

export function ExportSection({
  report,
  reportsCount,
  metadata,
  options,
  onChangeMetadata,
  onChangeOptions,
  onExportPdf,
  onExportExcel,
  onExportBatchZip,
  isExportingZip = false,
}: ExportSectionProps) {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const updateField = (key: keyof ReportMetadata, value: string) => {
    onChangeMetadata({ ...metadata, [key]: value });
  };

  const handleLogoChange = async (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    try {
      const dataUrl = await readLogoFileAsDataUrl(file);
      updateField('schoolLogo', dataUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Gagal memuat logo.');
    }
  };

  const toggleOption = (key: keyof ExportOptions) => {
    onChangeOptions({ ...options, [key]: !options[key] });
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Ekspor Laporan Otomatis (PDF & Excel)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Lengkapi identitas satuan pendidikan dan guru di bawah ini untuk dicantumkan secara
          otomatis pada kop laporan dan lembar pengesahan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Institutional Report Identity Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-900 pb-4 border-b border-slate-100">
            Identitas Dokumen Laporan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="schoolName" className="block text-xs font-medium text-slate-700 mb-1">
                Nama Sekolah / Madrasah / Institusi
              </label>
              <input
                id="schoolName"
                type="text"
                value={metadata.schoolName}
                onChange={(e) => updateField('schoolName', e.target.value)}
                placeholder="Contoh: SMA Negeri 1 Nusantara"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                {metadata.schoolLogo ? (
                  <img
                    src={metadata.schoolLogo}
                    alt="Logo Sekolah"
                    className="w-10 h-10 object-contain rounded border border-slate-200 bg-white p-0.5"
                  />
                ) : (
                  <div className="w-10 h-10 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400">
                    <ImagePlus className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-700">Logo Sekolah (Kop PDF)</p>
                  <p className="text-[11px] text-slate-500">PNG/JPG maks 2 MB</p>
                  {logoError && <p className="text-[11px] text-red-600 mt-0.5">{logoError}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    void handleLogoChange(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {metadata.schoolLogo ? 'Ganti Logo' : 'Unggah Logo'}
                </button>
                {metadata.schoolLogo && (
                  <button
                    type="button"
                    onClick={() => updateField('schoolLogo', '')}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Hapus logo"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="subjectName" className="block text-xs font-medium text-slate-700 mb-1">
                Mata Pelajaran
              </label>
              <input
                id="subjectName"
                type="text"
                value={metadata.subjectName}
                onChange={(e) => updateField('subjectName', e.target.value)}
                placeholder="Contoh: Bahasa Inggris Khas"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="className" className="block text-xs font-medium text-slate-700 mb-1">
                Kelas / Fase
              </label>
              <input
                id="className"
                type="text"
                value={metadata.className}
                onChange={(e) => updateField('className', e.target.value)}
                placeholder="Contoh: X-A / Fase E"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="academicYear" className="block text-xs font-medium text-slate-700 mb-1">
                Tahun Ajaran
              </label>
              <input
                id="academicYear"
                type="text"
                value={metadata.academicYear}
                onChange={(e) => updateField('academicYear', e.target.value)}
                placeholder="2026/2027"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="semester" className="block text-xs font-medium text-slate-700 mb-1">
                Semester
              </label>
              <select
                id="semester"
                value={metadata.semester}
                onChange={(e) => updateField('semester', e.target.value)}
                className={inputClass}
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>

            <div>
              <label htmlFor="teacherName" className="block text-xs font-medium text-slate-700 mb-1">
                Nama Guru Mata Pelajaran
              </label>
              <input
                id="teacherName"
                type="text"
                value={metadata.teacherName}
                onChange={(e) => updateField('teacherName', e.target.value)}
                placeholder="Contoh: Budi Santoso, S.Pd."
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="teacherNip" className="block text-xs font-medium text-slate-700 mb-1">
                NIP / NUPTK Guru (Opsional)
              </label>
              <input
                id="teacherNip"
                type="text"
                value={metadata.teacherNip}
                onChange={(e) => updateField('teacherNip', e.target.value)}
                placeholder="19850101 201001 1 001"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="principalName" className="block text-xs font-medium text-slate-700 mb-1">
                Nama Kepala Sekolah (Opsional)
              </label>
              <input
                id="principalName"
                type="text"
                value={metadata.principalName}
                onChange={(e) => updateField('principalName', e.target.value)}
                placeholder="Contoh: Dra. Siti Rahmawati, M.Pd."
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="principalNip" className="block text-xs font-medium text-slate-700 mb-1">
                NIP Kepala Sekolah (Opsional)
              </label>
              <input
                id="principalNip"
                type="text"
                value={metadata.principalNip}
                onChange={(e) => updateField('principalNip', e.target.value)}
                placeholder="19720512 199802 2 003"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-medium text-slate-700 mb-1">
                Kota / Kabupaten
              </label>
              <input
                id="city"
                type="text"
                value={metadata.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Contoh: Bandung"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="reportDate" className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Laporan
              </label>
              <input
                id="reportDate"
                type="text"
                value={metadata.reportDate}
                onChange={(e) => updateField('reportDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Right: Content Checklist & Download Actions */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 pb-4 border-b border-slate-100">
              Bagian yang Disertakan
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeSummary}
                  onChange={() => toggleOption('includeSummary')}
                  className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>
                  <strong className="font-medium text-slate-900 block">
                    Ringkasan Statistik Tes & Reliabilitas
                  </strong>
                  <span className="text-xs text-slate-500">
                    Rata-rata, median, simpangan baku, CIC, dan rekap keputusan butir.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeItemTable}
                  onChange={() => toggleOption('includeItemTable')}
                  className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>
                  <strong className="font-medium text-slate-900 block">
                    Tabel Lengkap Analisis Butir Soal ({report.questions.length} butir)
                  </strong>
                  <span className="text-xs text-slate-500">
                    Seluruh metrik Moodle, klasifikasi kesukaran/daya beda, dan rekomendasi.
                  </span>
                </span>
              </label>

              {report.examFormat === 'mixed' && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeComparison}
                    onChange={() => toggleOption('includeComparison')}
                    className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>
                    <strong className="font-medium text-slate-900 block">
                      Perbandingan Pilihan Ganda & Esai
                    </strong>
                    <span className="text-xs text-slate-500">
                      Ringkasan komposisi, rerata diskriminasi, dan bobot efektif vs diinginkan.
                    </span>
                  </span>
                </label>
              )}

              {report.hasDistractorData && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeDistractors}
                    onChange={() => toggleOption('includeDistractors')}
                    className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>
                    <strong className="font-medium text-slate-900 block">
                      Lampiran Analisis Pengecoh Pilihan Ganda
                    </strong>
                    <span className="text-xs text-slate-500">
                      Rincian opsi jawaban, frekuensi pemilih, dan status efektivitas pengecoh.
                    </span>
                  </span>
                </label>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeCriteria}
                  onChange={() => toggleOption('includeCriteria')}
                  className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>
                  <strong className="font-medium text-slate-900 block">
                    Pedoman Kriteria Interpretasi
                  </strong>
                  <span className="text-xs text-slate-500">
                    Tabel referensi ambang batas tingkat kesukaran, daya pembeda, dan pengecoh.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeSignature}
                  onChange={() => toggleOption('includeSignature')}
                  className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>
                  <strong className="font-medium text-slate-900 block">
                    Lembar Pengesahan / Tanda Tangan
                  </strong>
                  <span className="text-xs text-slate-500">
                    Blok tanda tangan Kepala Sekolah dan Guru Mata Pelajaran siap cetak.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Primary Download Buttons */}
          <div className="pt-5 border-t border-slate-100 space-y-3">
            <button
              type="button"
              onClick={onExportPdf}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>Unduh Laporan PDF (A4 Lanskap)</span>
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Unduh Workbook Excel (.xlsx)</span>
            </button>

            {reportsCount > 1 && (
              <button
                type="button"
                disabled={isExportingZip}
                onClick={onExportBatchZip}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Archive className="w-4 h-4" aria-hidden="true" />
                <span>
                  {isExportingZip
                    ? 'Membuat Arsip ZIP...'
                    : `Ekspor Semua Kelas (${reportsCount} Kelas · .zip)`}
                </span>
              </button>
            )}

            <p className="text-xs text-slate-500 text-center pt-1">
              Seluruh proses konversi berjalan langsung di peramban tanpa mengirim data siswa ke
              server eksternal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
