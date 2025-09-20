/**
 * Return an SVG with an emoji as a favicon
 */
export function createEmojiFaviconResponse(): Response {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:56px;line-height:64px;display:flex;align-items:center;justify-content:center">😈</div>
  </foreignObject>
</svg>`;

  const headers = new Headers({
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
  });

  return new Response(svg, { status: 200, headers });
}
