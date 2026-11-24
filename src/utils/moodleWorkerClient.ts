import { AnalysisReport } from '../types/analysis';
import { parseMoodleFile } from './moodleParser';

let requestIdCounter = 0;

/**
 * Parse Moodle file inside a Web Worker to keep the UI responsive,
 * with automatic fallback to main-thread parsing if Workers are unavailable.
 */
export async function parseMoodleFileInWorker(file: File): Promise<AnalysisReport> {
  if (typeof Worker === 'undefined') {
    return parseMoodleFile(file);
  }

  return new Promise<AnalysisReport>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('../workers/moodleParser.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      void parseMoodleFile(file).then(resolve, reject);
      return;
    }

    const id = ++requestIdCounter;

    worker.onmessage = (
      event: MessageEvent<{ id: number; ok: boolean; report?: AnalysisReport; error?: string }>
    ) => {
      if (event.data.id !== id) return;
      worker.terminate();
      if (event.data.ok && event.data.report) {
        resolve(event.data.report);
      } else {
        reject(new Error(event.data.error || 'Gagal memproses berkas di background worker.'));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message || 'Terjadi kesalahan pada Web Worker parser.'));
    };

    worker.postMessage({ id, file });
  });
}
