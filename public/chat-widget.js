/*!
 * AutoSupport chat widget
 * Drop-in embeddable chat for a published text agent.
 *
 * Usage:
 *   <script src="https://YOUR-APP/chat-widget.js" data-agent="<agent-id>"></script>
 *
 * Options (data-* attributes on the script tag):
 *   data-agent   (required) published text agent id
 *   data-title   panel header title (default "Support chat")
 *   data-position bottom-right | bottom-left | top-right | top-left (default bottom-right)
 *   data-accent  accent color, any CSS color (default #10b981)
 *   data-origin  API origin override (default: current page origin)
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var agentId = script.getAttribute("data-agent");
  if (!agentId) {
    console.error("[autosupport] data-agent is required on the chat-widget script tag");
    return;
  }

  var title = script.getAttribute("data-title") || "Support chat";
  var position = script.getAttribute("data-position") || "bottom-right";
  var accent = script.getAttribute("data-accent") || "#10b981";

  // The widget is served from the app's origin even when embedded on another
  // site, so derive the API base from the script's own src (not the page
  // origin, which would be the host site and fail CORS).
  var scriptSrc = script.getAttribute("src") || "";
  var origin =
    script.getAttribute("data-origin") ||
    (function () {
      try {
        return new URL(scriptSrc, window.location.href).origin;
      } catch {
        return "";
      }
    })() ||
    "";

  var apiBase = origin + "/api/public/agents/" + encodeURIComponent(agentId);
  var meta = null;
  var messages = [];
  var maxTurns = 0;
  var open = false;
  var busy = false;
  var root, bubble, panel, messagesEl, inputEl, sendEl;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function setPanelOpen(next) {
    open = next;
    panel.classList.toggle("autosupport-open", open);
    if (open) {
      inputEl.focus();
      if (meta && messagesEl.children.length === 0) renderWelcome();
    }
  }

  function renderWelcome() {
    var greeting = (meta.config && meta.config.greeting) || "Hi! How can I help?";
    var prompts = (meta.config && meta.config.suggestedPrompts) || [];
    messagesEl.appendChild(bubbleMsg("assistant", greeting));
    if (prompts.length) {
      var chips = el("div", "autosupport-chips");
      prompts.forEach(function (p) {
        var chip = el("button", "autosupport-chip", p);
        chip.type = "button";
        chip.addEventListener("click", function () {
          send(p);
        });
        chips.appendChild(chip);
      });
      messagesEl.appendChild(chips);
    }
    checkTurns();
  }

  function bubbleMsg(role, text) {
    var row = el("div", "autosupport-row autosupport-" + role);
    var msg = el("div", "autosupport-bubble", text);
    row.appendChild(msg);
    return row;
  }

  function addMessage(role, text) {
    messagesEl.appendChild(bubbleMsg(role, text));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function checkTurns() {
    if (maxTurns <= 0) return;
    var turns = messages.filter(function (m) {
      return m.role === "user";
    }).length;
    if (turns >= maxTurns) {
      inputEl.disabled = true;
      sendEl.disabled = true;
      addMessage(
        "assistant",
        "This conversation has reached its limit — feel free to start a new chat.",
      );
    }
  }

  async function send(text) {
    var value = (text || inputEl.value).trim();
    if (!value || busy) return;
    messages.push({ role: "user", content: value });
    addMessage("user", value);
    inputEl.value = "";
    busy = true;
    sendEl.disabled = true;

    var assistantRow = bubbleMsg("assistant", "");
    var assistantBubble = assistantRow.querySelector(".autosupport-bubble");
    messagesEl.appendChild(assistantRow);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      var res = await fetch(apiBase + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages }),
      });

      if (!res.ok) {
        var errBody = await res.json().catch(function () {
          return null;
        });
        assistantBubble.textContent =
          (errBody && errBody.error) || "Something went wrong (" + res.status + ").";
        return;
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var full = "";
      for (;;) {
        var chunk = await reader.read();
        if (chunk.done) break;
        full += decoder.decode(chunk.value, { stream: true });
        assistantBubble.textContent = full;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      full += decoder.decode();
      assistantBubble.textContent = full;
      messages.push({ role: "assistant", content: full });
    } catch {
      assistantBubble.textContent = "Network error — please try again.";
    } finally {
      busy = false;
      sendEl.disabled = false;
      checkTurns();
    }
  }

  function buildStyles() {
    var css = [
      "#autosupport-root{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color-scheme:light;--as-accent:" +
        accent +
        ";}",
      "#autosupport-root *{box-sizing:border-box;}",
      "#autosupport-root button{font:inherit;cursor:pointer;}",
      ".autosupport-bubble-btn{position:fixed;" + (position === "bottom-right" ? "right:20px;bottom:20px;" : position === "bottom-left" ? "left:20px;bottom:20px;" : position === "top-right" ? "right:20px;top:20px;" : "left:20px;top:20px;") + "z-index:2147483000;width:60px;height:60px;border-radius:9999px;border:none;background:var(--as-accent);color:#fff;font-size:26px;box-shadow:0 8px 24px rgba(0,0,0,.24);display:flex;align-items:center;justify-content:center;}",
      ".autosupport-panel{position:fixed;" + (position === "bottom-right" || position === "top-right" ? "right:20px;" : "left:20px;") + (position === "bottom-right" || position === "bottom-left" ? "bottom:20px;" : "top:20px;") + "z-index:2147483001;width:380px;max-width:calc(100vw - 40px);height:540px;max-height:calc(100vh - 100px);background:#fff;border:1px solid #e4e4e7;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;}",
      ".autosupport-panel.autosupport-open{display:flex;}",
      ".autosupport-header{background:var(--as-accent);color:#fff;padding:14px 16px;font-weight:600;font-size:15px;display:flex;align-items:center;justify-content:space-between;}",
      ".autosupport-close{background:none;border:none;color:#fff;font-size:20px;line-height:1;}",
      ".autosupport-body{flex:1;overflow-y:auto;padding:14px 14px 6px;background:#fafafa;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;}",
      ".autosupport-row{display:flex;}",
      ".autosupport-user{justify-content:flex-end;}",
      ".autosupport-bubble{max-width:80%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;}",
      ".autosupport-user .autosupport-bubble{background:var(--as-accent);color:#fff;border-bottom-right-radius:4px;}",
      ".autosupport-assistant .autosupport-bubble{background:#fff;color:#18181b;border:1px solid #e4e4e7;border-bottom-left-radius:4px;}",
      ".autosupport-chips{display:flex;flex-wrap:wrap;gap:8px;}",
      ".autosupport-chip{background:#fff;border:1px solid #d4d4d8;color:#52525b;border-radius:9999px;padding:6px 12px;font-size:13px;transition:border-color .15s,color .15s;}",
      ".autosupport-chip:hover{border-color:var(--as-accent);color:var(--as-accent);}",
      ".autosupport-footer{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e4e4e7;background:#fff;}",
      ".autosupport-input{flex:1;border:1px solid #d4d4d8;border-radius:10px;padding:9px 12px;font-size:14px;outline:none;}",
      ".autosupport-input:focus{border-color:var(--as-accent);}",
      ".autosupport-send{border:none;background:var(--as-accent);color:#fff;border-radius:10px;padding:0 16px;font-size:14px;font-weight:600;}",
      ".autosupport-send:disabled{opacity:.5;cursor:not-allowed;}",
    ].join("\n");

    var style = document.createElement("style");
    style.textContent = css;
    return style;
  }

  function build() {
    root = document.createElement("div");
    root.id = "autosupport-root";
    root.appendChild(buildStyles());

    bubble = el("button", "autosupport-bubble-btn", "\u{1F4AC}");
    bubble.type = "button";
    bubble.setAttribute("aria-label", title);
    bubble.addEventListener("click", function () {
      setPanelOpen(!open);
    });

    panel = document.createElement("div");
    panel.className = "autosupport-panel";
    panel.appendChild(
      (function () {
        var h = el("div", "autosupport-header", title);
        var close = el("button", "autosupport-close", "\u00d7");
        close.type = "button";
        close.addEventListener("click", function () {
          setPanelOpen(false);
        });
        h.appendChild(close);
        return h;
      })(),
    );

    messagesEl = el("div", "autosupport-body");
    panel.appendChild(messagesEl);

    var footer = el("div", "autosupport-footer");
    inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.className = "autosupport-input";
    inputEl.placeholder = "Type a message…";
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") send();
    });
    sendEl = el("button", "autosupport-send", "Send");
    sendEl.type = "button";
    sendEl.addEventListener("click", function () {
      send();
    });
    footer.appendChild(inputEl);
    footer.appendChild(sendEl);
    panel.appendChild(footer);

    root.appendChild(bubble);
    root.appendChild(panel);
    document.body.appendChild(root);
  }

  function init() {
    if (document.body) {
      build();
    } else {
      document.addEventListener("DOMContentLoaded", build);
    }
    fetch(apiBase)
      .then(function (res) {
        if (res.status === 404) {
          console.error("[autosupport] agent not found or not published:", agentId);
          return null;
        }
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        meta = data;
        maxTurns = (data.config && data.config.maxTurns) || 0;
        if (data.name && title) {
          var h = panel.querySelector(".autosupport-header");
          h.childNodes[0].nodeValue = data.name + " · " + title;
        }
      })
      .catch(function (err) {
        console.error("[autosupport] failed to load agent metadata:", err);
      });
  }

  init();
})();
