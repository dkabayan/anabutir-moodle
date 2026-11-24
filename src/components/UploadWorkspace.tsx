import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Upload,
} from 'lucide-react';
import { ReportMetadata } from '../types/analysis';

interface UploadWorkspaceProps {
  onFilesSelected: (files: FileList) => Promise<void>;
  onLoadSampleMixed: () => Promise<void>;
  onLoadSampleFullMc: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  metadata: ReportMetadata;
  onChangeMetadata: (next: ReportMetadata) => void;
}

export function UploadWorkspace({
  onFilesSelected,
  onLoadSampleMixed,
  onLoadSampleFullMc,
  isLoading,
  errorMessage,
  metadata,
  onChangeMetadata,
}: UploadWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateField = (key: keyof ReportMetadata, value: string) => {
    onChangeMetadata({ ...metadata, [key]: value });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await onFilesSelected(files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFiles(e.dataTransfer.files);
  };

  return (
    <main className="max-w-[1280px] mx-auto px-6 py-10 lg:py-14">
      {/* Intro Heading */}
      <div className="max-w-3xl mb-8">
        <p className="text-xs font-medium text-slate-500 mb-2">
          Evaluasi Pembelajaran · LMS Moodle · Ekspor PDF & Excel
        </p>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
          Analisis Butir Soal Ujian Moodle SMA Plus Muthahhari
        </h1>
        <p className="mt-3 text-[15px] text-slate-600 leading-relaxed max-w-2xl">
          Unggah berkas statistik lengkap hasil ujian dari LMS Moodle untuk menganalisis tingkat
          kesukaran, daya pembeda, efektivitas pengecoh, dan proporsi bobot secara instan—mendukung
          soal pilihan ganda penuh maupun gabungan pilihan ganda dan esai.
        </p>
      </div>

      {/* Institutional Document Identity Inputs for PDF Export */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Identitas Dokumen & Pengesahan Laporan (PDF)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Isi data di bawah ini untuk dicantumkan otomatis pada kop dan lembar tanda tangan laporan PDF.
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60 w-fit">
            Otomatis terhubung ke Ekspor PDF
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="upload-subject" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mata Pelajaran
            </label>
            <input
              id="upload-subject"
              type="text"
              value={metadata.subjectName}
              onChange={(e) => updateField('subjectName', e.target.value)}
              placeholder="Contoh: Bahasa Inggris Khas"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="upload-class" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kelas / Fase
            </label>
            <input
              id="upload-class"
              type="text"
              value={metadata.className}
              onChange={(e) => updateField('className', e.target.value)}
              placeholder="Contoh: X-A / Fase E"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="upload-city" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kota
            </label>
            <input
              id="upload-city"
              type="text"
              value={metadata.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Contoh: Bandung"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="upload-teacher" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Guru
            </label>
            <input
              id="upload-teacher"
              type="text"
              value={metadata.teacherName}
              onChange={(e) => updateField('teacherName', e.target.value)}
              placeholder="Contoh: Budi Santoso, S.Pd."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="upload-principal" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kepala Sekolah
            </label>
            <input
              id="upload-principal"
              type="text"
              value={metadata.principalName}
              onChange={(e) => updateField('principalName', e.target.value)}
              placeholder="Contoh: Dr. H. Ahmad Dahlan, M.Pd."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main 2-Column Balanced Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Upload Dropzone */}
        <div className="lg:col-span-7 flex flex-col">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex-1 flex flex-col justify-between bg-white border rounded-xl p-8 transition-colors ${
              isDragging
                ? 'border-blue-600 bg-blue-50/40'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">
                  Unggah Berkas Statistik Moodle
                </h2>
                <span className="text-xs font-mono text-slate-500">CSV · XLSX · XLS</span>
              </div>

              <div className="py-10 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-lg bg-slate-100 text-blue-700 flex items-center justify-center mb-4">
                  <Upload className="w-5 h-5" aria-hidden="true" />
                </div>
                <p className="text-base font-semibold text-slate-900">
                  Tarik dan letakkan berkas statistik ujian di sini
                </p>
                <p className="mt-1.5 text-sm text-slate-500 max-w-md">
                  Gunakan berkas unduhan <span className="font-mono text-slate-700">completestats.csv</span> atau{' '}
                  <span className="font-mono text-slate-700">.xlsx</span> dari menu Statistik Kuis Moodle
                  (Bahasa Indonesia maupun Bahasa Inggris).
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.ods"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => inputRef.current?.click()}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    {isLoading ? 'Memproses Berkas...' : 'Pilih Berkas dari Komputer'}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-2 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Gagal membaca berkas</p>
                    <p className="mt-0.5 text-red-700">{errorMessage}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Sample Datasets */}
            <div className="pt-6 mt-6 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-3">
                Atau coba langsung dengan contoh data ujian Moodle:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void onLoadSampleMixed()}
                  className="flex-1 px-4 py-2.5 text-left text-xs font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="block font-semibold text-slate-900">
                    Contoh Gabungan (40 PG + 5 Esai)
                  </span>
                  <span className="block mt-0.5 text-slate-500">
                    ASTS I 2026/2027 · Inggris Khas Kelas X (24 siswa)
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void onLoadSampleFullMc()}
                  className="flex-1 px-4 py-2.5 text-left text-xs font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="block font-semibold text-slate-900">
                    Contoh Full Pilihan Ganda (40 PG)
                  </span>
                  <span className="block mt-0.5 text-slate-500">
                    Simulasi ujian objektif murni dengan analisis pengecoh
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Step-by-step Moodle Guide & Capabilities */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 pb-5 border-b border-slate-100">
                Panduan Ekspor Berkas dari LMS Moodle
              </h2>

              <ol className="mt-5 space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-blue-700 mt-0.5 w-5 shrink-0">
                    01.
                  </span>
                  <span>
                    Buka aktivitas <strong className="font-semibold text-slate-900">Kuis (Quiz)</strong> pada
                    kursus Moodle Anda setelah seluruh siswa selesai mengerjakan dan soal esai (jika ada) selesai dinilai.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-blue-700 mt-0.5 w-5 shrink-0">
                    02.
                  </span>
                  <span>
                    Masuk ke menu <strong className="font-semibold text-slate-900">Hasil (Results)</strong> lalu
                    pilih sub-menu <strong className="font-semibold text-slate-900">Statistik (Statistics)</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-blue-700 mt-0.5 w-5 shrink-0">
                    03.
                  </span>
                  <span>
                    Pada bagian <strong className="font-semibold text-slate-900">Unduh laporan lengkap</strong>,
                    pilih format <span className="font-mono text-slate-800">.csv</span> atau{' '}
                    <span className="font-mono text-slate-800">.xlsx</span> lalu klik Unduh.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-blue-700 mt-0.5 w-5 shrink-0">
                    04.
                  </span>
                  <span>
                    Unggah berkas tersebut di panel sebelah kiri. Sistem akan otomatis mendeteksi tipe ujian
                    (Full PG atau Gabungan PG & Esai) dan menyiapkan laporan PDF & Excel.
                  </span>
                </li>
              </ol>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-900">Laporan PDF Resmi</p>
                  <p className="mt-0.5 text-slate-500">
                    Siap cetak A4 lengkap dengan kop sekolah & lembar pengesahan.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-900">Workbook Excel</p>
                  <p className="mt-0.5 text-slate-500">
                    Multi-sheet terstruktur untuk arsip nilai & revisi bank soal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 4-Column Metric Preview / Capability Strip */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-slate-200">
        <div>
          <p className="text-sm font-semibold text-slate-900">Tingkat Kesukaran (P)</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Klasifikasi otomatis Sukar (&lt;30%), Sedang (30–70%), dan Mudah (&gt;70%) berdasarkan Indeks Fasilitas Moodle.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Daya Pembeda (D)</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Deteksi butir soal dengan diskriminasi rendah atau negatif yang berpotensi memiliki kunci salah atau ambigu.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Analisis Pengecoh PG</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Evaluasi sebaran pilihan siswa pada setiap opsi jawaban untuk menemukan pengecoh pasif (&lt;5%) maupun menjebak.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Bobot PG vs Esai</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Membandingkan bobot yang diinginkan terhadap bobot efektif aktual untuk memastikan keseimbangan penilaian gabungan.
          </p>
        </div>
      </div>
    </main>
  );
}
