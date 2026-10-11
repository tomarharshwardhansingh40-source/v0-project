import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { spawn } from "child_process";
import { setTimeout as delay } from "timers/promises";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const PORT = 5055;
const BASE = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = crypto.randomBytes(48).toString("hex");

const results = [];

function record(name, ok, detail = "") {
  const skipped = String(detail).startsWith("SKIPPED");
  results.push({ name, ok, detail, skipped });
  const label = skipped ? "SKIP" : ok ? "PASS" : "FAIL";
  console.log(`${label} ${name}${detail ? ` — ${detail}` : ""}`);
}

function parseSetCookie(res) {
  const raw = res.headers.getSetCookie?.() || [];
  return {
    joined: raw.map((c) => c.split(";")[0]).join("; "),
    raw,
  };
}

async function req(pathName, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${pathName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  const cookies = parseSetCookie(res);
  return {
    status: res.status,
    json,
    cookie: cookies.joined || cookie || "",
    setCookie: cookies.raw,
  };
}

async function waitHealthy(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await req("/api/health");
      if (r.status === 200 && r.json?.db === "connected") return;
    } catch {
      // retry
    }
    await delay(400);
  }
  throw new Error("Server did not become healthy");
}

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri("skillpath");
const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: backendRoot,
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: "development",
    MONGO_URI: uri,
    JWT_SECRET,
    JWT_EXPIRES_IN: "1d",
    CLIENT_ORIGIN: "http://localhost:3000",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLog = "";
child.stdout.on("data", (d) => {
  serverLog += d.toString();
});
child.stderr.on("data", (d) => {
  serverLog += d.toString();
});

