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
      return Buffer.from(content, 'binary');
    }
  }
  throw new Error('File topilmadi.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'OPENAI_API_KEY sozlanmagan.' }));
  }

  const contentType = req.headers['content-type'] || '';
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const fileBuffer = parseMultipartFormData(body, contentType);

  const formData = new FormData();
  formData.append('model', 'gpt-4o-mini-transcribe');
  formData.append('file', new Blob([fileBuffer]), 'speech.webm');
  formData.append('language', 'ar');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    res.statusCode = response.status;
    return res.end(JSON.stringify({ error: payload?.error?.message || 'Transkripsiya xatosi.' }));
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ text: payload.text || '' }));
}
