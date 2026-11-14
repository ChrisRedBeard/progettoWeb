export function parseByteRange(header: string | null, size: number): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size <= 0) return "unsatisfiable";
  const rawStart = match[1] ?? "";
  const rawEnd = match[2] ?? "";
  if (rawStart === "" && rawEnd === "") return "unsatisfiable";
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0) return "unsatisfiable";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(rawStart);
  const end = rawEnd === "" ? size - 1 : Number(rawEnd);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || start > end) {
    return "unsatisfiable";
  }
  return { start, end: Math.min(end, size - 1) };
}

export function fileResponse(input: {
  size: number;
  mime: string;
  range: string | null;
  head: boolean;
  open: (start: number, end: number) => ReadableStream;
}) {
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": input.mime,
    "Cache-Control": "private, max-age=0",
  });
  if (input.size === 0) {
    headers.set("Content-Length", "0");
    return new Response(input.head ? null : new Uint8Array(), { status: 200, headers });
  }
  const range = parseByteRange(input.range, input.size);
  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${input.size}`);
    return new Response(null, { status: 416, headers });
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? input.size - 1;
  headers.set("Content-Length", String(end - start + 1));
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${input.size}`);
  const status = range ? 206 : 200;
  if (input.head) return new Response(null, { status, headers });
  return new Response(input.open(start, end), { status, headers });
}
