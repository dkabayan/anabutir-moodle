import * as XLSX from 'xlsx';
import {
  AnalysisReport,
  AnalyzedQuestion,
  CategorySummary,
  DifficultyLevel,
  DiscriminationLevel,
  DistractorStatus,
  DistractorSummary,
  ExamFormat,
  ImprovementSuggestion,
  ItemDecision,
  QuestionCategory,
  QuizSummary,
  ResponseOption,
} from '../types/analysis';

/**
 * Decode common HTML entities found in Moodle CSV exports (e.g. &#039;, &quot;, &amp;)
 */
export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#0*34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse Moodle numeric/percentage values, handling:
 * - leading apostrophe formula-injection protection (e.g. "'-0,25", "'-5,75%")
 * - Indonesian decimal commas ("41,67%") or English decimal dots ("41.67%")
 * - empty strings, dashes, or "N/A"
 */
export function parseMoodleNumber(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }

  let cleaned = String(raw).trim();
  if (!cleaned || cleaned === '-' || cleaned === '—' || cleaned.toLowerCase() === 'n/a') {
    return null;
  }

  // Strip Moodle formula-protection apostrophe prefix
  if (cleaned.startsWith("'")) {
    cleaned = cleaned.slice(1).trim();
  }

  // Strip percent sign and spaces
  cleaned = cleaned.replace(/%/g, '').replace(/\s+/g, '');

  // Determine decimal separator: if both '.' and ',' exist, determine which is decimal
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse percentage cell from Excel or CSV.
 * Note: Excel files sometimes store 52% as 0.52 (number) instead of "52%".
 */
function parseMoodlePercent(
  raw: string | number | undefined | null,
  fromExcelNumericFraction = false
): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number' && fromExcelNumericFraction) {
    // Moodle Excel exports store percentages as decimals (0.4167) or whole numbers depending on format
    if (Math.abs(raw) <= 1.0001) {
      return Number((raw * 100).toFixed(2));
    }
    return Number(raw.toFixed(2));
  }
  return parseMoodleNumber(raw);
}

/**
 * Detect CSV delimiter from the first few lines (comma vs semicolon)
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
  let commaCount = 0;
  let semiCount = 0;
  let inQuotes = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === ',') commaCount++;
      else if (ch === ';') semiCount++;
    }
  }
  return semiCount > commaCount ? ';' : ',';
}

/**
 * RFC-4180 compliant CSV parser supporting multi-line quoted values & BOM stripping
 */
export function parseCsvToRows(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field);
        field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/**
 * Classify raw Moodle question type string (Indonesian or English)
 */
function classifyQuestionType(rawType: string): QuestionCategory {
  const normalized = rawType.trim().toLowerCase();
  if (
    normalized.includes('essay') ||
    normalized.includes('esai') ||
    normalized.includes('uraian')
  ) {
    return 'essay';
  }
  if (
    normalized.includes('pilihan ganda') ||
    normalized.includes('multiple choice') ||
    normalized.includes('multichoice') ||
    normalized.includes('benar/salah') ||
    normalized.includes('true/false') ||
    normalized.includes('truefalse')
  ) {
    return 'mc';
  }
  return 'other';
}

/**
 * Classify Facility Index (Tingkat Kesukaran / P) using Indonesian evaluation standards
 */
export function classifyDifficulty(p: number | null): DifficultyLevel {
  if (p === null) return 'Sedang';
  if (p < 30) return 'Sukar';
  if (p <= 70) return 'Sedang';
  return 'Mudah';
}

/**
 * Classify Discrimination Index (Daya Pembeda / D)
 */
export function classifyDiscrimination(d: number | null): DiscriminationLevel {
  if (d === null) return 'Jelek';
  if (d >= 40) return 'Sangat Baik';
  if (d >= 30) return 'Baik';
  if (d >= 20) return 'Cukup';
  if (d >= 0) return 'Jelek';
  return 'Sangat Jelek';
}

/**
 * Classify internal consistency (Cronbach's Alpha / CIC)
 */
function evaluateReliability(cic: number | null): { label: string; note: string } {
  if (cic === null) {
    return {
      label: 'Tidak Tersedia',
      note: 'Nilai koefisien konsistensi internal tidak tercantum pada berkas.',
    };
  }
  if (cic >= 80) {
    return {
      label: 'Sangat Tinggi',
      note: 'Instrumen ujian sangat konsisten dan andal dalam mengukur capaian siswa.',
    };
  }
  if (cic >= 65) {
    return {
      label: 'Tinggi (Baik)',
      note: 'Instrumen ujian memiliki reliabilitas yang memadai untuk penilaian sumatif.',
    };
  }
  if (cic >= 50) {
    return {
      label: 'Cukup',
      note: 'Reliabilitas cukup; tinjau ulang butir dengan daya pembeda rendah untuk meningkatkan konsistensi.',
    };
  }
  return {
    label: 'Rendah',
    note: 'Konsistensi internal rendah; perlu evaluasi menyeluruh terhadap kualitas dan kejelasan butir soal.',
  };
}

