export async function readNdjsonStream(
  response: Response,
): Promise<Array<Record<string, unknown>>> {
  const text = await response.text()
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as Record<string, unknown>)
}
