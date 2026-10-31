import { z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Read and check a JSON body against a schema. Throws a 400 with a readable message if it does not match. */
export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid request: " + parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  }
  return parsed.data;
}

/** Wrap a route so every failure comes back as { error } with the right status code. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof Error ? e.message : String(e);
      if (status >= 500) console.error(e);
      return Response.json({ error: message }, { status });
    }
  };
}

export function throwIf(error: { message: string } | null, what: string) {
  if (error) throw new HttpError(500, `${what}: ${error.message}`);
}