/**
 * Check if a row matches the Question Structure header (Section 2)
 */
function isQuestionHeaderRow(row: string[]): boolean {
  const c0 = (row[0] || '').trim().toLowerCase();
  const c1 = (row[1] || '').trim().toLowerCase();
  const c2 = (row[2] || '').trim().toLowerCase();
  return (
    (c0 === 's#' || c0 === 'q#' || c0 === 'no' || c0 === 'nomor') &&
    (c1.includes('jenis') || c1.includes('type')) &&
    (c2.includes('nama') || c2.includes('name'))
  );
}

/**
 * Check if a row matches the Response Analysis header (Section 3)
 */
function isResponseHeaderRow(row: string[]): boolean {
  const c0 = (row[0] || '').trim().toLowerCase();
  const c1 = (row[1] || '').trim().toLowerCase();
  return (
    (c0.includes('model jawaban') || c0.includes('model response') || c0.includes('response')) &&
    (c1.includes('kredit') || c1.includes('credit'))
  );
}

/**
 * Analyze distractors for a multiple choice item
 */
function buildDistractorAnalysis(rawOptions: {
  text: string;
  partialCredit: number;
  count: number;
  frequency: number;
}[]): { responses: ResponseOption[]; summary: DistractorSummary } {
  const keyOptions = rawOptions.filter((opt) => opt.partialCredit > 0);
  const maxKeyFrequency = keyOptions.reduce((max, o) => Math.max(max, o.frequency), 0);

  let totalDistractors = 0;
  let functioningCount = 0;
  let nonFunctioningCount = 0;
  let dominantCount = 0;
  let noResponseCount = 0;

  const responses: ResponseOption[] = rawOptions.map((opt) => {
    const lowerText = opt.text.toLowerCase();
    const isNoResponse =
      lowerText.includes('[tidak menjawab]') ||
      lowerText.includes('[no response]') ||
      lowerText === 'tidak menjawab';
    const isKey = opt.partialCredit > 0;

    let status: DistractorStatus;
    if (isNoResponse) {
      status = 'Tidak Menjawab';
      noResponseCount += opt.count;
    } else if (isKey) {
      status = 'Kunci Jawaban';
    } else {
      totalDistractors++;
      // Dominant distractor: chosen more frequently than the correct answer
      if (maxKeyFrequency > 0 && opt.frequency > maxKeyFrequency) {
        status = 'Menjebak';
        dominantCount++;
        functioningCount++;
      } else if (opt.frequency >= 5) {
        status = 'Berfungsi';
        functioningCount++;
      } else {
        status = 'Tidak Berfungsi';
        nonFunctioningCount++;
      }
    }

    return {
      text: opt.text,
      partialCredit: opt.partialCredit,
      count: opt.count,
      frequency: opt.frequency,
      isKey,
      isNoResponse,
      status,
    };
  });

  const effectivenessPct =
    totalDistractors > 0
      ? Number((((totalDistractors - nonFunctioningCount) / totalDistractors) * 100).toFixed(1))
      : 100;

  let qualityLabel: 'Baik' | 'Perlu Revisi' | 'Kurang Baik' = 'Baik';
  if (dominantCount > 0 || nonFunctioningCount > 0) {
    qualityLabel =
      dominantCount > 0 || effectivenessPct < 50 ? 'Kurang Baik' : 'Perlu Revisi';
  }

  return {
    responses,
    summary: {
      totalDistractors,
      functioningCount,
      nonFunctioningCount,
      dominantCount,
      noResponseCount,
      effectivenessPct,
      qualityLabel,
    },
  };
}

function quoteOption(text: string): string {
  const trimmed = text.trim();
  const short = trimmed.length > 58 ? `${trimmed.slice(0, 56)}…` : trimmed;
  return `"${short}"`;
}

function fmtPctId(val: number): string {
  return `${val.toFixed(2).replace('.', ',')}%`;
}

/**
 * Generate concrete, item-specific improvement suggestions (Saran Perbaikan)
 * whenever a question is classified as 'Revisi' or 'Dibuang'.
 */
