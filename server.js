"use strict";
/* HM TECH – serveur autonome (Node.js 18+, aucune dépendance à installer) */
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const ROOT = __dirname, PUB = path.join(ROOT, "public"), DATA = process.env.DATA_DIR || path.join(ROOT, "data");
const UP = path.join(DATA, "uploads"), DBF = path.join(DATA, "db.json");
fs.mkdirSync(UP, { recursive: true });

function save() { const t = DBF + ".tmp"; fs.writeFileSync(t, JSON.stringify(db)); fs.renameSync(t, DBF); }
let db;
try { db = JSON.parse(fs.readFileSync(DBF, "utf8")); }
catch (e) {
  let seed = { shop: "HM TECH", slogan: "", hello: "", wa: "213000000000", cats: [{ id: "produits", nom: "Produits", emo: "📦" }], items: [] };
  try { seed = JSON.parse(fs.readFileSync(path.join(ROOT, "seed.json"), "utf8")); } catch (e2) {}
  db = Object.assign({}, seed, { admin: null }); save();
}

/* ---- mot de passe administrateur ---- */
function hashPw(pw, salt) { salt = salt || crypto.randomBytes(16).toString("hex"); return { salt, hash: crypto.scryptSync(pw, salt, 64).toString("hex") }; }
function checkPw(pw, a) {
  const x = Buffer.from(crypto.scryptSync(pw, a ? a.salt : "0", 64).toString("hex"));
  const y = Buffer.from(a ? a.hash : "0".repeat(128));
  return !!a && x.length === y.length && crypto.timingSafeEqual(x, y);
}
function setAdmin(email, pw) { db.admin = Object.assign({ email: String(email).trim().toLowerCase() }, hashPw(pw)); save(); }
function okEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

if (process.argv[2] === "set-admin") {
  const e = process.argv[3], p = process.argv[4];
  if (!okEmail(e || "") || !p || p.length < 10) { console.log("Usage : node server.js set-admin votre@email.com MotDePasse (10 caractères minimum)"); process.exit(1); }
  setAdmin(e, p); console.log("Administrateur enregistré : " + e); process.exit(0);
}
const DEFAULT_MAP = "https://maps.app.goo.gl/oEHTAvb2Uj4m4W9y7?g_st=ic";
if (db.map === undefined) { db.map = DEFAULT_MAP; db.addr = db.addr || ""; save(); }
if (!db.admin && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 10) setAdmin(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
if (!db.admin) console.log("ATTENTION : aucun administrateur. Lancez : node server.js set-admin votre@email.com MotDePasse");

/* ---- sessions et limite de tentatives ---- */
const sess = new Map(), tries = new Map();
function cookie(req, n) { const m = (req.headers.cookie || "").split(/;\s*/).map(s => s.split("=")).find(a => a[0] === n); return m ? m[1] : ""; }
function authed(req) { const t = cookie(req, "sid"), e = sess.get(t); if (e && e > Date.now()) return true; sess.delete(t); return false; }
function ipOf(req) { return (process.env.TRUST_PROXY ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() : "") || req.socket.remoteAddress; }
setInterval(() => { const n = Date.now(); sess.forEach((v, k) => { if (v < n) sess.delete(k); }); tries.forEach((v, k) => { if (v.t < n) tries.delete(k); }); }, 600000).unref();

/* ---- utilitaires ---- */
const HEAD = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src https://www.google.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin"
};
function send(res, code, data, type, extra) {
  res.writeHead(code, Object.assign({ "Content-Type": type || "application/json; charset=utf-8" }, HEAD, extra || {}));
  res.end(typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data));
}
function fail(code, msg) { return Object.assign(new Error(msg), { code }); }
function readBody(req, max) {
  return new Promise((ok, ko) => {
    let n = 0; const c = [];
    req.on("data", d => { n += d.length; if (n > max) { ko(fail(413, "Données trop volumineuses")); req.destroy(); return; } c.push(d); });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(c).toString() || "{}")); } catch (e) { ko(fail(400, "JSON invalide")); } });
    req.on("error", ko);
  });
}
const str = (v, m) => typeof v === "string" ? v.slice(0, m) : "";
const slug = (v, m) => str(String(v == null ? "" : v), m).replace(/[^a-z0-9]/gi, "");

