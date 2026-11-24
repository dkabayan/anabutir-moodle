import { parseMoodleFile } from '../utils/moodleParser';

self.onmessage = async (event: MessageEvent<{ id: number; file: File }>) => {
  const { id, file } = event.data;
  try {
    const report = await parseMoodleFile(file);
    self.postMessage({ id, ok: true, report });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Gagal memproses berkas Moodle.';
    self.postMessage({ id, ok: false, error });
  }
};
