// Çok basit ve hafif bir renk analizi
export async function extractColorsFromFile(file: File, maxColors = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(url);
          return resolve([]);
        }

        // Küçük boyuta indiriyoruz ki hızlı olsun
        const width = 80;
        const height = 80;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height).data;

        // Renkleri kaba şekilde gruplayalım
        const colorCount: Record<string, number> = {};

        // Her pikseli değil, örneğin her 4. pikseli alalım → daha hızlı
        for (let i = 0; i < imageData.length; i += 4 * 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];

          // Biraz quantize edelim (0-255 → 0,32,64,...)
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;

          const key = `${qr},${qg},${qb}`;
          colorCount[key] = (colorCount[key] || 0) + 1;
        }

        // En çok geçen renkleri sırala
        const sorted = Object.entries(colorCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, maxColors);

        const hexColors = sorted.map(([key]) => {
          const [r, g, b] = key.split(',').map(Number);
          const toHex = (v: number) => v.toString(16).padStart(2, '0');
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        });

        URL.revokeObjectURL(url);
        resolve(hexColors);
      } catch (err) {
        URL.revokeObjectURL(url);
        console.error('extractColorsFromFile error', err);
        resolve([]);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      console.error('Image load error', e);
      resolve([]);
    };

    img.src = url;
  });
}


