function photo(v) {
  if (typeof v !== "string" || !v) return "";
  if (/^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(v)) return fs.existsSync(path.join(UP, path.basename(v))) ? v : "";
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+\/=]+)$/.exec(v);
  if (!m) return "";
  const b = Buffer.from(m[2], "base64");
  if (b.length > 3e6) throw fail(413, "Photo trop lourde (3 Mo maximum)");
  const ok = (m[1] === "jpeg" && b[0] === 0xff && b[1] === 0xd8) || (m[1] === "png" && b.slice(1, 4).toString() === "PNG") || (m[1] === "webp" && b.slice(0, 4).toString() === "RIFF");
  if (!ok) return "";
  const name = crypto.randomBytes(12).toString("hex") + "." + (m[1] === "jpeg" ? "jpg" : m[1]);
  fs.writeFileSync(path.join(UP, name), b);
  return "/uploads/" + name;
}
function clean(b) {
  if (!b || !Array.isArray(b.cats) || !Array.isArray(b.items)) throw fail(400, "Données invalides");
  const cats = b.cats.slice(0, 20).map(c => ({ id: slug(c.id, 30), nom: str(c.nom, 40), emo: str(c.emo, 8) })).filter(c => c.id);
  const ids = new Set(cats.map(c => c.id));
  const items = b.items.slice(0, 500).filter(p => ids.has(p.cat)).map(p => ({
    id: slug(p.id, 30) || crypto.randomBytes(4).toString("hex"), cat: p.cat, nom: str(p.nom, 120),
    prix: Math.max(0, Math.min(1e9, Number(p.prix) || 0)), dispo: !!p.dispo, desc: str(p.desc, 1500), k: str(p.k, 200), photo: photo(p.photo)
  }));
  return { shop: str(b.shop, 60) || "Boutique", slogan: str(b.slogan, 200), hello: str(b.hello, 200), wa: str(b.wa, 20).replace(/\D/g, ""), addr: str(b.addr, 200), map: /^https:\/\//.test(str(b.map, 500)) ? str(b.map, 500) : "", cats, items };
}
const pub = () => ({ shop: db.shop, slogan: db.slogan, hello: db.hello, wa: db.wa, addr: db.addr || "", map: db.map || "", cats: db.cats, items: db.items });

/* ---- API ---- */
async function api(req, res, u) {
  const m = req.method;
  if (m !== "GET") {
    const o = req.headers.origin;
    if (!req.headers["x-requested-with"] || (o && new URL(o).host !== req.headers.host)) return send(res, 403, { error: "Requête refusée" });
  }
  if (m === "GET" && u === "/api/public") return send(res, 200, pub(), null, { "Cache-Control": "no-store" });

  if (m === "POST" && u === "/api/login") {
    const ip = ipOf(req), t = tries.get(ip) || { n: 0, t: Date.now() + 900000 };
    if (t.n >= 8) return send(res, 429, { error: "Trop de tentatives. Réessayez dans 15 minutes." });
    const b = await readBody(req, 1e4);
    const ok = !!db.admin && String(b.email || "").trim().toLowerCase() === db.admin.email & checkPw(String(b.password || ""), db.admin);
    if (!ok) { t.n++; tries.set(ip, t); await new Promise(r => setTimeout(r, 500)); return send(res, 401, { error: db.admin ? "E-mail ou mot de passe incorrect." : "Aucun administrateur configuré sur le serveur." }); }
    tries.delete(ip);
    const tok = crypto.randomBytes(32).toString("hex"); sess.set(tok, Date.now() + 12 * 3600e3);
    const sec = req.socket.encrypted || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
    return send(res, 200, { ok: true }, null, { "Set-Cookie": "sid=" + tok + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200" + sec });
  }
  if (m === "POST" && u === "/api/logout") { sess.delete(cookie(req, "sid")); return send(res, 200, { ok: true }, null, { "Set-Cookie": "sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" }); }

  if (!u.startsWith("/api/admin/")) return send(res, 404, { error: "Introuvable" });
  if (!authed(req)) return send(res, 401, { error: "Connexion requise" });

  if (m === "GET" && u === "/api/admin/state") return send(res, 200, pub(), null, { "Cache-Control": "no-store" });
  if (m === "PUT" && u === "/api/admin/state") {
    const n = clean(await readBody(req, 12e6));
    Object.assign(db, n); save();
    const used = new Set(n.items.map(p => path.basename(p.photo)));
    fs.readdirSync(UP).forEach(f => { if (!used.has(f)) fs.unlink(path.join(UP, f), () => {}); });
    return send(res, 200, pub());
  }
  if (m === "POST" && u === "/api/admin/password") {
    const b = await readBody(req, 1e4);
    if (!checkPw(String(b.old || ""), db.admin)) return send(res, 400, { error: "Mot de passe actuel incorrect." });
    if (typeof b.new !== "string" || b.new.length < 10) return send(res, 400, { error: "Le nouveau mot de passe doit avoir 10 caractères minimum." });
    setAdmin(db.admin.email, b.new); return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: "Introuvable" });
}

/* ---- fichiers statiques ---- */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon" };
function serve(res, base, rel, extra) {
  const f = path.normalize(path.join(base, rel));
  if (!f.startsWith(base + path.sep)) return send(res, 403, "Interdit", "text/plain");
  fs.readFile(f, (e, d) => e ? send(res, 404, "Page introuvable", "text/plain; charset=utf-8") : send(res, 200, d, MIME[path.extname(f)] || "application/octet-stream", extra));
}

http.createServer(async (req, res) => {
  try {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (u.startsWith("/api/")) return await api(req, res, u);
    if (u === "/admin" || u === "/admin/") return serve(res, PUB, "admin.html", { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
    if (u.startsWith("/uploads/")) return serve(res, UP, u.slice(9), { "Cache-Control": "public, max-age=31536000, immutable" });
    if (u === "/") return serve(res, PUB, "index.html", { "Cache-Control": "no-cache" });
    return serve(res, PUB, u.slice(1), { "Cache-Control": "no-cache" });
  } catch (e) {
    send(res, e.code >= 400 && e.code < 600 ? e.code : 500, { error: e.code ? e.message : "Erreur du serveur" });
  }
}).listen(PORT, () => console.log("HM TECH en ligne sur http://localhost:" + PORT + "  (administration : /admin)"));
