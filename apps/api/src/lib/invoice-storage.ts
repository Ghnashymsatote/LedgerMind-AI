import { constants } from "node:fs";
import { mkdir, open, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import type { Readable } from "node:stream";

export interface InvoiceStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  read(key: string): Promise<{ stream: Readable; size: number } | null>;
  remove(key: string): Promise<void>;
}

function isMissing(error: unknown) {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

export function createLocalInvoiceStorage(directory: string): InvoiceStorage {
  const root = resolve(directory);

  function storagePath(key: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(key)) {
      throw new Error("Invalid invoice storage key.");
    }
    return resolve(root, key);
  }

  async function remove(key: string) {
    try {
      await unlink(storagePath(key));
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  return {
    async put(key, bytes) {
      await mkdir(root, { recursive: true, mode: 0o700 });
      const file = await open(storagePath(key), "wx", 0o600);
      try {
        try {
          await file.writeFile(bytes);
        } finally {
          await file.close();
        }
      } catch (error) {
        await remove(key).catch(() => console.error("Could not remove an incomplete invoice file."));
        throw error;
      }
    },

    async read(key) {
      const file = await open(storagePath(key), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch((error: unknown) => {
        if (isMissing(error)) return null;
        throw error;
      });
      if (!file) return null;
      try {
        const info = await file.stat();
        if (!info.isFile()) throw new Error("Invoice storage entry is not a file.");
        return { stream: file.createReadStream(), size: info.size };
      } catch (error) {
        await file.close();
        throw error;
      }
    },

    remove,
  };
}
