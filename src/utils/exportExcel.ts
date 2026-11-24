import * as XLSX from 'xlsx';
import { AnalysisReport, ExportOptions, ReportMetadata } from '../types/analysis';
import { formatDecimal, formatPercent, slugifyFileName } from './format';

function autoFitColumns(rows: (string | number | null | undefined)[][], maxCap = 52): XLSX.ColInfo[] {
  const colWidths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, idx) => {
      const len = String(cell ?? '').length;
      colWidths[idx] = Math.max(colWidths[idx] || 10, Math.min(len + 3, maxCap));
    });
  }
  return colWidths.map((wch) => ({ wch }));
}

/**
 * Sanitize cells to prevent CSV/Excel formula injection (DDE attacks)
 * Prepends single quote if string cell begins with =, +, -, @, tab, or carriage return.
 */
function safeAoaToSheet(rows: (string | number | null | undefined)[][]): XLSX.WorkSheet {
  const sanitized = rows.map((row) =>
    row.map((cell) => {
      if (typeof cell === 'string') {
        const trimmed = cell.trim();
        if (/^[=+\-@\t\r]/.test(trimmed)) {
          return `'${cell}`;
        }
      }
      return cell;
    })
  );
  return XLSX.utils.aoa_to_sheet(sanitized);
}

