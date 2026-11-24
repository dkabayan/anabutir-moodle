import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalysisReport, ExportOptions, ReportMetadata } from '../types/analysis';
import { formatDecimal, formatPercent, slugifyFileName } from './format';

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const NAVY: [number, number, number] = [15, 23, 42];
const BLUE: [number, number, number] = [29, 78, 216];
const SLATE_TEXT: [number, number, number] = [51, 65, 85];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const BORDER_GRAY: [number, number, number] = [226, 232, 240];
const LIGHT_BG: [number, number, number] = [248, 250, 252];

const EMERALD_TEXT: [number, number, number] = [4, 120, 87];
const AMBER_TEXT: [number, number, number] = [180, 83, 9];
const CRIMSON_TEXT: [number, number, number] = [185, 28, 28];

export function exportReportToPdf(
  report: AnalysisReport,
  metadata: ReportMetadata,
  options: ExportOptions
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  }) as JsPdfWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const totalQ = report.questions.length;

  let cursorY = 14;

  // Institutional Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text((metadata.schoolName || 'LAPORAN EVALUASI PEMBELAJARAN').toUpperCase(), marginX, cursorY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(`Format: ${report.examFormatLabel}`, pageWidth - marginX, cursorY, { align: 'right' });

  cursorY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text('LAPORAN ANALISIS BUTIR SOAL (LMS MOODLE)', marginX, cursorY);

  cursorY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_TEXT);
  const subLine = [
    report.summary.quizName,
    metadata.subjectName || report.summary.courseName,
    metadata.className
      ? /^kelas|^fase/i.test(metadata.className.trim())
        ? metadata.className.trim()
        : `Kelas ${metadata.className.trim()}`
      : null,
    metadata.academicYear ? `TA ${metadata.academicYear}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(subLine, marginX, cursorY);

  cursorY += 4;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 6;

  // Section 1: Ringkasan Tes
  if (options.includeSummary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text('1. Ringkasan Statistik Ujian & Keputusan Butir', marginX, cursorY);
    cursorY += 3;

    const leftColWidth = (pageWidth - marginX * 2 - 8) * 0.56;
    const rightColX = marginX + leftColWidth + 8;

    const startY = cursorY;

    autoTable(doc, {
      startY,
      margin: { left: marginX, right: pageWidth - marginX - leftColWidth },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: SLATE_TEXT,
        lineColor: BORDER_GRAY,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      head: [['Parameter Statistik Tes', 'Nilai', 'Keterangan']],
      body: [
        ['Waktu Kuis & Peserta', `${report.summary.totalAttemptsCount} siswa`, report.summary.openDate],
        ['Nilai Rata-rata / Median', `${formatPercent(report.summary.avgHighestAttempt, 1)} / ${formatPercent(report.summary.medianHighest, 1)}`, `Simpangan Baku: ${formatPercent(report.summary.stdDevHighest, 1)}`],
        ['Konsistensi Internal (CIC)', formatPercent(report.summary.internalConsistency, 1), `Reliabilitas ${report.reliabilityLabel}`],
        ['Kemiringan / Kurtosis', `${formatDecimal(report.summary.skewness)} / ${formatDecimal(report.summary.kurtosis)}`, `Error Ratio: ${formatPercent(report.summary.errorRatio, 1)} · SEM: ${formatPercent(report.summary.standardError, 1)}`],
        ['Guru Pengampu', metadata.teacherName || '—', metadata.teacherNip ? `NIP. ${metadata.teacherNip}` : `Semester ${metadata.semester || '—'}`],
      ],
    });

    const leftEndY = doc.lastAutoTable?.finalY ?? startY + 35;

    autoTable(doc, {
      startY,
      margin: { left: rightColX, right: marginX },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: SLATE_TEXT,
        lineColor: BORDER_GRAY,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
      head: [['Rekapitulasi Kualitas Butir', 'Jumlah', 'Persen']],
      body: [
        ['Diterima (Layak Bank Soal)', String(report.decisionCounts.Diterima), formatPercent((report.decisionCounts.Diterima / totalQ) * 100, 1)],
        ['Revisi (Perlu Perbaikan)', String(report.decisionCounts.Revisi), formatPercent((report.decisionCounts.Revisi / totalQ) * 100, 1)],
        ['Dibuang / Ganti (Tidak Layak)', String(report.decisionCounts.Dibuang), formatPercent((report.decisionCounts.Dibuang / totalQ) * 100, 1)],
        ['Kesukaran: Sukar / Sedang / Mudah', `${report.difficultyCounts.Sukar} / ${report.difficultyCounts.Sedang} / ${report.difficultyCounts.Mudah}`, `${totalQ} butir`],
        ['Komposisi: Pilihan Ganda / Esai', `${report.mcSummary.count} / ${report.essaySummary.count}`, report.examFormat === 'mixed' ? 'Gabungan' : 'Tunggal'],
      ],
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 0) {
          if (data.row.index === 0) data.cell.styles.textColor = EMERALD_TEXT;
          if (data.row.index === 1) data.cell.styles.textColor = AMBER_TEXT;
          if (data.row.index === 2) data.cell.styles.textColor = CRIMSON_TEXT;
        }
      },
    });

    const rightEndY = doc.lastAutoTable?.finalY ?? startY + 35;
    cursorY = Math.max(leftEndY, rightEndY) + 7;
  }

  // Section 2: Komposisi PG & Esai (if mixed)
  if (options.includeComparison && report.examFormat === 'mixed') {
    if (cursorY > pageHeight - 48) {
      doc.addPage();
      cursorY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text('2. Perbandingan Komposisi Pilihan Ganda & Esai', marginX, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: SLATE_TEXT,
        lineColor: BORDER_GRAY,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: LIGHT_BG,
        textColor: NAVY,
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'center' },
      },
      head: [[
        'Kelompok Soal',
        'Jumlah',
        'Rerata Kesukaran (P)',
        'Rerata Diskriminasi (D)',
        'Rerata Efisiensi',
        'Bobot Diinginkan',
        'Bobot Efektif',
        'Diterima / Revisi / Dibuang',
      ]],
      body: [
        [
          'Pilihan Ganda',
          `${report.mcSummary.count} butir`,
          formatPercent(report.mcSummary.avgFacility),
          formatPercent(report.mcSummary.avgDiscrimination),
          formatPercent(report.mcSummary.avgEfficiency),
          formatPercent(report.mcSummary.totalIntendedWeight, 1),
          formatPercent(report.mcSummary.totalEffectiveWeight, 2),
          `${report.mcSummary.acceptedCount} / ${report.mcSummary.reviseCount} / ${report.mcSummary.rejectCount}`,
        ],
        [
          'Esai / Uraian',
          `${report.essaySummary.count} butir`,
          formatPercent(report.essaySummary.avgFacility),
          formatPercent(report.essaySummary.avgDiscrimination),
          formatPercent(report.essaySummary.avgEfficiency),
          formatPercent(report.essaySummary.totalIntendedWeight, 1),
          formatPercent(report.essaySummary.totalEffectiveWeight, 2),
          `${report.essaySummary.acceptedCount} / ${report.essaySummary.reviseCount} / ${report.essaySummary.rejectCount}`,
        ],
      ],
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 25) + 7;
  }

  // Section 3: Tabel Analisis Butir Soal
  if (options.includeItemTable) {
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = 16;
    }

    const secNum = options.includeComparison && report.examFormat === 'mixed' ? '3' : '2';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(`${secNum}. Tabel Lengkap Analisis Butir Soal`, marginX, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: {
        fontSize: 7.4,
        cellPadding: 1.9,
        textColor: SLATE_TEXT,
        lineColor: BORDER_GRAY,
        lineWidth: 0.18,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.4,
      },
      alternateRowStyles: {
        fillColor: [250, 251, 253],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 64 },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 20, halign: 'right' },
        8: { cellWidth: 21, halign: 'center' },
        9: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        10: { cellWidth: 'auto' },
      },
      head: [[
        'S#',
        'Jenis',
        'Nama / Indikator Soal',
        'Fasilitas (P)',
        'Kesukaran',
        'Bobot Diing.',
        'Bobot Efektif',
        'Diskrim. (D)',
        'Daya Pembeda',
        'Keputusan',
        'Catatan Tindak Lanjut',
      ]],
      body: report.questions.map((q) => [
        q.slot,
        q.category === 'mc' ? 'Pilihan Ganda' : q.category === 'essay' ? 'Esai' : q.rawType,
        q.name,
        formatPercent(q.facilityIndex),
        q.difficultyLevel,
        formatPercent(q.intendedWeight, 1),
        formatPercent(q.effectiveWeight),
        formatPercent(q.discriminationIndex),
        q.discriminationLevel,
        q.decision,
        q.improvementSuggestions.length > 0
          ? q.improvementSuggestions.map((s, idx) => `${idx + 1}. ${s.aspect}: ${s.action}`).join('\n')
          : q.recommendation,
      ]),
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 9) {
          const val = String(data.cell.raw);
          if (val === 'Diterima') data.cell.styles.textColor = EMERALD_TEXT;
          else if (val === 'Revisi') data.cell.styles.textColor = AMBER_TEXT;
          else if (val === 'Dibuang') data.cell.styles.textColor = CRIMSON_TEXT;
        }
        if (data.section === 'body' && data.column.index === 7) {
          const rawStr = String(data.cell.raw);
          if (rawStr.startsWith('-')) {
            data.cell.styles.textColor = CRIMSON_TEXT;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 40) + 8;

    // Dedicated PDF Section: Saran Perbaikan Khusus Butir Revisi & Dibuang
    if (report.priorityItems.length > 0) {
      if (cursorY > pageHeight - 48) {
        doc.addPage();
        cursorY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...NAVY);
      doc.text(
        `Daftar Saran Perbaikan Butir Revisi & Dibuang (${report.priorityItems.length} Butir)`,
        marginX,
        cursorY
      );
      cursorY += 3;

      const fixBody: string[][] = [];
      report.priorityItems.forEach((q) => {
        fixBody.push([
          q.slot,
          q.decision,
          q.name,
          `P: ${formatPercent(q.facilityIndex)}\nD: ${formatPercent(q.discriminationIndex)}`,
          q.improvementSuggestions
            .map((s, idx) => `${idx + 1}. ${s.aspect}: ${s.action}`)
            .join('\n'),
        ]);
      });

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        theme: 'grid',
        styles: {
          fontSize: 7.4,
          cellPadding: 2,
          textColor: SLATE_TEXT,
          lineColor: BORDER_GRAY,
          lineWidth: 0.18,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: NAVY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        columnStyles: {
          0: { cellWidth: 11, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 19, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 56 },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 'auto' },
        },
        head: [['S#', 'Status', 'Nama Soal', 'Statistik', 'Langkah Saran Perbaikan']],
        body: fixBody,
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 1) {
            const val = String(data.cell.raw);
            if (val === 'Dibuang') data.cell.styles.textColor = CRIMSON_TEXT;
            else if (val === 'Revisi') data.cell.styles.textColor = AMBER_TEXT;
          }
        },
      });

      cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 40) + 8;
    }
  }

  // Section 4: Lampiran Analisis Pengecoh Pilihan Ganda
  if (options.includeDistractors && report.hasDistractorData) {
    const mcWithResponses = report.questions.filter((q) => q.responses.length > 0);
    if (mcWithResponses.length > 0) {
      doc.addPage();
      cursorY = 16;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...NAVY);
      doc.text('Lampiran: Analisis Pengecoh (Distractor) Pilihan Ganda', marginX, cursorY);
      cursorY += 3;

      const distBody: string[][] = [];
      mcWithResponses.forEach((q) => {
        q.responses.forEach((opt, idx) => {
          if (opt.isNoResponse && opt.count === 0) return; // keep PDF concise when nobody skipped
          distBody.push([
            idx === 0 ? q.slot : '',
            idx === 0 ? q.name : '',
            opt.text,
            opt.isKey ? 'Kunci (100%)' : '0%',
            String(opt.count),
            formatPercent(opt.frequency),
            opt.status,
          ]);
        });
      });

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        theme: 'grid',
        styles: {
          fontSize: 7.4,
          cellPadding: 1.8,
          textColor: SLATE_TEXT,
          lineColor: BORDER_GRAY,
          lineWidth: 0.18,
        },
        headStyles: {
          fillColor: NAVY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        columnStyles: {
          0: { cellWidth: 11, halign: 'center' },
          1: { cellWidth: 62 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 24, halign: 'center' },
          4: { cellWidth: 16, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
        },
        head: [['S#', 'Nama Soal', 'Opsi / Model Jawaban', 'Kredit', 'Pemilih', 'Frekuensi', 'Status']],
        body: distBody,
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 6) {
            const val = String(data.cell.raw);
            if (val === 'Kunci Jawaban') data.cell.styles.textColor = BLUE;
            else if (val === 'Berfungsi') data.cell.styles.textColor = EMERALD_TEXT;
            else if (val === 'Tidak Berfungsi') data.cell.styles.textColor = AMBER_TEXT;
            else if (val === 'Menjebak') data.cell.styles.textColor = CRIMSON_TEXT;
          }
        },
      });

      cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 40) + 8;
    }
  }

  // Section 5: Pedoman Kriteria
  if (options.includeCriteria) {
    if (cursorY > pageHeight - 55) {
      doc.addPage();
      cursorY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text('Pedoman Kriteria Interpretasi Psikometrik', marginX, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: SLATE_TEXT,
        lineColor: BORDER_GRAY,
        lineWidth: 0.18,
      },
      headStyles: {
        fillColor: LIGHT_BG,
        textColor: NAVY,
        fontStyle: 'bold',
      },
      head: [['Indikator', 'Kriteria & Klasifikasi']],
      body: [
        ['Tingkat Kesukaran (Indeks Fasilitas / P)', 'Sukar: P < 30%  |  Sedang (Ideal): 30% ≤ P ≤ 70%  |  Mudah: P > 70% (Terlalu mudah bila > 85%)'],
        ['Daya Pembeda (Indeks Diskriminasi / D)', 'Sangat Baik: ≥ 40%  |  Baik: 30%–39,9%  |  Cukup: 20%–29,9%  |  Jelek: 0%–19,9%  |  Sangat Jelek: < 0%'],
        ['Keputusan Butir Soal', 'Diterima: D ≥ 30% & 15% ≤ P ≤ 85%  |  Revisi: 20% ≤ D < 30% atau P ekstrem (<15% / >85%)  |  Dibuang: D < 20%'],
        ['Efektivitas Pengecoh (Pilihan Ganda)', 'Berfungsi: dipilih ≥ 5% siswa  |  Tidak Berfungsi: dipilih < 5% siswa  |  Menjebak: dipilih lebih banyak dari kunci jawaban'],
      ],
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 30) + 10;
  }

  // Signature Block
  if (options.includeSignature) {
    if (cursorY > pageHeight - 44) {
      doc.addPage();
      cursorY = 20;
    }

    const leftX = marginX + 18;
    const rightX = pageWidth - marginX - 72;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);

    doc.text('Mengetahui,', leftX, cursorY);
    doc.text(`${metadata.city || 'Kota'}, ${metadata.reportDate}`, rightX, cursorY);

    cursorY += 5;
    doc.text('Kepala Sekolah,', leftX, cursorY);
    doc.text('Guru Mata Pelajaran,', rightX, cursorY);

    cursorY += 20;
    doc.setFont('helvetica', 'bold');
    doc.text(metadata.principalName || '( ........................................ )', leftX, cursorY);
    doc.text(metadata.teacherName || '( ........................................ )', rightX, cursorY);

    cursorY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...SLATE_TEXT);
    doc.text(metadata.principalNip ? `NIP. ${metadata.principalNip}` : 'NIP. ....................................', leftX, cursorY);
    doc.text(metadata.teacherNip ? `NIP. ${metadata.teacherNip}` : 'NIP. ....................................', rightX, cursorY);
  }

  // Running Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_TEXT);
    doc.text(
      `Anabutir · ${report.summary.quizName} (${report.summary.courseName})`,
      marginX,
      pageHeight - 6
    );
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - marginX, pageHeight - 6, {
      align: 'right',
    });
  }

  const fileSlug = slugifyFileName(report.summary.quizName);
  doc.save(`Laporan_Analisis_Butir_Soal_${fileSlug}.pdf`);
}
