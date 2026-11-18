import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 8787);
const key = process.env.HOSTLINKU_API_KEY?.trim();
const model = process.env.HOSTLINKU_MODEL?.trim();
if (!key || !model) {
  console.error('Set HOSTLINKU_API_KEY and HOSTLINKU_MODEL, then start again.');
  process.exit(1);
}

const html = await readFile(new URL('./index.html', import.meta.url));
const fail = (res, status, message) =>
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(message);

export const server = createServer(async (req, res) => {
  if (req.headers.host !== host + ':' + port) return fail(res, 400, 'Use the printed localhost URL.');
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    return;
  }
  if (req.method !== 'POST' || req.url !== '/chat') return fail(res, 404, 'Not found.');
  if (req.headers['content-type'] !== 'application/json') return fail(res, 415, 'Expected JSON.');

  const chunks = [];
  let size = 0;
  let prompt;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 12_288) return fail(res, 413, 'Prompt is too large.');
      chunks.push(chunk);
    }
    prompt = JSON.parse(Buffer.concat(chunks).toString('utf8'))?.prompt;
  } catch {
    if (!res.destroyed) return fail(res, 400, 'Invalid request body.');
    return;
  }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) {
    return fail(res, 400, 'Enter a prompt of 1–2,000 characters.');
  }

  const abort = new AbortController();
  res.on('close', () => abort.abort());
  try {
    const upstream = await fetch('https://api.hostlinku.com/v1/chat/completions', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(60_000)]),
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 256,
      }),
    });
    const id = upstream.headers.get('x-request-id');
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return fail(res, upstream.status, 'Hostlinku returned HTTP ' + upstream.status + (id ? '. Request ID: ' + id : '.'));
    }
    if (!upstream.body || !upstream.headers.get('content-type')?.startsWith('text/event-stream')) {
      await upstream.body?.cancel();
      return fail(res, 502, 'Hostlinku did not return an event stream.');
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      ...(id ? { 'X-Request-ID': id } : {}),
    });
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch {
    if (!res.headersSent && !res.destroyed) fail(res, 502, 'Could not read the Hostlinku stream.');
  }
}).listen(port, host, () => console.log('Open http://' + host + ':' + port));
