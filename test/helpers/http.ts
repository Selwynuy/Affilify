export function makeNextRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init)
}

export async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T
}