function buildImprovementSuggestions(
  decision: ItemDecision,
  category: QuestionCategory,
  facilityIndex: number | null,
  discriminationIndex: number | null,
  standardDeviation: number | null,
  attempts: number,
  responses: ResponseOption[],
  distractorSummary: DistractorSummary | null
): ImprovementSuggestion[] {
  if (decision === 'Diterima') return [];

  const suggestions: ImprovementSuggestion[] = [];
  const p = facilityIndex;
  const d = discriminationIndex;

  const keyOptions = responses.filter((r) => r.isKey);
  const dominantDistractors = responses.filter((r) => r.status === 'Menjebak');
  const passiveDistractors = responses.filter((r) => r.status === 'Tidak Berfungsi');
  const functioningDistractors = responses
    .filter((r) => !r.isKey && !r.isNoResponse)
    .sort((a, b) => b.frequency - a.frequency);
  const strongestDistractor = functioningDistractors[0];
  const noResponseOpt = responses.find((r) => r.isNoResponse);

  // 1. Discrimination & Key / Stem Validity
  if (d !== null && d < 0) {
    const keyNote = keyOptions[0]
      ? `kunci jawaban ${quoteOption(keyOptions[0].text)} (${fmtPctId(keyOptions[0].frequency)})`
      : 'kunci jawaban pada Moodle';
    const rivalNote = strongestDistractor
      ? ` serta bandingkan dengan pengecoh terkuat ${quoteOption(strongestDistractor.text)} (${fmtPctId(
          strongestDistractor.frequency
        )}) yang banyak dipilih siswa`
      : '';
    suggestions.push({
      aspect: 'Verifikasi Kunci & Ambiguitas',
      action: `Daya pembeda negatif (${fmtPctId(
        d
      )}) menandakan siswa berkemampuan tinggi justru lebih sering salah. Periksa ulang ${keyNote}${rivalNote}, lalu hilangkan makna ganda pada pokok soal.`,
    });
  } else if (d !== null && d < 20) {
    if (category === 'essay') {
      suggestions.push({
        aspect: 'Perbaikan Instruksi & Rubrik Esai',
        action: `Daya pembeda sangat rendah (${fmtPctId(
          d
        )}). Pertajam kata kerja operasional pada perintah soal dan buat rentang skor rubrik yang lebih jelas antara jawaban lengkap, parsial, dan tidak tepat.`,
      });
    } else {
      const rivalDetail =
        strongestDistractor && strongestDistractor.frequency >= 25
          ? ` (perhatikan opsi ${quoteOption(strongestDistractor.text)} yang dipilih ${fmtPctId(
              strongestDistractor.frequency
            )} siswa)`
          : '';
      suggestions.push({
        aspect: 'Rombak Pokok Soal',
        action: `Daya pembeda berada di bawah ambang minimal 20% (${fmtPctId(
          d
        )}). Susun ulang stimulus/redaksi soal agar benar-benar menguji penguasaan konsep inti${rivalDetail}, atau ganti dengan butir baru yang setara indikatornya.`,
      });
    }
  } else if (d !== null && d < 30) {
    suggestions.push({
      aspect: 'Penajaman Daya Pembeda',
      action:
        category === 'essay'
          ? `Daya pembeda baru mencapai ${fmtPctId(
              d
            )} (kategori cukup). Tambahkan kriteria pembeda pada rubrik penskoran agar siswa dengan analisis mendalam memperoleh skor lebih kontras dibanding jawaban permukaan.`
          : `Daya pembeda baru mencapai ${fmtPctId(
              d
            )} (target layak ≥30%). Perjelas konteks pokok soal dan hindari petunjuk verbal yang memudahkan penebakan tanpa memahami konsep.`,
    });
  }

  // 2. Difficulty Calibration
  if (p !== null && p > 85) {
    suggestions.push({
      aspect: 'Naikkan Tingkat Kesukaran',
      action: `Soal terlalu mudah (${fmtPctId(
        p
      )} siswa menjawab benar). Tingkatkan level kognitif (misalnya dari hafalan ke penerapan/analisis konteks) atau buat pilihan pengecoh lebih dekat secara makna dengan kunci jawaban.`,
    });
  } else if (p !== null && p > 70 && d !== null && d < 30) {
    suggestions.push({
      aspect: 'Hilangkan Petunjuk Terlalu Jelas',
      action: `Soal cenderung mudah (${fmtPctId(
        p
      )}) sekaligus berdaya beda rendah. Periksa apakah kunci jawaban terlihat mencolok (lebih panjang/spesifik) dibanding pengecoh, lalu samakan struktur dan panjang opsi.`,
    });
  } else if (p !== null && p < 15) {
    suggestions.push({
      aspect: 'Sederhanakan Kompleksitas Soal',
      action: `Soal terlalu sukar (hanya ${fmtPctId(
        p
      )} siswa menjawab benar). Sederhanakan kalimat yang berbelit, pastikan materi telah diajarkan sesuai kisi-kisi, atau pecah langkah penyelesaian menjadi lebih terarah.`,
    });
  } else if (p !== null && p < 30 && d !== null && d < 30) {
    suggestions.push({
      aspect: 'Evaluasi Kejelasan Materi & Stimulus',
      action: `Soal tergolong sukar (${fmtPctId(
        p
      )}) dengan daya pembeda rendah. Tinjau ulang kecukupan informasi pada teks/stimulus agar siswa yang menguasai materi tetap dapat menemukan jawaban benar.`,
    });
  }

  // 3. Multiple Choice Distractor-Specific Fixes
  if (category === 'mc' && distractorSummary) {
    if (dominantDistractors.length > 0) {
      const list = dominantDistractors
        .map((o) => `${quoteOption(o.text)} (${fmtPctId(o.frequency)}, ${o.count} siswa)`)
        .join('; ');
      const keyPct = keyOptions[0] ? fmtPctId(keyOptions[0].frequency) : 'kunci';
      suggestions.push({
        aspect: 'Perbaiki Pengecoh Menjebak',
        action: `Pengecoh ${list} dipilih lebih banyak siswa dibanding kunci jawaban (${keyPct}). Pastikan opsi tersebut memang salah secara mutlak, tidak ambigu, dan pertimbangkan penguatan materi remedial terkait miskonsepsi ini.`,
      });
    }

    if (passiveDistractors.length > 0) {
      const list = passiveDistractors
        .map((o) => `${quoteOption(o.text)} (${fmtPctId(o.frequency)})`)
        .join(', ');
      suggestions.push({
        aspect: `Ganti ${passiveDistractors.length} Pengecoh Pasif`,
        action: `Opsi ${list} hampir tidak dipilih siswa (<5%) sehingga terlalu mudah dieliminasi. Ganti dengan pengecoh yang realistis berdasarkan kesalahan umum siswa agar efektivitas pilihan meningkat.`,
      });
    }

    if (noResponseOpt && attempts > 0 && noResponseOpt.count / attempts >= 0.1) {
      suggestions.push({
        aspect: 'Tinjau Alokasi Waktu / Kejelasan Soal',
        action: `${noResponseOpt.count} siswa (${fmtPctId(
          noResponseOpt.frequency
        )}) tidak menjawab soal ini. Periksa apakah posisi soal berada di akhir dengan durasi ujian ketat atau format tampilan soal sulit dipahami.`,
      });
    }
  }

  // 4. Essay Spread Check
  if (category === 'essay' && standardDeviation !== null && standardDeviation < 15) {
    suggestions.push({
      aspect: 'Perlebar Rentang Skor Rubrik',
      action: `Simpangan baku skor esai relatif sempit (${fmtPctId(
        standardDeviation
      )}). Gunakan skala rubrik bertingkat (misal 0–4 per indikator) agar variasi kualitas jawaban siswa terekam lebih akurat.`,
    });
  }

  // 5. Final Action Guidance for 'Dibuang'
  if (decision === 'Dibuang') {
    suggestions.push({
      aspect: 'Keputusan Bank Soal',
      action:
        'Nonaktifkan butir ini dari bank soal aktif sementara waktu; lakukan revisi menyeluruh lalu uji coba kembali pada kelas paralel atau ganti dengan soal baru pada indikator yang sama.',
    });
  }

  return suggestions;
}

