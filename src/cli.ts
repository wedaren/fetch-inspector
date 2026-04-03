import { Command } from 'commander';
import { runFromClipboard, runFromFile, runFromSnippet } from './run';
import { loadSkills } from './pluginLoader';

const program = new Command();

program
  .name('fetch-inspector')
  .description('Parse "copy as fetch (nodejs)" snippets, execute and print readable report')
  .version('0.1.0');

program
  .command('inspect')
  .description('Inspect fetch snippet from clipboard or file and execute')
  .option('-f, --file <path>', 'path to snippet file')
  .option('--snippet <code>', 'inline fetch snippet string')
  .option('--redact <list>', 'comma-separated headers to redact')
  .option('--json', 'output JSON machine-readable result')
  .action(async (opts: any) => {
    const redactList = opts.redact ? opts.redact.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean) : [];
    try {
      let res;
      if (opts.file) res = await runFromFile(opts.file, redactList);
      else if (opts.snippet) res = await runFromSnippet(opts.snippet, redactList);
      else res = await runFromClipboard(redactList);
      if (opts.json) {
        // redact headers in the JSON output if requested
        const redactAll = redactList.includes('*');
        const redactHeader = (k: string) => redactAll || redactList.includes(k.toLowerCase());
        const parsedHeaders = { ...(res.parsed.headers || {}) } as Record<string, any>;
        const responseHeaders = { ...(res.responseHeaders || {}) } as Record<string, any>;
        for (const k of Object.keys(parsedHeaders)) if (redactHeader(k)) parsedHeaders[k] = '<REDACTED>';
        for (const k of Object.keys(responseHeaders)) if (redactHeader(k)) responseHeaders[k] = '<REDACTED>';

        const out = {
          parsed: { ...res.parsed, headers: parsedHeaders },
          status: res.status,
          responseHeaders,
          responseBody: res.responseBody,
          duration: res.duration,
          report: res.report,
        };
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log(res.report);
      }
    } catch (e: any) {
      console.error('ERROR', e && e.message ? e.message : e);
      process.exit(1);
    }
  });

// Dynamic load skills from dist/skills (compiled directory)
try {
  loadSkills(program as Command);
} catch (e: any) {
  // ignore loader failures; CLI still works with built-in commands
}

program.parse(process.argv);

export default program;