function buildReportWorkbook(
  report: AnalysisReport,
  metadata: ReportMetadata,
  options: ExportOptions
): { wb: XLSX.WorkBook; fileName: string } {
  const wb = XLSX.utils.book_new();
  const totalQ = report.questions.length;

  // 1. Sheet: Ringkasan Tes
  if (options.includeSummary) {
    const summaryRows: (string | number)[][] = [
      ['LAPORAN ANALISIS BUTIR SOAL (LMS MOODLE)'],
      [metadata.schoolName || 'Satuan Pendidikan'],
      [],
      ['IDENTITAS UJIAN', 'KETERANGAN'],
      ['Nama Kuis', report.summary.quizName],
      ['Nama Kursus / Mata Pelajaran', metadata.subjectName || report.summary.courseName],
      ['Kelas / Program', metadata.className || '—'],
      ['Tahun Ajaran / Semester', `${metadata.academicYear || '—'} (${metadata.semester || '—'})`],
      ['Waktu Pelaksanaan Kuis', report.summary.openDate],
      ['Format Soal', report.examFormatLabel],
      ['Total Butir Soal', `${totalQ} butir (${report.mcSummary.count} Pilihan Ganda, ${report.essaySummary.count} Esai)`],
      ['Guru Pengampu', metadata.teacherName ? `${metadata.teacherName}${metadata.teacherNip ? ` (NIP: ${metadata.teacherNip})` : ''}` : '—'],
      ['Berkas Sumber', report.fileName],
      [],
      ['STATISTIK KESELURUHAN TES (MOODLE)', 'NILAI', 'INTERPRETASI'],
      ['Jumlah Peserta Dinilai (Upaya Pertama)', report.summary.firstAttemptsCount, 'Siswa'],
      ['Total Pengerjaan Selesai', report.summary.totalAttemptsCount, 'Upaya'],
      ['Nilai Rata-rata (Tertinggi)', formatPercent(report.summary.avgHighestAttempt, 1), 'Skor rerata kelas'],
      ['Nilai Median', formatPercent(report.summary.medianHighest, 1), 'Nilai tengah distribusi'],
      ['Simpangan Baku (SD)', formatPercent(report.summary.stdDevHighest, 1), 'Sebaran skor siswa'],
      ['Kemiringan Distribusi (Skewness)', formatDecimal(report.summary.skewness), report.summary.skewness !== null ? (report.summary.skewness < 0 ? 'Condong kiri (banyak skor di atas rata-rata)' : 'Condong kanan (banyak skor di bawah rata-rata)') : '—'],
      ['Kurtosis Distribusi', formatDecimal(report.summary.kurtosis), report.summary.kurtosis !== null ? (report.summary.kurtosis < 0 ? 'Platikurtik (sebaran datar/lebar)' : 'Leptokurtik (sebaran memusat)') : '—'],
      ['Reliabilitas / Konsistensi Internal (CIC)', formatPercent(report.summary.internalConsistency, 1), `${report.reliabilityLabel} — ${report.reliabilityNote}`],
      ['Rasio Kesalahan (Error Ratio)', formatPercent(report.summary.errorRatio, 1), 'Proporsi varians kesalahan acak'],
      ['Kesalahan Standar Pengukuran (SEM)', formatPercent(report.summary.standardError, 1), 'Margin kesalahan skor individu'],
      [],
      ['REKAPITULASI KEPUTUSAN BUTIR SOAL', 'JUMLAH', 'PERSENTASE'],
      ['Diterima (Layak Bank Soal)', report.decisionCounts.Diterima, formatPercent((report.decisionCounts.Diterima / totalQ) * 100, 1)],
      ['Revisi (Perlu Perbaikan)', report.decisionCounts.Revisi, formatPercent((report.decisionCounts.Revisi / totalQ) * 100, 1)],
      ['Dibuang / Ganti (Tidak Layak)', report.decisionCounts.Dibuang, formatPercent((report.decisionCounts.Dibuang / totalQ) * 100, 1)],
      [],
      ['DISTRIBUSI TINGKAT KESUKARAN (P)', 'JUMLAH', 'PERSENTASE'],
      ['Sukar (P < 30%)', report.difficultyCounts.Sukar, formatPercent((report.difficultyCounts.Sukar / totalQ) * 100, 1)],
      ['Sedang (30% ≤ P ≤ 70%)', report.difficultyCounts.Sedang, formatPercent((report.difficultyCounts.Sedang / totalQ) * 100, 1)],
      ['Mudah (P > 70%)', report.difficultyCounts.Mudah, formatPercent((report.difficultyCounts.Mudah / totalQ) * 100, 1)],
      [],
      ['DISTRIBUSI DAYA PEMBEDA (D)', 'JUMLAH', 'PERSENTASE'],
      ['Sangat Baik (D ≥ 40%)', report.discriminationCounts['Sangat Baik'], formatPercent((report.discriminationCounts['Sangat Baik'] / totalQ) * 100, 1)],
      ['Baik (30% ≤ D < 40%)', report.discriminationCounts.Baik, formatPercent((report.discriminationCounts.Baik / totalQ) * 100, 1)],
      ['Cukup (20% ≤ D < 30%)', report.discriminationCounts.Cukup, formatPercent((report.discriminationCounts.Cukup / totalQ) * 100, 1)],
      ['Jelek (0% ≤ D < 20%)', report.discriminationCounts.Jelek, formatPercent((report.discriminationCounts.Jelek / totalQ) * 100, 1)],
      ['Sangat Jelek / Negatif (D < 0%)', report.discriminationCounts['Sangat Jelek'], formatPercent((report.discriminationCounts['Sangat Jelek'] / totalQ) * 100, 1)],
    ];

    if (options.includeSignature) {
      summaryRows.push(
        [],
        ['', `${metadata.city || 'Kota'}, ${metadata.reportDate}`],
        ['Mengetahui,', 'Guru Mata Pelajaran,'],
        ['Kepala Sekolah', ''],
        [],
        [],
        [metadata.principalName || '_______________________', metadata.teacherName || '_______________________'],
        [
          metadata.principalNip ? `NIP. ${metadata.principalNip}` : 'NIP. —',
          metadata.teacherNip ? `NIP. ${metadata.teacherNip}` : 'NIP. —',
        ]
      );
    }

    const wsSummary = safeAoaToSheet(summaryRows);
    wsSummary['!cols'] = autoFitColumns(summaryRows, 62);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Tes');
  }

  // 2. Sheet: Analisis Butir Soal
  if (options.includeItemTable) {
    const itemHeader = [
      'No (S#)',
      'Jenis Soal',
      'Nama / Indikator Soal',
      'Peserta',
      'Indeks Fasilitas (P)',
      'Tingkat Kesukaran',
      'Standar Deviasi',
      'Skor Tebakan Acak',
      'Bobot Diinginkan',
      'Bobot Efektif',
      'Indeks Diskriminasi (D)',
      'Klasifikasi Daya Pembeda',
      'Efisiensi Diskriminatif',
      'Efektivitas Pengecoh',
      'Keputusan Butir',
      'Rekomendasi Tindak Lanjut',
    ];

    const itemRows = report.questions.map((q) => [
      q.slot,
      q.rawType,
      q.name,
      q.attempts,
      formatPercent(q.facilityIndex),
      q.difficultyLevel,
      formatPercent(q.standardDeviation),
      formatPercent(q.randomGuessScore),
      formatPercent(q.intendedWeight, 1),
      formatPercent(q.effectiveWeight),
      formatPercent(q.discriminationIndex),
      q.discriminationLevel,
      formatPercent(q.discriminativeEfficiency),
      q.distractorSummary
        ? `${q.distractorSummary.qualityLabel} (${q.distractorSummary.functioningCount}/${q.distractorSummary.totalDistractors} berfungsi)`
        : q.category === 'essay'
        ? 'Tidak berlaku (Esai)'
        : 'Data pengecoh tidak tersedia',
      q.decision,
      q.improvementSuggestions.length > 0
        ? q.improvementSuggestions
            .map((s, idx) => `${idx + 1}. [${s.aspect}] ${s.action}`)
            .join(' | ')
        : q.recommendation,
    ]);

    const aoa = [itemHeader, ...itemRows];
    const wsItems = safeAoaToSheet(aoa);
    wsItems['!cols'] = autoFitColumns(aoa, 58);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Analisis Butir Soal');

    // Dedicated Sheet: Saran Perbaikan (for Revisi & Dibuang items)
    if (report.priorityItems.length > 0) {
      const fixHeader = [
        'No (S#)',
        'Status',
        'Jenis Soal',
        'Nama / Indikator Soal',
        'Fasilitas (P)',
        'Diskriminasi (D)',
        'Aspek Perbaikan',
        'Saran Perbaikan Konkret',
      ];
      const fixRows: (string | number)[][] = [];
      report.priorityItems.forEach((q) => {
        q.improvementSuggestions.forEach((s, idx) => {
          fixRows.push([
            idx === 0 ? q.slot : '',
            idx === 0 ? q.decision : '',
            idx === 0 ? q.rawType : '',
            idx === 0 ? q.name : '',
            idx === 0 ? formatPercent(q.facilityIndex) : '',
            idx === 0 ? formatPercent(q.discriminationIndex) : '',
            s.aspect,
            s.action,
          ]);
        });
      });

      const fixAoa = [fixHeader, ...fixRows];
      const wsFix = safeAoaToSheet(fixAoa);
      wsFix['!cols'] = autoFitColumns(fixAoa, 66);
      XLSX.utils.book_append_sheet(wb, wsFix, 'Saran Perbaikan');
    }
  }

  // 3. Sheet: Perbandingan PG & Esai (only when mixed)
  if (options.includeComparison && report.examFormat === 'mixed') {
    const compRows: (string | number)[][] = [
      ['PERBANDINGAN KOMPOSISI PILIHAN GANDA DAN ESAI'],
      [],
      ['Indikator Evaluasi', 'Pilihan Ganda', 'Esai / Uraian', 'Keseluruhan'],
      ['Jumlah Butir Soal', report.mcSummary.count, report.essaySummary.count, totalQ],
      ['Rata-rata Indeks Fasilitas (Kesukaran)', formatPercent(report.mcSummary.avgFacility), formatPercent(report.essaySummary.avgFacility), formatPercent(report.summary.avgHighestAttempt, 1)],
      ['Rata-rata Indeks Diskriminasi (Daya Pembeda)', formatPercent(report.mcSummary.avgDiscrimination), formatPercent(report.essaySummary.avgDiscrimination), '—'],
      ['Rata-rata Efisiensi Diskriminatif', formatPercent(report.mcSummary.avgEfficiency), formatPercent(report.essaySummary.avgEfficiency), '—'],
      ['Total Bobot yang Diinginkan', formatPercent(report.mcSummary.totalIntendedWeight, 1), formatPercent(report.essaySummary.totalIntendedWeight, 1), formatPercent(report.mcSummary.totalIntendedWeight + report.essaySummary.totalIntendedWeight, 1)],
      ['Total Bobot Efektif Aktual', formatPercent(report.mcSummary.totalEffectiveWeight, 2), formatPercent(report.essaySummary.totalEffectiveWeight, 2), formatPercent(report.mcSummary.totalEffectiveWeight + report.essaySummary.totalEffectiveWeight, 2)],
      ['Butir Diterima', report.mcSummary.acceptedCount, report.essaySummary.acceptedCount, report.decisionCounts.Diterima],
      ['Butir Revisi', report.mcSummary.reviseCount, report.essaySummary.reviseCount, report.decisionCounts.Revisi],
      ['Butir Dibuang / Ganti', report.mcSummary.rejectCount, report.essaySummary.rejectCount, report.decisionCounts.Dibuang],
    ];

    const wsComp = safeAoaToSheet(compRows);
    wsComp['!cols'] = autoFitColumns(compRows, 44);
    XLSX.utils.book_append_sheet(wb, wsComp, 'Komposisi PG & Esai');
  }

  // 4. Sheet: Analisis Pengecoh PG
  if (options.includeDistractors && report.hasDistractorData) {
    const distHeader = [
      'No (S#)',
      'Nama Soal',
      'Opsi / Model Jawaban',
      'Kredit Sebagian',
      'Jumlah Pemilih',
      'Frekuensi (%)',
      'Status Opsi / Pengecoh',
    ];
    const distRows: (string | number)[][] = [];

    report.questions
      .filter((q) => q.responses.length > 0)
      .forEach((q) => {
        q.responses.forEach((opt, idx) => {
          distRows.push([
            idx === 0 ? q.slot : '',
            idx === 0 ? q.name : '',
            opt.text,
            formatPercent(opt.partialCredit, 0),
            opt.count,
            formatPercent(opt.frequency),
            opt.status,
          ]);
        });
      });

    const aoa = [distHeader, ...distRows];
    const wsDist = safeAoaToSheet(aoa);
    wsDist['!cols'] = autoFitColumns(aoa, 54);
    XLSX.utils.book_append_sheet(wb, wsDist, 'Analisis Pengecoh PG');
  }

  // 5. Sheet: Pedoman Kriteria
  if (options.includeCriteria) {
    const criteriaRows = [
      ['PEDOMAN KRITERIA ANALISIS BUTIR SOAL (STANDAR EVALUASI PENDIDIKAN & MOODLE)'],
      [],
      ['Aspek', 'Rentang Nilai', 'Klasifikasi', 'Tindak Lanjut'],
      ['Tingkat Kesukaran (Index Fasilitas / P)', 'P < 30%', 'Sukar', 'Periksa apakah materi terlalu kompleks atau redaksi sulit dipahami'],
      ['Tingkat Kesukaran (Index Fasilitas / P)', '30% ≤ P ≤ 70%', 'Sedang (Ideal)', 'Proporsional; sangat baik untuk instrumen penilaian'],
      ['Tingkat Kesukaran (Index Fasilitas / P)', 'P > 70%', 'Mudah', 'Jika > 85%, pertimbangkan menaikkan tingkat kognitif soal'],
      ['Daya Pembeda (Indeks Diskriminasi / D)', 'D ≥ 40%', 'Sangat Baik', 'Layak masuk bank soal'],
      ['Daya Pembeda (Indeks Diskriminasi / D)', '30% ≤ D < 40%', 'Baik', 'Layak masuk bank soal'],
      ['Daya Pembeda (Indeks Diskriminasi / D)', '20% ≤ D < 30%', 'Cukup', 'Perlu revisi pokok soal atau pengecoh'],
      ['Daya Pembeda (Indeks Diskriminasi / D)', '0% ≤ D < 20%', 'Jelek', 'Dibuang atau dirombak total'],
      ['Daya Pembeda (Indeks Diskriminasi / D)', 'D < 0%', 'Sangat Jelek (Negatif)', 'Wajib cek kunci jawaban; segera buang atau ganti'],
      ['Efektivitas Pengecoh (Khusus PG)', 'Frekuensi ≥ 5% (≤ Kunci)', 'Berfungsi', 'Pengecoh bekerja baik'],
      ['Efektivitas Pengecoh (Khusus PG)', 'Frekuensi < 5%', 'Tidak Berfungsi', 'Ganti opsi pengecoh agar lebih plausibel'],
      ['Efektivitas Pengecoh (Khusus PG)', 'Frekuensi > Kunci Jawaban', 'Menjebak / Dominan', 'Periksa miskonsepsi materi atau kebenaran kunci jawaban'],
      ['Reliabilitas (Konsistensi Internal / CIC)', '≥ 80%', 'Sangat Tinggi', 'Instrumen sangat andal'],
      ['Reliabilitas (Konsistensi Internal / CIC)', '65% – 79%', 'Tinggi (Baik)', 'Instrumen memadai untuk ujian sumatif'],
      ['Reliabilitas (Konsistensi Internal / CIC)', '50% – 64%', 'Cukup', 'Perbaiki butir berdiskriminasi rendah'],
      ['Reliabilitas (Konsistensi Internal / CIC)', '< 50%', 'Rendah', 'Evaluasi menyeluruh terhadap instrumen tes'],
    ];

    const wsCrit = safeAoaToSheet(criteriaRows);
    wsCrit['!cols'] = autoFitColumns(criteriaRows, 54);
    XLSX.utils.book_append_sheet(wb, wsCrit, 'Pedoman Kriteria');
  }

  // Fallback if user unchecked everything
  if (wb.SheetNames.length === 0) {
    const ws = safeAoaToSheet([['Tidak ada bagian laporan yang dipilih.']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  }

  const fileSlug = slugifyFileName(report.summary.quizName);
  return { wb, fileName: `Analisis_Butir_Soal_${fileSlug}.xlsx` };
}

export function exportReportToExcel(
  report: AnalysisReport,
  metadata: ReportMetadata,
  options: ExportOptions
): void {
  const { wb, fileName } = buildReportWorkbook(report, metadata, options);
  XLSX.writeFile(wb, fileName);
}

export function exportReportToExcelBuffer(
  report: AnalysisReport,
  metadata: ReportMetadata,
  options: ExportOptions
): { buffer: ArrayBuffer; fileName: string } {
  const { wb, fileName } = buildReportWorkbook(report, metadata, options);
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return { buffer, fileName };
}
