import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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
// Upstash rate limiter (lazy-initialized)
// ---------------------------------------------------------------------------

let ratelimit: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (ratelimit !== null) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "gastrowheel",
  });
  return ratelimit;
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
  const limiter = await getRateLimiter();
  if (limiter) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";

    try {
      const result = await limiter.limit(ip);

      const rateLimitHeaders: Record<string, string> = {
        "X-RateLimit-Limit": String(result.limit),
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

      // Attach rate limit headers to the response
      const response = NextResponse.next();
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    } catch {
      // Upstash down — let request through
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