/**
 * Determine Item Decision & Indonesian diagnostic recommendations
 */
function evaluateItemDecision(
  category: QuestionCategory,
  facilityIndex: number | null,
  discriminationIndex: number | null,
  standardDeviation: number | null,
  attempts: number,
  responses: ResponseOption[],
  distractorSummary: DistractorSummary | null
): {
  decision: ItemDecision;
  reasons: string[];
  recommendation: string;
  improvementSuggestions: ImprovementSuggestion[];
} {
  const reasons: string[] = [];

  const d = discriminationIndex;
  const p = facilityIndex;

  if (d !== null && d < 0) {
    reasons.push(
      `Daya pembeda negatif (${d.toFixed(2)}%) — siswa berkemampuan rendah lebih sering menjawab benar dibanding siswa berkemampuan tinggi.`
    );
  } else if (d !== null && d < 20) {
    reasons.push(
      `Daya pembeda jelek (${d.toFixed(2)}%, di bawah ambang 20%) sehingga soal kurang mampu membedakan penguasaan siswa.`
    );
  } else if (d !== null && d < 30) {
    reasons.push(
      `Daya pembeda cukup (${d.toFixed(2)}%, rentang 20–29%) dan masih dapat ditingkatkan.`
    );
  }

  if (p !== null && p > 85) {
    reasons.push(`Tingkat kesukaran terlalu mudah (${p.toFixed(2)}%).`);
  } else if (p !== null && p < 15) {
    reasons.push(`Tingkat kesukaran terlalu sukar (${p.toFixed(2)}%).`);
  }

  if (category === 'mc' && distractorSummary) {
    if (distractorSummary.dominantCount > 0) {
      reasons.push(
        `Terdapat ${distractorSummary.dominantCount} pengecoh yang dipilih lebih banyak siswa dibanding kunci jawaban.`
      );
    }
    if (distractorSummary.nonFunctioningCount > 0) {
      reasons.push(
        `${distractorSummary.nonFunctioningCount} dari ${distractorSummary.totalDistractors} pengecoh tidak berfungsi (<5% pemilih).`
      );
    }
  }

  // Final decision rule
  if (d !== null && d < 20) {
    const decision: ItemDecision = 'Dibuang';
    const recommendation =
      d < 0
        ? 'Segera periksa kunci jawaban di Moodle dan kejelasan redaksi soal; jika kunci sudah benar, ganti atau buang butir ini.'
        : distractorSummary && distractorSummary.dominantCount > 0
        ? 'Periksa miskonsepsi pada pengecoh dominan dan revisi total stem soal atau ganti dengan butir baru.'
        : 'Ganti butir soal atau rombak total pokok soal dan pilihan jawaban sebelum digunakan kembali.';
    return {
      decision,
      reasons,
      recommendation,
      improvementSuggestions: buildImprovementSuggestions(
        decision,
        category,
        facilityIndex,
        discriminationIndex,
        standardDeviation,
        attempts,
        responses,
        distractorSummary
      ),
    };
  }

  if ((d !== null && d < 30) || (p !== null && (p > 85 || p < 15))) {
    const decision: ItemDecision = 'Revisi';
    const recommendation =
      p !== null && p > 85
        ? 'Pertimbangkan menaikkan kompleksitas konteks atau menajamkan pengecoh agar soal tidak terlalu mudah.'
        : p !== null && p < 15
        ? 'Sederhanakan redaksi soal atau pastikan materi sudah tersampaikan sebelum digunakan ulang.'
        : category === 'mc'
        ? 'Revisi pokok soal dan perbaiki opsi pengecoh yang kurang efektif agar daya pembeda meningkat di atas 30%.'
        : 'Perjelas rubrik penskoran dan instruksi esai agar rentang pembeda antar siswa lebih tajam.';
    return {
      decision,
      reasons,
      recommendation,
      improvementSuggestions: buildImprovementSuggestions(
        decision,
        category,
        facilityIndex,
        discriminationIndex,
        standardDeviation,
        attempts,
        responses,
        distractorSummary
      ),
    };
  }

  // Accepted (D >= 30% and 15% <= P <= 85%)
  if (category === 'mc' && distractorSummary && distractorSummary.nonFunctioningCount > 0) {
    return {
      decision: 'Diterima',
      reasons: [
        `Daya pembeda baik (${d?.toFixed(2)}%) dan tingkat kesukaran proporsional (${p?.toFixed(2)}%).`,
        ...reasons,
      ],
      recommendation:
        'Layak masuk bank soal. Opsional: sempurnakan opsi pengecoh yang jarang dipilih (<5%) pada edisi ujian berikutnya.',
      improvementSuggestions: [],
    };
  }

  return {
    decision: 'Diterima',
    reasons: [
      `Daya pembeda ${classifyDiscrimination(d).toLowerCase()} (${d?.toFixed(2) ?? '-'}%) dengan tingkat kesukaran ${classifyDifficulty(p).toLowerCase()} (${p?.toFixed(2) ?? '-'}%).`,
    ],
    recommendation:
      category === 'essay'
        ? 'Butir esai sangat layak dipertahankan di bank soal dan rubrik penilaian bekerja efektif.'
        : 'Butir soal layak disimpan dan digunakan kembali pada bank soal.',
    improvementSuggestions: [],
  };
}

