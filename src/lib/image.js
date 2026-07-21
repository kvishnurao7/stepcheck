// Downscale + compress a photo before sending it to the server.
// 1568px is the longest edge the vision model actually uses - larger is wasted upload.
// A mild contrast/brightness lift makes faint pencil strokes survive JPEG compression;
// colour is kept (red pen / blue ink carry meaning in checked homework).
export function resizeImage(file, maxDim = 1568) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (Math.max(width, height) > maxDim) {
          const s = maxDim / Math.max(width, height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        const ctx = c.getContext("2d");
        ctx.filter = "contrast(1.25) brightness(1.05) saturate(1.1)";
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = c.toDataURL("image/jpeg", 0.92);
        resolve({ base64: dataUrl.split(",")[1], preview: dataUrl });
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
