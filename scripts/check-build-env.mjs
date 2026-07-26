/**
 * 컨테이너 빌드 전 NEXT_PUBLIC_* 확인.
 *
 * NEXT_PUBLIC_* 는 next build 시점에 번들로 인라인되므로, 빌드 환경에 값이
 * 없으면 배포된 앱에서 조용히 기능이 꺼진다 (로그인 불가·계측 no-op).
 * 런타임에 변수를 넣어도 되살릴 수 없고 재빌드가 필요해서, 나가기 전에 막는다.
 *
 * Railway Dockerfile 빌드는 서비스 Variables 를 ARG 로만 넘긴다 — Dockerfile 의
 * ARG 선언이 빠지면 여기서 걸린다.
 *
 * 백엔드 없이 이미지를 만들어야 하면 ALLOW_NO_SUPABASE=1 로 통과시킨다.
 */

const required = [
  {
    name: "Supabase",
    keys: ["NEXT_PUBLIC_SUPABASE_URL"],
    /** publishable 우선, legacy anon 허용 */
    anyOf: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    skipWhen: "ALLOW_NO_SUPABASE",
    impact: "로그인·클라우드 동기화가 꺼진 채 배포됩니다.",
  },
];

const optional = [
  { key: "NEXT_PUBLIC_POSTHOG_KEY", impact: "계측이 no-op 이라 아하 도달률을 볼 수 없습니다." },
  { key: "NEXT_PUBLIC_LEAD_URL", impact: "리드 CTA 가 '곧 연결' 로만 표시됩니다." },
];

const has = (k) => Boolean(process.env[k]?.trim());
const problems = [];

for (const group of required) {
  if (has(group.skipWhen)) {
    console.warn(`[build-env] ${group.name} 생략 (${group.skipWhen}=1) — ${group.impact}`);
    continue;
  }
  const missing = group.keys.filter((k) => !has(k));
  if (group.anyOf && !group.anyOf.some(has)) missing.push(group.anyOf.join(" 또는 "));
  if (missing.length) problems.push({ name: group.name, missing, impact: group.impact, skipWhen: group.skipWhen });
}

for (const { key, impact } of optional) {
  if (!has(key)) console.warn(`[build-env] ${key} 없음 — ${impact}`);
}

if (problems.length) {
  console.error("\n[build-env] 빌드 중단 — 빌드 환경에 필수 NEXT_PUBLIC_* 가 없습니다.\n");
  for (const p of problems) {
    console.error(`  ${p.name}: ${p.missing.join(", ")}`);
    console.error(`    → ${p.impact}`);
  }
  console.error(
    [
      "",
      "확인 순서:",
      "  1) Railway 서비스 Variables 에 값이 있는지",
      "  2) Dockerfile builder 스테이지에 해당 키의 ARG 선언이 있는지",
      "     (Railway 는 Dockerfile 빌드에 Variables 를 ARG 로만 넘긴다)",
      "  3) 값 변경 후 Redeploy — NEXT_PUBLIC_* 는 재빌드해야 반영된다",
      "",
      `백엔드 없이 이미지를 만들려면 ${problems.map((p) => p.skipWhen).join(" / ")}=1`,
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("[build-env] NEXT_PUBLIC_* 확인 통과");
