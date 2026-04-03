import type { ParsedFetch } from './parser';

function tryPrettyJSON(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch (e) {
    return s;
  }
}

function shouldRedact(key: string, redactList: string[]) {
  if (!redactList || redactList.length === 0) return false;
  const lk = key.toLowerCase();
  return redactList.some((r) => r === '*' || r.toLowerCase() === lk);
}

export function formatReadableReport(
  parsed: ParsedFetch,
  status: number,
  responseHeaders: Record<string, string>,
  responseBody: string,
  durationMs: number,
  redactHeaders: string[] = []
): string {
  const lines: string[] = [];
  lines.push('==== Request ====');
  lines.push(`${parsed.method} ${parsed.url}`);
  lines.push('');
  lines.push('Headers:');
  if (Object.keys(parsed.headers || {}).length === 0) lines.push('(none)');
  else {
    for (const k of Object.keys(parsed.headers)) {
      const v = shouldRedact(k, redactHeaders) ? '<REDACTED>' : parsed.headers[k];
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('');
  lines.push('Body:');
  if (parsed.body === undefined) lines.push('(empty)');
  else if (typeof parsed.body === 'string') lines.push(parsed.body);
  else lines.push(JSON.stringify(parsed.body, null, 2));
  lines.push('');
  lines.push('==== Response ====');
  lines.push(`Status: ${status} (${durationMs} ms)`);
  lines.push('');
  lines.push('Response Headers:');
  if (Object.keys(responseHeaders || {}).length === 0) lines.push('(none)');
  else {
    for (const k of Object.keys(responseHeaders)) {
      const v = shouldRedact(k, redactHeaders) ? '<REDACTED>' : responseHeaders[k];
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('');
  lines.push('Response Body:');
  lines.push(tryPrettyJSON(responseBody));
  return lines.join('\n');
}
