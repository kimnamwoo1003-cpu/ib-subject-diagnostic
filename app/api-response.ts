export const GITHUB_PAGES_ORIGIN = "https://kimnamwoo1003-cpu.github.io";

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== GITHUB_PAGES_ORIGIN) return {};
  return {
    "access-control-allow-origin": GITHUB_PAGES_ORIGIN,
    "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
}

export function apiJson(request: Request, data: unknown, init: ResponseInit = {}) {
  const response = Response.json(data, init);
  for (const [key, value] of Object.entries(corsHeaders(request))) response.headers.set(key, value);
  return response;
}

export function apiOptions(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
