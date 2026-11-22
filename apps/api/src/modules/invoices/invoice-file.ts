const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectFileType(bytes: Buffer) {
  if (/^%PDF-\d\.\d(?:\r|\n)/.test(bytes.subarray(0, 10).toString("latin1"))) {
    return { mimeType: "application/pdf", extension: ".pdf" };
  }
  if (bytes.length >= 33 && bytes.subarray(0, 8).equals(pngSignature) &&
      bytes.readUInt32BE(8) === 13 && bytes.toString("ascii", 12, 16) === "IHDR") {
    return { mimeType: "image/png", extension: ".png" };
  }
  if (bytes.length >= 6 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
      bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
    return { mimeType: "image/jpeg", extension: ".jpg" };
  }
  return null;
}

export function displayFileName(original: string, extension: string) {
  const leaf = original.split(/[\\/]/).at(-1) ?? "";
  const safe = leaf.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, "").trim();
  const base = Array.from(safe.replace(/\.[^.]+$/, "")).slice(0, 160).join("").trim();
  return `${base || "invoice"}${extension}`;
}
