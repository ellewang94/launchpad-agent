import { defineChannel, GET, POST } from "eve/channels";

// A small public web chat served at the deployment root. It replaces eve's
// default home page (channels/home.ts) and talks to the agent through two
// routes on this channel, so a browser needs no API credentials.
//
//   GET  /                               the chat page
//   POST /api/chat                       { conversationId, message } -> { sessionId }
//   GET  /api/chat/:sessionId/stream     NDJSON session events from ?start=<index>

const MAX_MESSAGE_CHARS = 2000;

export default defineChannel({
  routes: [
    GET("/", async () => new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } })),

    POST("/api/chat", async (request, { from }) => {
      let body: { conversationId?: unknown; message?: unknown };
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Send JSON." }, { status: 400 });
      }
      const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!/^[A-Za-z0-9-]{8,64}$/.test(conversationId)) {
        return Response.json({ error: "Missing conversationId." }, { status: 400 });
      }
      if (message.length === 0 || message.length > MAX_MESSAGE_CHARS) {
        return Response.json({ error: `Message must be 1-${MAX_MESSAGE_CHARS} characters.` }, { status: 400 });
      }
      const session = await from(`web:${conversationId}`).send(message, { auth: null });
      return Response.json({ sessionId: session.id });
    }),

    GET("/api/chat/:sessionId/stream", async (request, { attachSession, params }) => {
      const start = Number(new URL(request.url).searchParams.get("start") ?? "0");
      const events = await attachSession(params.sessionId).getEventStream({
        startIndex: Number.isInteger(start) && start >= 0 ? start : 0,
      });
      const encoder = new TextEncoder();
      const ndjson = events.pipeThrough(
        new TransformStream<unknown, Uint8Array>({
          transform(event, controller) {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          },
        }),
      );
      return new Response(ndjson, {
        headers: {
          "content-type": "application/x-ndjson; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }),
  ],
});

const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Launchpad</title>
<style>
  :root {
    --bg: #fafaf9; --panel: #ffffff; --ink: #1c1917; --muted: #78716c; --line: #e7e5e4;
    --accent: #ea580c; --accent-ink: #ffffff; --chip: #fff7ed; --chip-ink: #9a3412; --user: #1c1917; --user-ink: #fafaf9;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0c0a09; --panel: #1c1917; --ink: #f5f5f4; --muted: #a8a29e; --line: #292524;
      --accent: #fb923c; --accent-ink: #1c1917; --chip: #2a1a0e; --chip-ink: #fdba74; --user: #f5f5f4; --user-ink: #1c1917;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--bg); color: var(--ink);
    font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .app { display: flex; flex-direction: column; height: 100dvh; max-width: 760px; margin: 0 auto; }
  header { padding: 18px 16px 12px; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0; font-size: 20px; letter-spacing: -0.01em; }
  header h1 span { color: var(--accent); }
  header p { margin: 2px 0 0; color: var(--muted); font-size: 14px; }
  #log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .msg { max-width: 92%; padding: 10px 14px; border-radius: 14px; white-space: normal; overflow-wrap: anywhere; }
  .user { align-self: flex-end; background: var(--user); color: var(--user-ink); border-bottom-right-radius: 4px; }
  .agent { align-self: flex-start; background: var(--panel); border: 1px solid var(--line); border-bottom-left-radius: 4px; }
  .agent p { margin: 0 0 8px; } .agent p:last-child { margin-bottom: 0; }
  .agent ul, .agent ol { margin: 4px 0 8px; padding-left: 20px; }
  .agent h3 { font-size: 15px; margin: 10px 0 4px; }
  .agent table { border-collapse: collapse; font-size: 14px; margin: 6px 0; display: block; overflow-x: auto; }
  .agent td, .agent th { border: 1px solid var(--line); padding: 4px 8px; text-align: left; }
  .agent code { font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--bg); padding: 1px 4px; border-radius: 4px; }
  .tools { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .tool { font-size: 12px; background: var(--chip); color: var(--chip-ink); padding: 2px 8px; border-radius: 999px; }
  .status { color: var(--muted); font-size: 14px; }
  .error { color: #dc2626; }
  .suggest { display: flex; flex-wrap: wrap; gap: 8px; }
  .suggest button { font: inherit; font-size: 14px; text-align: left; background: var(--panel); color: var(--ink);
    border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; cursor: pointer; }
  form { display: flex; gap: 8px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--bg); }
  textarea { flex: 1; resize: none; font: inherit; color: var(--ink); background: var(--panel); border: 1px solid var(--line);
    border-radius: 12px; padding: 10px 12px; min-height: 44px; max-height: 140px; }
  textarea:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  button.send { font: inherit; font-weight: 600; background: var(--accent); color: var(--accent-ink); border: 0; border-radius: 12px; padding: 0 18px; cursor: pointer; }
  button.send:disabled { opacity: .5; cursor: default; }
  footer { text-align: center; color: var(--muted); font-size: 12px; padding: 0 16px 8px; }
</style>
</head>
<body>
<div class="app">
  <header>
    <h1>Launch<span>pad</span></h1>
    <p>Tell me what you sell, the price, and your ad budget. I'll forecast it and plan the launch.</p>
  </header>
  <div id="log">
    <div class="suggest" id="suggest">
      <button type="button">I sell a $38 vitamin C serum, 60% margin, $2,000 for a 4-week launch. Give me a plan.</button>
      <button type="button">$24 dog treats, 55% margin, $1,500 budget. Will it pay back?</button>
      <button type="button">Write me 5 TikTok ad hooks for a $45 ceramic pour-over coffee set.</button>
    </div>
  </div>
  <form id="form">
    <textarea id="input" rows="1" placeholder="Describe your product and budget" maxlength="2000"></textarea>
    <button class="send" id="send" type="submit">Send</button>
  </form>
  <footer>Built with eve on Vercel · Benchmarks are illustrative, not live market data</footer>
</div>
<script>
(() => {
  const log = document.getElementById("log");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const send = document.getElementById("send");
  const suggest = document.getElementById("suggest");
  const conversationId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/[^A-Za-z0-9-]/g, "");
  let cursor = 0;
  let busy = false;

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const inline = (s) => escapeHtml(s)
    .replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\\*(?!\\s)(.+?)\\*/g, "$1<em>$2</em>")
    .replace(/\`([^\`]+)\`/g, "<code>$1</code>");

  function render(md) {
    const lines = md.split("\\n");
    let html = "", list = null, para = [], table = [];
    const flushPara = () => { if (para.length) { html += "<p>" + para.map(inline).join("<br>") + "</p>"; para = []; } };
    const flushList = () => { if (list) { html += "</" + list + ">"; list = null; } };
    const flushTable = () => {
      if (!table.length) return;
      const rows = table.filter((r) => !/^\\s*\\|?\\s*:?-{2,}/.test(r));
      html += "<table>" + rows.map((r, i) => "<tr>" + r.replace(/^\\s*\\||\\|\\s*$/g, "").split("|")
        .map((c) => (i === 0 ? "<th>" : "<td>") + inline(c.trim()) + (i === 0 ? "</th>" : "</td>")).join("") + "</tr>").join("") + "</table>";
      table = [];
    };
    for (const line of lines) {
      if (/^\\s*\\|.*\\|\\s*$/.test(line)) { flushPara(); flushList(); table.push(line); continue; }
      flushTable();
      const h = line.match(/^#{1,6}\\s+(.*)/);
      const ul = line.match(/^\\s*[-*•]\\s+(.*)/);
      const ol = line.match(/^\\s*\\d+[.)]\\s+(.*)/);
      if (h) { flushPara(); flushList(); html += "<h3>" + inline(h[1]) + "</h3>"; }
      else if (ul || ol) {
        flushPara();
        const kind = ul ? "ul" : "ol";
        if (list !== kind) { flushList(); html += "<" + kind + ">"; list = kind; }
        html += "<li>" + inline((ul || ol)[1]) + "</li>";
      }
      else if (!line.trim()) { flushPara(); flushList(); }
      else { flushList(); para.push(line); }
    }
    flushTable(); flushPara(); flushList();
    return html;
  }

  function bubble(cls, html) {
    const el = document.createElement("div");
    el.className = "msg " + cls;
    el.innerHTML = html;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  async function ask(text) {
    if (busy || !text.trim()) return;
    busy = true; send.disabled = true;
    if (suggest) suggest.remove();
    bubble("user", escapeHtml(text).replace(/\\n/g, "<br>"));
    const el = bubble("agent", '<div class="tools"></div><div class="body"><span class="status">Thinking…</span></div>');
    const toolsEl = el.querySelector(".tools");
    const bodyEl = el.querySelector(".body");
    const seenTools = new Set();
    let text_ = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      const controller = new AbortController();
      const stream = await fetch("/api/chat/" + encodeURIComponent(data.sessionId) + "/stream?start=" + cursor, { signal: controller.signal });
      if (!stream.ok || !stream.body) throw new Error("Could not open the reply stream");
      const reader = stream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", done = false;
      while (!done) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\\n")) >= 0) {
          const line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
          if (!line.trim()) continue;
          cursor += 1;
          let ev; try { ev = JSON.parse(line); } catch { continue; }
          const d = ev.data || {};
          if (ev.type === "actions.requested") {
            for (const a of d.actions || []) {
              const id = a.callId || a.id;
              if (seenTools.has(id)) continue;
              seenTools.add(id);
              const label = (d.presentation && d.presentation[id] && d.presentation[id].label) || a.toolName || a.name || "Working";
              const chip = document.createElement("span");
              chip.className = "tool"; chip.textContent = label;
              toolsEl.appendChild(chip);
            }
            if (!text_) bodyEl.innerHTML = '<span class="status">Running the numbers…</span>';
          } else if (ev.type === "message.appended") {
            text_ += d.messageDelta || "";
            bodyEl.innerHTML = render(text_);
          } else if (ev.type === "message.completed") {
            if (d.message && !text_.endsWith(d.message)) { text_ = text_ ? text_ : d.message; }
            text_ += "\\n\\n";
            bodyEl.innerHTML = render(text_.trim());
          } else if (ev.type === "turn.completed" || ev.type === "turn.cancelled") {
            done = true;
          } else if (ev.type === "turn.failed") {
            bodyEl.innerHTML += '<p class="error">' + escapeHtml(d.message || "The agent hit an error.") + "</p>";
            done = true;
          } else if (ev.type === "turn.waiting" && d.on === "input") {
            done = true;
          }
          log.scrollTop = log.scrollHeight;
          if (done) break;
        }
      }
      controller.abort();
      if (!text_.trim() && !bodyEl.querySelector(".error")) bodyEl.innerHTML = '<span class="status">No reply.</span>';
    } catch (err) {
      if (err && err.name === "AbortError") return;
      bodyEl.innerHTML = '<p class="error">' + escapeHtml(String(err && err.message || err)) + "</p>";
    } finally {
      busy = false; send.disabled = false; input.focus();
    }
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); const t = input.value; input.value = ""; input.style.height = ""; ask(t); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; });
  if (suggest) suggest.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) ask(b.textContent); });
})();
</script>
</body>
</html>`;
