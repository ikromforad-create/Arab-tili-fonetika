function parseMultipartFormData(bodyBuffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!match) throw new Error('Boundary topilmadi.');
  const boundary = `--${match[1] || match[2]}`;
  const body = bodyBuffer.toString('binary');
  const parts = body.split(boundary).filter((part) => part.trim() && part.trim() !== '--');
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = part.slice(0, headerEnd);
    const content = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));
    if (/name="file"/i.test(headers)) {
      // Preserve the browser's actual content-type for this part (e.g.
      // audio/webm;codecs=opus on Android, audio/mp4 on iOS Safari) so we can
      // forward the file to OpenAI with a matching extension/type instead of
      // always pretending it's webm.
      const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headers);
      const fileContentType = (typeMatch ? typeMatch[1].trim() : '') || 'application/octet-stream';
      return { buffer: Buffer.from(content, 'binary'), contentType: fileContentType };
    }
  }
  throw new Error('File topilmadi.');
}

function extensionForContentType(contentType) {
  const type = (contentType || '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  return 'webm';
}

// OpenAI can be slow; without a hard timeout, a stalled upstream request
// leaves the client's fetch() hanging with no feedback at all (this is what
// made the app look "stuck" on some Android devices even after the frontend
// recording bug was fixed).
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  // Wrap everything: any uncaught exception here previously crashed the
  // function without sending a proper JSON response, which the frontend
  // could not distinguish from a hang.
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'OPENAI_API_KEY sozlanmagan.' }));
    }

    const contentType = req.headers['content-type'] || '';
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    let file;
    try {
      file = parseMultipartFormData(body, contentType);
    } catch (parseError) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: parseError.message || 'Audio faylni o\u02bbqib bo\u02bblmadi.' }));
    }

    const extension = extensionForContentType(file.contentType);
    const formData = new FormData();
    formData.append('model', 'gpt-4o-mini-transcribe');
    formData.append('file', new Blob([file.buffer], { type: file.contentType }), `speech.${extension}`);
    formData.append('language', 'ar');

    let response;
    try {
      response = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }, 20000);
    } catch (fetchError) {
      res.statusCode = fetchError.name === 'AbortError' ? 504 : 502;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        error: fetchError.name === 'AbortError'
          ? 'Transkripsiya xizmati javob bermadi (timeout).'
          : 'Transkripsiya xizmatiga ulanib bo\u02bblmadi.',
      }));
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.statusCode = response.status;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: payload?.error?.message || 'Transkripsiya xatosi.' }));
    }

    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ text: payload.text || '' }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: error?.message || 'Kutilmagan server xatosi.' }));
  }
}
