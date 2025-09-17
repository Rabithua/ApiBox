/**
 * 返回一个包含 emoji 的 SVG，用作 favicon
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
    // 缓存一小时
    "Cache-Control": "public, max-age=3600",
    // 允许跨域直接请求（通常favicon不需要，但保持安全）
    "Access-Control-Allow-Origin": "*",
  });

  return new Response(svg, { status: 200, headers });
}