function summarizeCategory(items: AnalyzedQuestion[]): CategorySummary {
  const validFacility = items
    .map((q) => q.facilityIndex)
    .filter((v): v is number => v !== null);
  const validDisc = items
    .map((q) => q.discriminationIndex)
    .filter((v): v is number => v !== null);
  const validEff = items
    .map((q) => q.discriminativeEfficiency)
    .filter((v): v is number => v !== null);

  const avg = (arr: number[]) =>
    arr.length > 0 ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)) : null;

  const totalIntendedWeight = Number(
    items.reduce((s, q) => s + (q.intendedWeight ?? 0), 0).toFixed(2)
  );
  const totalEffectiveWeight = Number(
    items.reduce((s, q) => s + (q.effectiveWeight ?? 0), 0).toFixed(2)
  );

  return {
    count: items.length,
    avgFacility: avg(validFacility),
    avgDiscrimination: avg(validDisc),
    avgEfficiency: avg(validEff),
    totalIntendedWeight,
    totalEffectiveWeight,
    acceptedCount: items.filter((q) => q.decision === 'Diterima').length,
    reviseCount: items.filter((q) => q.decision === 'Revisi').length,
    rejectCount: items.filter((q) => q.decision === 'Dibuang').length,
  };
}

/**
 * Core analyzer taking normalized 2D string rows from CSV or Excel
 */
