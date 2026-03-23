/**
 * HTTP smoke checks — run while the app is up, e.g.:
 *   pnpm build && pnpm start &
 *   SMOKE_BASE_URL=http://127.0.0.1:3000 pnpm run test:smoke
 */
const base = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

async function postJson(path, body) {
  const r = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.status;
}

let failed = false;

function check(name, pass, detail) {
  if (!pass) {
    failed = true;
    console.error("FAIL:", name, detail ?? "");
  } else {
    console.log("ok:", name);
  }
}

async function main() {
  console.log("SMOKE_BASE_URL=", base);

  // Do not follow redirects — otherwise final URL is /dashboard and status is 200 (false negative).
  const root = await fetch(`${base}/`, { redirect: "manual" });
  check(
    "GET / redirects to dashboard",
    [301, 302, 307, 308].includes(root.status),
    `got ${root.status}${root.headers.get("location") ? ` → ${root.headers.get("location")}` : ""}`,
  );

  const dash = await fetch(`${base}/dashboard`);
  check("GET /dashboard 200", dash.status === 200, `got ${dash.status}`);

  const scoutEmpty = await postJson("/api/scout", {});
  check("POST /api/scout {} -> 400", scoutEmpty === 400, `got ${scoutEmpty}`);

  const queenEmpty = await postJson("/api/queen", {});
  check("POST /api/queen {} -> 400", queenEmpty === 400, `got ${queenEmpty}`);

  const treasurer = await fetch(`${base}/api/treasurer`);
  check(
    "GET /api/treasurer responds",
    treasurer.status === 200 || treasurer.status === 500,
    `got ${treasurer.status}`,
  );

  const campaigns = await fetch(`${base}/api/campaigns`);
  const campaignsDetail =
    campaigns.status === 404
      ? "got 404 — production may be an older deploy; push latest main (apps/web/src/app/api/campaigns)"
      : `got ${campaigns.status}`;
  check(
    "GET /api/campaigns responds",
    campaigns.status === 200 || campaigns.status === 500,
    campaignsDetail,
  );

  // Valid UUID v4 shape, unlikely to exist → 404
  const land = await fetch(
    `${base}/l/11111111-1111-4111-9111-111111111111`,
  );
  check(
    "GET /l/[missing] not 200",
    land.status !== 200,
    `got ${land.status} (expect 404 or 5xx if DB unset)`,
  );

  if (failed) {
    process.exit(1);
  }
  console.log("all smoke checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
