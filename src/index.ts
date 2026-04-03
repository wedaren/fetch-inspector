import { runFromClipboard } from './run';

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

(async function main(){
  const redactList = parseRedactArg();
  const jsonOut = process.argv.slice(2).some((a) => a === '--json');
  try{
    const result = await runFromClipboard(redactList);
    if (jsonOut) {
      const redactAll = redactList.includes('*');
      const redactHeader = (k: string) => redactAll || redactList.includes(k.toLowerCase());
      const parsedHeaders = { ...(result.parsed.headers || {}) } as Record<string, any>;
      const responseHeaders = { ...(result.responseHeaders || {}) } as Record<string, any>;
      for (const k of Object.keys(parsedHeaders)) if (redactHeader(k)) parsedHeaders[k] = '<REDACTED>';
      for (const k of Object.keys(responseHeaders)) if (redactHeader(k)) responseHeaders[k] = '<REDACTED>';

      const out = {
        parsed: { ...result.parsed, headers: parsedHeaders },
        status: result.status,
        responseHeaders,
        responseBody: result.responseBody,
        duration: result.duration,
        report: result.report,
      };
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.log(result.report);
    }
  }catch(e:any){
    console.error('ERROR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
