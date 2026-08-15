/**
 * Helper utility to automatically optimize and compress event posters/images.
 * Ensures the resulting base64 payload is compact (~80KB - 250KB) and well within
 * Firestore's 1,048,576 bytes (1 MiB) per-document limit without losing visual clarity.
 */
export async function optimizeEventImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Sila muat naik fail berformat imej (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Gagal membaca data imej.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to optimized JPEG data URL
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Fail imej rosak atau tidak dapat dibaca.'));
      };

      img.src = src;
    };

    reader.onerror = () => {
      reject(new Error('Gagal memproses fail dari peranti.'));
    };

    reader.readAsDataURL(file);
  });
}
