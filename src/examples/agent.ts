import { runFromSnippet } from '../run';

async function main() {
  // Example snippet; replace with real snippet when using in an agent
  const snippet = `fetch('https://httpbin.org/post', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hello: 'world' }) })`;
  try {
    const res = await runFromSnippet(snippet);
    const output = {
      parsed: res.parsed,
      status: res.status,
      responseHeaders: res.responseHeaders,
      responseBody: (() => {
        try { return JSON.parse(res.responseBody); } catch { return res.responseBody; }
      })(),
      duration: res.duration,
      report: res.report,
    };
    console.log(JSON.stringify(output, null, 2));
  } catch (e: any) {
    console.error('Agent example failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

if (require.main === module) main();

export default main;
