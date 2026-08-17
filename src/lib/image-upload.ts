const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function isHeic(file: File) {
  return ["image/heic", "image/heif"].includes(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return { image, url };
  } catch {
    URL.revokeObjectURL(url);
    if (isHeic(file)) throw new Error("This iPhone photo format could not be read. In Photos, share or export it as JPEG, PNG, or WebP and try again.");
    throw new Error("This image could not be read. Choose a JPEG, PNG, or WebP photo.");
  }
}

export async function prepareImage(file: File, options: { maxBytes: number; maxDimension: number; square?: boolean }) {
  if ((!supportedTypes.has(file.type) && !isHeic(file)) || !file.size) throw new Error("Choose a JPEG, PNG, WebP, HEIC, or HEIF photo.");
  if (file.size > options.maxBytes) throw new Error(`Choose a photo smaller than ${Math.round(options.maxBytes / 1024 / 1024)} MB.`);
  const { image, url } = await loadImage(file);
  try {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!sourceWidth || !sourceHeight) throw new Error("This image has no readable dimensions.");
    const canvas = document.createElement("canvas");
    let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
    if (options.square) {
      sw = sh = Math.min(sourceWidth, sourceHeight);
      sx = (sourceWidth - sw) / 2;
      sy = (sourceHeight - sh) / 2;
      canvas.width = canvas.height = options.maxDimension;
    } else {
      const scale = Math.min(1, options.maxDimension / Math.max(sourceWidth, sourceHeight));
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    }
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the image.");
    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!blob) throw new Error(isHeic(file) ? "This iPhone photo could not be converted. Export it as JPEG and try again." : "This browser could not prepare the image.");
    return new File([blob], "photo.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
