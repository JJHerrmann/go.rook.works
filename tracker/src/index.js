const SLUG_PATTERN = /^(?:bl|rc)-[0-9a-f]{8}(?:-[a-z0-9]{2,8})?$/;

export function validSlug(value) {
  return SLUG_PATTERN.test(value);
}

export function platformFor(slug) {
  const pieces = slug.split("-");
  return pieces.length === 3 ? pieces[2] : "unspecified";
}

export function referrerHost(value) {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase().slice(0, 255);
  } catch {
    return null;
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Cache-Control": "no-store",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    if (request.method === "POST" && url.pathname.startsWith("/hit/")) {
      const slug = decodeURIComponent(url.pathname.slice(5)).replace(/\/$/, "");
      if (!validSlug(slug)) return json({ error: "invalid slug" }, 400);

      // Store only the campaign slug, broad platform code, referring hostname,
      // and timestamp. No IP, cookie, full URL, or user-agent is retained.
      await env.CLICKS.prepare(
        "INSERT INTO clicks (slug, platform, referrer_host, clicked_at) VALUES (?1, ?2, ?3, ?4)"
      )
        .bind(slug, platformFor(slug), referrerHost(request.headers.get("Referer")), new Date().toISOString())
        .run();

      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === "GET" && url.pathname.startsWith("/count/")) {
      const slug = decodeURIComponent(url.pathname.slice(7)).replace(/\/$/, "");
      if (!validSlug(slug)) return json({ error: "invalid slug" }, 400);
      const row = await env.CLICKS.prepare(
        "SELECT COUNT(*) AS clicks, MAX(clicked_at) AS last_clicked_at FROM clicks WHERE slug = ?1"
      )
        .bind(slug)
        .first();
      return json({ slug, clicks: Number(row?.clicks || 0), last_clicked_at: row?.last_clicked_at || null });
    }

    if (request.method === "GET" && url.pathname === "/stats") {
      if (!env.STATS_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.STATS_TOKEN}`) {
        return json({ error: "unauthorized" }, 401);
      }
      const rows = await env.CLICKS.prepare(
        `SELECT slug, platform, COUNT(*) AS clicks, MAX(clicked_at) AS last_clicked_at
         FROM clicks GROUP BY slug, platform ORDER BY last_clicked_at DESC`
      ).all();
      return json({ results: rows.results || [] });
    }

    return json({ error: "not found" }, 404);
  },
};
