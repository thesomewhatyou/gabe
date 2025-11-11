import { Buffer } from "node:buffer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { img } from "./imageLib.ts";
import type { ImageParams } from "./types.ts";

// Maximum image size to prevent memory issues (40MB)
const MAX_IMAGE_SIZE = 41943040;

export default async function run(object: ImageParams): Promise<{ buffer: Buffer; fileExtension: string }> {
  // Check if command exists
  if (!img.funcs.includes(object.cmd)) {
    return {
      buffer: Buffer.alloc(0),
      fileExtension: "nocmd",
    };
  }

  let inputBuffer: ArrayBuffer | null = null;
  if (object.path) {
    // If the image has a path, it must also have a type
    if (object.input?.type !== "image/gif" && object.input?.type !== "image/webp" && object.onlyAnim) {
      return {
        buffer: Buffer.alloc(0),
        fileExtension: "noanim",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);
    try {
      const res = await fetch(object.path, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.status === 429) throw "ratelimit";

      // Check content length to prevent downloading excessively large files
      const contentLength = res.headers.get("content-length");
      if (contentLength) {
        const size = Number.parseInt(contentLength);
        if (size > MAX_IMAGE_SIZE) {
          return {
            buffer: Buffer.alloc(0),
            fileExtension: "large",
          };
        }
      }

      inputBuffer = await res.arrayBuffer();

      // Double-check actual size after download
      if (inputBuffer.byteLength > MAX_IMAGE_SIZE) {
        return {
          buffer: Buffer.alloc(0),
          fileExtension: "large",
        };
      }
    } catch (e) {
      if (typeof e !== "string") throw e;
      return {
        buffer: Buffer.alloc(0),
        fileExtension: e,
      };
    }
  }

  // Convert from a MIME type (e.g. "image/png") to something the image processor understands (e.g. "png").
  // Don't set `type` directly on the object we are passed as it will be read afterwards.
  // If no image type is given (say, the command generates its own image), make it a PNG.
  const fileExtension = object.input?.type?.split("/")[1] ?? "png";

  if (object.input) {
    if (inputBuffer) object.input.data = inputBuffer;
    object.input.type = fileExtension;
  }
  object.params.basePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../");

  // Ensure input.data is an ArrayBuffer (native bindings expect ArrayBuffer, not Buffer/TypedArray)
  if (object.input?.data) {
    const rawData = object.input.data as unknown;
    if (Buffer.isBuffer(rawData)) {
      const buf = rawData as Buffer;
      object.input.data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } else if (ArrayBuffer.isView(rawData as ArrayBufferView)) {
      const view = rawData as ArrayBufferView;
      object.input.data = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
    }
  }

  const { data, type } = await img.image(object.cmd, object.params, object.input ?? {});
  return {
    buffer: data,
    fileExtension: type,
  };
}