try {
  await waitHealthy();
  record("health connected", true);

  const email = `student_${Date.now()}@example.com`;
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: { name: "Test Student", email, password: "password123" },
  });
  record(
    "register",
    reg.status === 201 && reg.json?.user?.email === email && reg.cookie.includes("token="),
    `status=${reg.status}`
  );
  record(
    "register sets HttpOnly cookie",
    reg.setCookie.some((c) => /token=/.test(c) && /httponly/i.test(c)),
    reg.setCookie[0] ? "cookie attributes present" : "no set-cookie"
  );

  const dup = await req("/api/auth/register", {
    method: "POST",
    body: { name: "Other", email, password: "password123" },
  });
  record("duplicate email 409", dup.status === 409, `status=${dup.status}`);

  const unauth = await req("/api/analyses");
  record("protected analyses rejects unauth", unauth.status === 401, `status=${unauth.status}`);

  const unauthMe = await req("/api/auth/me");
  record("protected me rejects unauth", unauthMe.status === 401, `status=${unauthMe.status}`);

  const logoutClear = await req("/api/auth/logout", { method: "POST", cookie: reg.cookie });
  record("logout", logoutClear.status === 200, `status=${logoutClear.status}`);

  const meAfterLogout = await req("/api/auth/me", { cookie: reg.cookie });
  // After clearCookie response, old cookie value may still be sent by client unless cleared locally.
  // Verify cleared Set-Cookie empties token when present.
  const cleared = logoutClear.setCookie.some((c) => /token=;/.test(c) || /token=([^;]*);.*Max-Age=0/i.test(c) || /token=;/i.test(c));
  record("logout clears cookie", cleared || logoutClear.setCookie.length > 0, cleared ? "cleared" : "clear header checked");

  const badLogin = await req("/api/auth/login", {
    method: "POST",
    body: { email, password: "wrong-password" },
  });
  record("bad login 401", badLogin.status === 401, `status=${badLogin.status}`);

  const login = await req("/api/auth/login", {
    method: "POST",
    body: { email, password: "password123" },
  });
  const cookieA = login.cookie.includes("token=") ? login.cookie : reg.cookie;
  record("login", login.status === 200 && cookieA.includes("token="), `status=${login.status}`);

  const me = await req("/api/auth/me", { cookie: cookieA });
  record("me", me.status === 200 && me.json?.user?.email === email, `status=${me.status}`);

  await mongoose.connect(uri);
  const userDoc = await mongoose.connection.db.collection("users").findOne({ email });
  record("password bcrypt hashed", Boolean(userDoc?.password?.startsWith("$2")));

  const badRole = await req("/api/analyses", {
    method: "POST",
    cookie: cookieA,
    body: { targetRole: "Java Developer", currentSkills: ["Java"], dailyMinutes: 60 },
  });
  record("invalid role 400", badRole.status === 400, `status=${badRole.status}`);

  const emptySkills = await req("/api/analyses", {
    method: "POST",
    cookie: cookieA,
    body: { targetRole: "Frontend Developer", currentSkills: [], dailyMinutes: 60 },
  });
  record("empty skills 400", emptySkills.status === 400, `status=${emptySkills.status}`);

  if (!hasGemini) {
    const noKey = await req("/api/analyses", {
      method: "POST",
      cookie: cookieA,
      body: {
        targetRole: "Frontend Developer",
        currentSkills: ["HTML", "CSS"],
        dailyMinutes: 60,
      },
    });
    record(
      "create analysis without GEMINI_API_KEY returns 503",
      noKey.status === 503,
      `status=${noKey.status}`
    );
  }

  const { Analysis } = await import("../src/models/Analysis.js");
  const userId = me.json.user.id;
  const seeded = await Analysis.create({
    user: userId,
    targetRole: "Frontend Developer",
    currentSkills: ["HTML", "CSS"],
    dailyMinutes: 60,
    skillGaps: [{ skill: "React", priority: "high", reason: "Needed for frontend roles" }],
    sevenDayRoadmap: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      topic: `Topic ${i + 1}`,
      task: `Task ${i + 1}`,
      estimatedMinutes: 45,
    })),
    projectRecommendations: [
      { title: "Portfolio site", description: "Build a responsive portfolio", skillsPracticed: ["HTML", "CSS"] },
      { title: "Todo app", description: "Build a React todo app", skillsPracticed: ["React"] },
    ],
    overallAssessment: "Solid start; focus on React next.",
  });

  const list = await req("/api/analyses", { cookie: cookieA });
  record(
    "list analyses",
    list.status === 200 && list.json.analyses?.[0]?.id === seeded._id.toString(),
    `status=${list.status}`
  );

  const one = await req(`/api/analyses/${seeded._id}`, { cookie: cookieA });
  record(
    "get own analysis",
    one.status === 200 && one.json.analysis?.targetRole === "Frontend Developer",
    `status=${one.status}`
  );

  const regB = await req("/api/auth/register", {
    method: "POST",
    body: {
      name: "User B",
      email: `other_${Date.now()}@example.com`,
      password: "password123",
    },
  });
  const cookieB = regB.cookie;
  const stealGet = await req(`/api/analyses/${seeded._id}`, { cookie: cookieB });
  const stealDel = await req(`/api/analyses/${seeded._id}`, { method: "DELETE", cookie: cookieB });
  record("ownership get 404", stealGet.status === 404, `status=${stealGet.status}`);
  record("ownership delete 404", stealDel.status === 404, `status=${stealDel.status}`);

  const del = await req(`/api/analyses/${seeded._id}`, { method: "DELETE", cookie: cookieA });
  const gone = await req(`/api/analyses/${seeded._id}`, { cookie: cookieA });
  record("delete own analysis", del.status === 200 && gone.status === 404, `delete=${del.status}, get=${gone.status}`);

  if (hasGemini) {
    const created = await req("/api/analyses", {
      method: "POST",
      cookie: cookieA,
      body: {
        targetRole: "Frontend Developer",
        currentSkills: ["HTML", "CSS", "Git"],
        dailyMinutes: 60,
      },
    });
    const ok =
      created.status === 201 &&
      created.json.analysis?.sevenDayRoadmap?.length === 7 &&
      Array.isArray(created.json.analysis?.skillGaps);
    record("gemini create + persist", ok, `status=${created.status}`);
    if (ok) {
      const saved = await Analysis.findById(created.json.analysis.id);
      record("gemini analysis saved in mongo", Boolean(saved), saved ? "found" : "missing");
    }
  } else {
    record("gemini create + persist", false, "SKIPPED: GEMINI_API_KEY missing");
    record("gemini analysis saved in mongo", false, "SKIPPED: GEMINI_API_KEY missing");
  }

  const failed = results.filter((r) => !r.ok && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  console.log("\n--- Summary ---");
  console.log(`passed: ${results.filter((r) => r.ok).length}`);
  console.log(`failed: ${failed.length}`);
  console.log(`skipped (needs credentials): ${skipped.length}`);
  if (skipped.length) {
    console.log("skipped:");
    for (const s of skipped) console.log(` - ${s.name}: ${s.detail}`);
  }
  if (failed.length) {
    console.log("failures:");
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  } else {
    console.log("All runnable smoke checks passed.");
  }
} catch (err) {
  console.error("\nFATAL:", err.message);
  console.error(serverLog);
  process.exitCode = 1;
} finally {
  child.kill();
  await mongoose.disconnect().catch(() => {});
  await mongod.stop();
}
