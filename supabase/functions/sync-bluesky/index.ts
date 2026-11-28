// Supabase Edge Function scaffold: scheduled Bluesky XRPC ingestion
// Deploy with: supabase functions deploy sync-bluesky
// Schedule via Supabase Dashboard / pg_cron every 30 minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BSKY_PUBLIC_API = "https://public.api.bsky.app/xrpc";
const COMMISSIONS_FEED =
  "at://did:plc:odqmsar3ikz5ubokya4sempk/app.bsky.feed.generator/aaahudddd6mww";

const adultLabels = new Set(["porn", "sexual", "nudity", "graphic-media", "nsfw"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Load opted-out handles & DIDs
    const { data: optOuts } = await supabase
      .from("opt_out_registry")
      .select("handle, external_id")
      .eq("platform", "bluesky");

    const blockedHandles = new Set(
      (optOuts ?? []).map((o) => (o.handle ?? "").toLowerCase().replace(/^@/, "")),
    );
    const blockedDids = new Set((optOuts ?? []).map((o) => o.external_id).filter(Boolean));

    // 2. Fetch latest posts from the curated Art: Commissions Bluesky feed
    const feedUrl = `${BSKY_PUBLIC_API}/app.bsky.feed.getFeed?feed=${encodeURIComponent(
      COMMISSIONS_FEED,
    )}&limit=50`;
    const feedRes = await fetch(feedUrl, {
      headers: { "User-Agent": "ArtFind/0.1 (+https://github.com/gOps132/ArtFind)" },
    });

    if (!feedRes.ok) {
      throw new Error(`Bluesky getFeed failed: ${feedRes.status}`);
    }

    const feedJson = await feedRes.json();
    const items = feedJson.feed ?? [];

    let processed = 0;
    for (const item of items) {
      const post = item.post;
      const author = post?.author;
      if (!author?.did || !author?.handle) continue;

      const handleLower = author.handle.toLowerCase();
      if (blockedDids.has(author.did) || blockedHandles.has(handleLower)) continue;

      const text: string = post.record?.text ?? "";
      if (/#noartfind/i.test(text) || /commissions?\s*closed|#commissionsclosed/i.test(text)) {
        continue;
      }

      const labelledAdult = [post.labels, author.labels].some((labels) =>
        Array.isArray(labels) && labels.some((label) =>
          typeof label?.val === "string" && adultLabels.has(label.val.toLowerCase()) && !label.neg
        )
      );

      const profileUrl = `https://bsky.app/profile/${author.handle}`;
      const rkey = (post.uri ?? "").split("/").pop();
      const postUrl = rkey ? `${profileUrl}/post/${rkey}` : profileUrl;

      const { data: artistRow, error: artistErr } = await supabase
        .from("artists")
        .upsert(
          {
            display_name: author.displayName || author.handle,
            bio_snippet: text.slice(0, 260),
            avatar_url: author.avatar ?? null,
            artist_page_url: profileUrl,
            artist_page_type: "bluesky",
            commission_status: "open",
            ...(labelledAdult ? { content_rating: "nsfw" } : {}),
            source_platform: "bluesky",
            source_handle: author.handle,
            source_profile_url: profileUrl,
            source_post_url: postUrl,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "artist_page_url" },
        )
        .select("id")
        .single();

      if (artistErr || !artistRow) continue;

      await supabase.from("source_profiles").upsert(
        {
          artist_id: artistRow.id,
          platform: "bluesky",
          external_id: author.did,
          handle: author.handle,
          profile_url: profileUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "platform,external_id" },
      );

      processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
