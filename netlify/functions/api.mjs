import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual, randomUUID } from "node:crypto";

const store = () => getStore("suhaeng");
const MAX_FILE = 4.5 * 1024 * 1024;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const sha = (s) => createHash("sha256").update(String(s)).digest();
const dec = (s) => { try { return decodeURIComponent(s || ""); } catch { return ""; } };

function isAdmin(req) {
  const pw = process.env.ADMIN_PASSWORD;
  const id = process.env.ADMIN_ID || "admin";
  if (!pw) return false;
  const a = dec(req.headers.get("x-admin-id"));
  const b = dec(req.headers.get("x-admin-pw"));
  return timingSafeEqual(sha(a), sha(id)) && timingSafeEqual(sha(b), sha(pw));
}

const EMPTY = { title: "학교 서비스", notice: "", items: [], exams: [], mealSheets: [], events: [], meals: {}, updatedAt: null };
const INLINE_OK = /^image\/(jpeg|png|webp|gif)$/;

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  const parts = path.split("/").filter(Boolean);
  const s = store();

  try {
    // 공개: 데이터 읽기
    if (req.method === "GET" && parts[0] === "data") {
      const data = (await s.get("data", { type: "json" })) || EMPTY;
      return json(data);
    }

    // 공개: 파일 다운로드
    if (req.method === "GET" && parts[0] === "file" && parts[1]) {
      const r = await s.getWithMetadata("file-" + parts[1], { type: "arrayBuffer" });
      if (!r) return json({ error: "파일을 찾을 수 없어요" }, 404);
      const name = r.metadata?.name || "download";
      const type = r.metadata?.type || "application/octet-stream";
      const inline = url.searchParams.get("inline") === "1" && INLINE_OK.test(type);
      return new Response(r.data, {
        headers: {
          "content-type": type,
          "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
          "x-content-type-options": "nosniff",
          "cache-control": "public, max-age=300",
        },
      });
    }

    // 로그인 확인
    if (req.method === "POST" && parts[0] === "login") {
      if (!process.env.ADMIN_PASSWORD)
        return json({ error: "서버에 ADMIN_PASSWORD 환경변수가 설정되지 않았어요" }, 500);
      const body = await req.json().catch(() => ({}));
      const fake = new Request(req.url, {
        headers: { "x-admin-id": encodeURIComponent(body.id || ""), "x-admin-pw": encodeURIComponent(body.pw || "") },
      });
      return isAdmin(fake) ? json({ ok: true }) : json({ error: "아이디 또는 비밀번호가 달라요" }, 401);
    }

    // 이하 관리자 전용
    if (!isAdmin(req)) return json({ error: "관리자만 할 수 있어요" }, 401);

    if (req.method === "PUT" && parts[0] === "data") {
      const text = await req.text();
      if (text.length > 1_000_000) return json({ error: "데이터가 너무 커요" }, 413);
      const body = JSON.parse(text);
      if (!body || !Array.isArray(body.items)) return json({ error: "잘못된 데이터예요" }, 400);
      const arr = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
      const meals = body.meals && typeof body.meals === "object" && !Array.isArray(body.meals)
        ? Object.fromEntries(Object.entries(body.meals).slice(0, 1000)) : {};
      const clean = {
        title: String(body.title || "학교 서비스").slice(0, 100),
        notice: String(body.notice || "").slice(0, 2000),
        items: body.items.slice(0, 300),
        exams: arr(body.exams, 300),
        mealSheets: arr(body.mealSheets, 100),
        events: arr(body.events, 1500),
        meals,
        updatedAt: new Date().toISOString(),
      };
      await s.setJSON("data", clean);
      return json({ ok: true, updatedAt: clean.updatedAt });
    }

    if (req.method === "POST" && parts[0] === "upload") {
      const buf = await req.arrayBuffer();
      if (buf.byteLength > MAX_FILE) return json({ error: "파일은 4.5MB 이하만 올릴 수 있어요" }, 413);
      const id = randomUUID();
      await s.set("file-" + id, buf, {
        metadata: {
          name: (url.searchParams.get("name") || "file").slice(0, 200),
          type: url.searchParams.get("type") || "application/octet-stream",
        },
      });
      return json({ id, size: buf.byteLength });
    }

    if (req.method === "DELETE" && parts[0] === "file" && parts[1]) {
      await s.delete("file-" + parts[1]);
      return json({ ok: true });
    }

    return json({ error: "없는 주소예요" }, 404);
  } catch (e) {
    return json({ error: "서버 오류: " + (e?.message || e) }, 500);
  }
};

export const config = { path: ["/api", "/api/*"] };
