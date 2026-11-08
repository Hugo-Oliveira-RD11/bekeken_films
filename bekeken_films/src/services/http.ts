export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Remove chaves de API da URL antes de colocá-la em mensagens de erro/logs. */
export function redact(url: URL): string {
  const copy = new URL(url.toString());
  for (const k of ['api_key', 'apiKey']) {
    if (copy.searchParams.has(k)) copy.searchParams.set(k, '***');
  }
  return copy.toString();
}

async function fetchWithTimeout(url: URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url.toString(), { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** GET JSON com timeout e 1 nova tentativa para 429/5xx/queda de rede. */
export async function getJson<T>(
  url: URL,
  headers: Record<string, string> = {},
  opts: { retries?: number; timeoutMs?: number; retryDelayMs?: number } = {},
): Promise<T> {
  const { retries = 1, timeoutMs = 10_000, retryDelayMs = 500 } = opts;
  let last: HttpError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json', ...headers } }, timeoutMs);
      if (res.ok) return (await res.json()) as T;
      last = new HttpError(res.status, `${res.status} ${res.statusText} em ${redact(url)}`);
      if (res.status !== 429 && res.status < 500) throw last; // 4xx: repetir não adianta
    } catch (err) {
      if (err instanceof HttpError && err.status !== 429 && err.status < 500) throw err;
      if (!(err instanceof HttpError)) last = new HttpError(0, 'Sem conexão com a internet.');
    }
    if (attempt < retries) await sleep(retryDelayMs);
  }
  throw last ?? new HttpError(0, 'Sem conexão com a internet.');
}