export function parseMoodleRows(
  rows: string[][],
  fileName: string,
  fromExcelNumericFraction = false
): AnalysisReport {
  if (rows.length < 3) {
    throw new Error(
      'Format berkas tidak valid. Pastikan Anda mengunggah berkas statistik lengkap (Complete stats) hasil ekspor dari LMS Moodle.'
    );
  }

  // Locate Section 2 (Question Structure Header)
  const questionHeaderIdx = rows.findIndex((r) => isQuestionHeaderRow(r));
  if (questionHeaderIdx === -1) {
    throw new Error(
      'Header tabel statistik soal (S# / Q#, Jenis soal, Nama soal) tidak ditemukan. Pastikan berkas berasal dari menu Statistik Kuis Moodle.'
    );
  }

  // Parse Section 1 (Quiz Summary) — usually rows 0 (headers) and 1 (values)
  const summaryValues = questionHeaderIdx >= 2 ? rows[1] : [];
  const summary: QuizSummary = {
    quizName: decodeHtmlEntities(summaryValues[0] || fileName.replace(/\.(csv|xlsx|xls)$/i, '')),
    courseName: decodeHtmlEntities(summaryValues[1] || 'Kursus Moodle'),
    openDate: decodeHtmlEntities(summaryValues[2] || '-'),
    firstAttemptsCount: Math.round(parseMoodleNumber(summaryValues[3]) ?? 0),
    totalAttemptsCount: Math.round(parseMoodleNumber(summaryValues[4]) ?? 0),
    avgFirstAttempt: parseMoodlePercent(summaryValues[5], fromExcelNumericFraction),
    avgAllAttempts: parseMoodlePercent(summaryValues[6], fromExcelNumericFraction),
    avgLastAttempt: parseMoodlePercent(summaryValues[7], fromExcelNumericFraction),
    avgHighestAttempt: parseMoodlePercent(summaryValues[8], fromExcelNumericFraction),
    medianHighest: parseMoodlePercent(summaryValues[9], fromExcelNumericFraction),
    stdDevHighest: parseMoodlePercent(summaryValues[10], fromExcelNumericFraction),
    skewness: parseMoodleNumber(summaryValues[11]),
    kurtosis: parseMoodleNumber(summaryValues[12]),
    internalConsistency: parseMoodlePercent(summaryValues[13], fromExcelNumericFraction),
    errorRatio: parseMoodlePercent(summaryValues[14], fromExcelNumericFraction),
    standardError: parseMoodlePercent(summaryValues[15], fromExcelNumericFraction),
  };

  // Parse Section 2 (Question rows) until Section 3 (Response header) or EOF
  const firstResponseIdx = rows.findIndex(
    (r, idx) => idx > questionHeaderIdx && isResponseHeaderRow(r)
  );
  const questionEndIdx = firstResponseIdx === -1 ? rows.length : firstResponseIdx;

  interface RawQuestionRow {
    slot: string;
    slotOrder: number;
    rawType: string;
    category: QuestionCategory;
    name: string;
    attempts: number;
    facilityIndex: number | null;
    standardDeviation: number | null;
    randomGuessScore: number | null;
    intendedWeight: number | null;
    effectiveWeight: number | null;
    discriminationIndex: number | null;
    discriminativeEfficiency: number | null;
  }

  const rawQuestions: RawQuestionRow[] = [];

  for (let i = questionHeaderIdx + 1; i < questionEndIdx; i++) {
    const r = rows[i];
    const slot = (r[0] || '').trim();
    const rawType = decodeHtmlEntities(r[1] || '');
    const name = decodeHtmlEntities(r[2] || '');

    if (!slot || !rawType) continue;

    rawQuestions.push({
      slot,
      slotOrder: Number.parseFloat(slot) || rawQuestions.length + 1,
      rawType,
      category: classifyQuestionType(rawType),
      name: name || `Soal ${slot}`,
      attempts: Math.round(parseMoodleNumber(r[3]) ?? summary.totalAttemptsCount),
      facilityIndex: parseMoodlePercent(r[4], fromExcelNumericFraction),
      standardDeviation: parseMoodlePercent(r[5], fromExcelNumericFraction),
      randomGuessScore: parseMoodlePercent(r[6], fromExcelNumericFraction),
      intendedWeight: parseMoodlePercent(r[7], fromExcelNumericFraction),
      effectiveWeight: parseMoodlePercent(r[8], fromExcelNumericFraction),
      discriminationIndex: parseMoodlePercent(r[9], fromExcelNumericFraction),
      discriminativeEfficiency: parseMoodlePercent(r[10], fromExcelNumericFraction),
    });
  }

  if (rawQuestions.length === 0) {
    throw new Error('Tidak ditemukan baris butir soal di dalam berkas yang diunggah.');
  }

  // Parse Section 3 (Response / Distractor blocks)
  const responseBlocks: {
    text: string;
    partialCredit: number;
    count: number;
    frequency: number;
  }[][] = [];

  if (firstResponseIdx !== -1) {
    let currentBlock: {
      text: string;
      partialCredit: number;
      count: number;
      frequency: number;
    }[] = [];

    for (let i = firstResponseIdx; i < rows.length; i++) {
      const r = rows[i];
      if (isResponseHeaderRow(r)) {
        if (currentBlock.length > 0) {
          responseBlocks.push(currentBlock);
          currentBlock = [];
        }
        continue;
      }

      const text = decodeHtmlEntities(r[0] || '');
      if (!text) continue;

      const partialCredit = parseMoodlePercent(r[1], fromExcelNumericFraction) ?? 0;
      const count = Math.round(parseMoodleNumber(r[2]) ?? 0);
      const frequency = parseMoodlePercent(r[3], fromExcelNumericFraction) ?? 0;

      currentBlock.push({ text, partialCredit, count, frequency });
    }

    if (currentBlock.length > 0) {
      responseBlocks.push(currentBlock);
    }
  }

  // Map response blocks to non-essay questions sequentially
  let responseBlockCursor = 0;

  const questions: AnalyzedQuestion[] = rawQuestions.map((rq) => {
    let responses: ResponseOption[] = [];
    let distractorSummary: DistractorSummary | null = null;

    if (rq.category !== 'essay' && responseBlockCursor < responseBlocks.length) {
      const built = buildDistractorAnalysis(responseBlocks[responseBlockCursor]);
      responses = built.responses;
      distractorSummary = built.summary;
      responseBlockCursor++;
    }

    const difficultyLevel = classifyDifficulty(rq.facilityIndex);
    const discriminationLevel = classifyDiscrimination(rq.discriminationIndex);
    const { decision, reasons, recommendation, improvementSuggestions } = evaluateItemDecision(
      rq.category,
      rq.facilityIndex,
      rq.discriminationIndex,
      rq.standardDeviation,
      rq.attempts,
      responses,
      distractorSummary
    );

    return {
      ...rq,
      difficultyLevel,
      discriminationLevel,
      decision,
      decisionReasons: reasons,
      recommendation,
      improvementSuggestions,
      responses,
      distractorSummary,
    };
  });

  const mcItems = questions.filter((q) => q.category === 'mc');
  const essayItems = questions.filter((q) => q.category === 'essay');
  const otherItems = questions.filter((q) => q.category === 'other');

  let examFormat: ExamFormat = 'full_mc';
  let examFormatLabel = 'Full Pilihan Ganda';
  if (mcItems.length > 0 && essayItems.length > 0) {
    examFormat = 'mixed';
    examFormatLabel = 'Gabungan Pilihan Ganda & Esai';
  } else if (mcItems.length === 0 && essayItems.length > 0) {
    examFormat = 'full_essay';
    examFormatLabel = 'Full Esai / Uraian';
  } else if (otherItems.length > 0 && mcItems.length === 0) {
    examFormat = 'full_mc';
    examFormatLabel = 'Soal Objektif';
  }

  const decisionCounts: Record<ItemDecision, number> = {
    Diterima: questions.filter((q) => q.decision === 'Diterima').length,
    Revisi: questions.filter((q) => q.decision === 'Revisi').length,
    Dibuang: questions.filter((q) => q.decision === 'Dibuang').length,
  };

  const difficultyCounts: Record<DifficultyLevel, number> = {
    Sukar: questions.filter((q) => q.difficultyLevel === 'Sukar').length,
    Sedang: questions.filter((q) => q.difficultyLevel === 'Sedang').length,
    Mudah: questions.filter((q) => q.difficultyLevel === 'Mudah').length,
  };

  const discriminationCounts: Record<DiscriminationLevel, number> = {
    'Sangat Baik': questions.filter((q) => q.discriminationLevel === 'Sangat Baik').length,
    Baik: questions.filter((q) => q.discriminationLevel === 'Baik').length,
    Cukup: questions.filter((q) => q.discriminationLevel === 'Cukup').length,
    Jelek: questions.filter((q) => q.discriminationLevel === 'Jelek').length,
    'Sangat Jelek': questions.filter((q) => q.discriminationLevel === 'Sangat Jelek').length,
  };

  const reliability = evaluateReliability(summary.internalConsistency);

  // Priority items: Dibuang first (sorted by lowest discrimination), then Revisi
  const priorityItems = questions
    .filter((q) => q.decision !== 'Diterima')
    .sort((a, b) => {
      if (a.decision === 'Dibuang' && b.decision !== 'Dibuang') return -1;
      if (a.decision !== 'Dibuang' && b.decision === 'Dibuang') return 1;
      return (a.discriminationIndex ?? 100) - (b.discriminationIndex ?? 100);
    });

  return {
    fileName,
    uploadedAt: new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    examFormat,
    examFormatLabel,
    summary,
    questions,
    hasDistractorData: responseBlocks.length > 0,
    mcSummary: summarizeCategory(mcItems),
    essaySummary: summarizeCategory(essayItems),
    otherSummary: summarizeCategory(otherItems),
    decisionCounts,
    difficultyCounts,
    discriminationCounts,
    reliabilityLabel: reliability.label,
    reliabilityNote: reliability.note,
    priorityItems,
  };
}

