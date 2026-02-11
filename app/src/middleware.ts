import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// CORS headers (duplicated from helpers.ts — middleware runs in Edge Runtime
// and cannot import from @gastrowheel/data which uses heavy Node.js modules)
// ---------------------------------------------------------------------------

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

// ---------------------------------------------------------------------------
// Upstash rate limiting via REST API (no SDK — Edge Runtime compatible)
// ---------------------------------------------------------------------------

const RATE_LIMIT = 60; // requests per window
const WINDOW_MS = 60_000; // 1 minute

async function checkRateLimit(ip: string): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
} | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const now = Date.now();
  const window = Math.floor(now / WINDOW_MS);
  const key = `gastrowheel:${ip}:${window}`;
  const reset = (window + 1) * WINDOW_MS;

  try {
    // INCR the counter and set TTL in a pipeline
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(WINDOW_MS)],
      ]),
    });

    if (!res.ok) return null;

    const results = (await res.json()) as { result: number }[];
    const count = results[0].result;
    const remaining = Math.max(0, RATE_LIMIT - count);

    return { success: count <= RATE_LIMIT, remaining, reset };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  // Let CORS preflight through without auth or rate limiting
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  // --- Layer 2: API key check ---
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const provided = request.headers.get("x-api-key");
    if (provided !== apiKey) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401, headers: corsHeaders },
      );
    }
  }

  // --- Layer 3: Rate limiting ---
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";

  const result = await checkRateLimit(ip);

  if (result) {
    const rateLimitHeaders: Record<string, string> = {
      "X-RateLimit-Limit": String(RATE_LIMIT),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
    };

    if (!result.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders,
            "Retry-After": String(
              Math.ceil((result.reset - Date.now()) / 1000),
            ),
          },
        },
      );
    }

    const response = NextResponse.next();
    for (const [key, value] of Object.entries(rateLimitHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
