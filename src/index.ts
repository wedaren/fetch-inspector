import { parseFetchSnippet } from './parser';
import clipboardy from 'clipboardy';
import { fetch } from 'undici';
import { formatReadableReport } from './report';

function parseRedactArg(): string[] {
  const argv = process.argv.slice(2);
  let list: string[] = [];
  for (const a of argv) {
    if (a.startsWith('--redact=')) {
      list = a.split('=')[1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      break;
    }
  }
  if (list.length === 0 && process.env.REDACT_HEADERS) {
    list = process.env.REDACT_HEADERS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  return list;
}

async function main() {
  const redactList = parseRedactArg();
  const clip = await clipboardy.read();
  if (!clip || clip.trim().length === 0) {
    console.error('Clipboard is empty');
    process.exit(1);
  }

  let parsed;
  try {
    parsed = parseFetchSnippet(clip);
  } catch (err: any) {
    console.error('Failed to parse fetch snippet:', err.message || err);
    process.exit(1);
  }

  const options: any = { method: parsed.method.toUpperCase(), headers: parsed.headers || {} };
  if (parsed.body !== undefined) {
    if (typeof parsed.body === 'object') {
      // 如果是对象，优先按 JSON stringify
      options.body = JSON.stringify(parsed.body);
    } else {
      options.body = String(parsed.body);
    }
  }

  const start = Date.now();
  let res;
  try {
    res = await fetch(parsed.url, options);
  } catch (err: any) {
    console.error('Request failed:', err.message || err);
    process.exit(1);
  }
  const duration = Date.now() - start;

  const respHeaders: Record<string, string> = {};
  // undici 的 headers 遵循 WHATWG Headers
  res.headers.forEach((v: string, k: string) => {
    respHeaders[k] = v;
  });

  const respText = await res.text();
  const report = formatReadableReport(parsed as any, res.status, respHeaders, respText, duration, redactList);
  console.log(report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