/**
 * Parse an uploaded File (.csv, .xlsx, .xls) into an AnalysisReport
 */
export async function parseMoodleFile(file: File): Promise<AnalysisReport> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.ods')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Berkas Excel tidak memiliki lembar kerja (worksheet).');
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    const normalized = rows
      .map((r) => (Array.isArray(r) ? r.map((cell) => String(cell ?? '')) : []))
      .filter((r) => r.some((c) => c.trim() !== ''));

    return parseMoodleRows(normalized, file.name, false);
  }

  const text = await file.text();
  const rows = parseCsvToRows(text);
  return parseMoodleRows(rows, file.name, false);
}

/**
 * Build a Full Pilihan Ganda demonstration report from the sample CSV
 * by retaining the 40 Multiple Choice items & adjusting intended weights to 2.5% each (100% total)
 */
export function buildFullMcDemoFromCsv(rawCsvText: string): AnalysisReport {
  const rows = parseCsvToRows(rawCsvText);
  const questionHeaderIdx = rows.findIndex((r) => isQuestionHeaderRow(r));
  const firstResponseIdx = rows.findIndex(
    (r, idx) => idx > questionHeaderIdx && isResponseHeaderRow(r)
  );

  const filteredRows: string[][] = [];

  for (let i = 0; i < rows.length; i++) {
    if (i === 1) {
      const summaryCopy = [...rows[i]];
      summaryCopy[0] = 'ASESMEN HARIAN (FULL PG) — INGGRIS KHAS';
      filteredRows.push(summaryCopy);
    } else if (i > questionHeaderIdx && i < firstResponseIdx) {
      const type = classifyQuestionType(rows[i][1] || '');
      if (type === 'mc') {
        const mcCopy = [...rows[i]];
        mcCopy[7] = '2,50%'; // 40 MC * 2.5% = 100% intended weight
        filteredRows.push(mcCopy);
      }
    } else {
      filteredRows.push(rows[i]);
    }
  }

  return parseMoodleRows(
    filteredRows,
    'CONTOH_FULL_PILIHAN_GANDA_40_SOAL-completestats.csv',
    false
  );
}
