const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

/**
 * Validate and convert an uploaded PNG/JPEG logo file to a Base64 Data URL.
 */
export function readLogoFileAsDataUrl(file: File): Promise<string> {
  if (!ALLOWED_LOGO_TYPES.includes(file.type.toLowerCase())) {
    return Promise.reject(new Error('Format logo harus PNG atau JPG/JPEG.'));
  }
  if (file.size > MAX_LOGO_BYTES) {
    return Promise.reject(new Error('Ukuran file logo maksimal 2 MB.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file logo.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file logo.'));
    reader.readAsDataURL(file);
  });
}
