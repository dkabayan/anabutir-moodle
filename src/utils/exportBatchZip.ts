import JSZip from 'jszip';
import { AnalysisReport, ExportOptions, ReportMetadata } from '../types/analysis';
import { exportReportToExcelBuffer } from './exportExcel';
import { exportReportToPdfBlob } from './exportPdf';
import { slugifyFileName } from './format';

/**
 * Generate a ZIP archive containing PDF and Excel reports for all loaded classes.
 */
export async function exportBatchReportsToZip(
  reports: AnalysisReport[],
  metadata: ReportMetadata,
  options: ExportOptions
): Promise<void> {
  const zip = new JSZip();

  reports.forEach((rep, idx) => {
    const classTag = slugifyFileName(
      rep.summary.courseName || rep.fileName.replace(/\.[^.]+$/, '') || `kelas_${idx + 1}`
    );
    const folderName = `${String(idx + 1).padStart(2, '0')}_${classTag}`;
    const folder = zip.folder(folderName);
    if (!folder) return;

    const perReportMeta: ReportMetadata = {
      ...metadata,
      subjectName: metadata.subjectName || rep.summary.courseName,
    };

    const { blob, fileName: pdfName } = exportReportToPdfBlob(rep, perReportMeta, options);
    const { buffer, fileName: xlsxName } = exportReportToExcelBuffer(rep, perReportMeta, options);

    folder.file(pdfName, blob);
    folder.file(xlsxName, buffer);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Laporan_Analisis_Butir_Semua_Kelas_${reports.length}_Berkas.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
