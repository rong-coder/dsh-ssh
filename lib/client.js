window.__ModuleLoader__.load({
  id: "dsh-ssh",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;
    const { useCallback, useEffect, useRef, useState } = React;

    const PANEL_ID = "ssh";
    const CSS_ID = "dsh-ssh-styles";

    const CSS = String.raw`
.dsh-ssh-page {
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base, transparent);
  padding: 28px clamp(20px, 4vw, 48px) 64px;
  --ssh-border: var(--dsw-alias-border-l2, rgba(127,127,127,.2));
  --ssh-border-strong: var(--dsw-alias-border-l3, rgba(127,127,127,.3));
  --ssh-layer-1: var(--dsw-alias-bg-layer-1, rgba(127,127,127,.04));
  --ssh-layer-2: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.07));
  --ssh-layer-3: var(--dsw-alias-bg-layer-3, rgba(127,127,127,.11));
  --ssh-text: var(--dsw-alias-label-primary, #111827);
  --ssh-muted: var(--dsw-alias-label-secondary, #4b5563);
  --ssh-faint: var(--dsw-alias-label-tertiary, #6b7280);
  --ssh-caption: var(--dsw-alias-label-caption, #9ca3af);
  --ssh-accent: var(--dsw-alias-state-business-primary, #2563eb);
  --ssh-success: var(--dsw-alias-state-success-primary, #16a34a);
  --ssh-danger: var(--dsw-alias-state-error-primary, #dc2626);
  --ssh-warn: var(--dsw-alias-state-warn-primary, #d97706);
  --ssh-radius: var(--dsw-radius-lg, 12px);
  --ssh-radius-sm: var(--dsw-radius-md, 8px);
  --ssh-mono: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
}
.dsh-ssh-page * { box-sizing: border-box; }
.dsh-ssh-inner { width: 100%; max-width: 1040px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
.dsh-ssh-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.dsh-ssh-heading { display: flex; align-items: center; gap: 14px; min-width: 0; }
.dsh-ssh-mark { width: 44px; height: 44px; flex: none; border-radius: 14px; display: grid; place-items: center; color: #7dd3fc; background: linear-gradient(145deg, #0f172a, #1e293b); border: 1px solid rgba(125,211,252,.28); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); }
.dsh-ssh-title { margin: 0; font-size: 22px; font-weight: 600; line-height: 30px; letter-spacing: -.01em; }
.dsh-ssh-subtitle { margin: 3px 0 0; font-size: 13px; line-height: 20px; color: var(--ssh-muted); }
.dsh-ssh-header-actions { display: flex; align-items: center; gap: 8px; }
.dsh-ssh-btn { appearance: none; border: .5px solid var(--ssh-border-strong); border-radius: var(--ssh-radius-sm); background: var(--ssh-layer-2); color: var(--ssh-text); font: inherit; font-size: 13px; line-height: 20px; min-height: 32px; padding: 5px 12px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; white-space: nowrap; transition: background .14s ease, border-color .14s ease, color .14s ease, opacity .14s ease; }
.dsh-ssh-btn:focus-visible, .dsh-ssh-icon-btn:focus-visible, .dsh-ssh-input:focus-visible, .dsh-ssh-select:focus-visible, .dsh-ssh-textarea:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--ssh-accent)); outline-offset: 1px; }
.dsh-ssh-btn:disabled { opacity: .55; cursor: default; }
.dsh-ssh-btn-primary { background: var(--ssh-accent); color: var(--dsw-alias-label-primary-foreground, #fff); border-color: transparent; }
.dsh-ssh-btn-danger { background: transparent; color: var(--ssh-danger); border-color: color-mix(in srgb, var(--ssh-danger) 32%, transparent); }
.dsh-ssh-btn-ghost { background: transparent; border-color: transparent; color: var(--ssh-muted); }
.dsh-ssh-btn-sm { min-height: 28px; padding: 3px 9px; font-size: 12.5px; }
.dsh-ssh-icon-btn { appearance: none; width: 30px; height: 30px; flex: none; border-radius: var(--ssh-radius-sm); border: none; background: transparent; color: var(--ssh-faint); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: background .14s ease, color .14s ease, opacity .14s ease; }
.dsh-ssh-icon-btn:disabled { opacity: .5; cursor: default; }
.dsh-ssh-icon-btn.danger { color: var(--ssh-danger); }
@media (hover: hover) {
  .dsh-ssh-btn:hover:not(:disabled) { background: var(--ssh-layer-3); border-color: var(--ssh-border-strong); }
  .dsh-ssh-btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--ssh-accent) 88%, #000); border-color: transparent; }
  .dsh-ssh-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--ssh-danger) 10%, transparent); }
  .dsh-ssh-btn-ghost:hover:not(:disabled) { background: var(--ssh-layer-2); border-color: transparent; color: var(--ssh-text); }
  .dsh-ssh-icon-btn:hover:not(:disabled) { background: var(--ssh-layer-2); color: var(--ssh-text); }
  .dsh-ssh-icon-btn.danger:hover:not(:disabled) { color: var(--ssh-danger); background: color-mix(in srgb, var(--ssh-danger) 9%, transparent); }
  .dsh-ssh-card:hover { border-color: var(--ssh-border-strong); }
  .dsh-ssh-segment button:hover:not(.active) { background: var(--ssh-layer-2); }
}
.dsh-ssh-summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: var(--ssh-muted); font-size: 12.5px; line-height: 18px; }
.dsh-ssh-pill { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; border: .5px solid var(--ssh-border); background: var(--ssh-layer-1); padding: 2px 9px; color: var(--ssh-muted); font-size: 11.5px; line-height: 18px; white-space: nowrap; }
.dsh-ssh-pill.good { color: var(--ssh-success); border-color: color-mix(in srgb, var(--ssh-success) 30%, transparent); background: color-mix(in srgb, var(--ssh-success) 8%, transparent); }
.dsh-ssh-pill.warn { color: var(--ssh-warn); border-color: color-mix(in srgb, var(--ssh-warn) 30%, transparent); background: color-mix(in srgb, var(--ssh-warn) 8%, transparent); }
.dsh-ssh-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.dsh-ssh-section-title { margin: 0; font-size: 14px; font-weight: 600; line-height: 22px; }
.dsh-ssh-section-hint { color: var(--ssh-caption); font-size: 12px; line-height: 18px; }
.dsh-ssh-list { display: flex; flex-direction: column; gap: 10px; }
.dsh-ssh-card { border: .5px solid var(--ssh-border); border-radius: var(--ssh-radius); background: var(--ssh-layer-1); padding: 16px 18px 14px; transition: border-color .16s ease; }
.dsh-ssh-card-head { display: flex; align-items: flex-start; gap: 13px; }
.dsh-ssh-avatar { width: 38px; height: 38px; flex: none; border-radius: 10px; display: grid; place-items: center; color: var(--ssh-accent); background: color-mix(in srgb, var(--ssh-accent) 9%, var(--ssh-layer-2)); border: .5px solid color-mix(in srgb, var(--ssh-accent) 18%, var(--ssh-border)); }
.dsh-ssh-card-main { flex: 1; min-width: 0; }
.dsh-ssh-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.dsh-ssh-card-title { font-size: 14.5px; font-weight: 600; line-height: 21px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.dsh-ssh-card-addr { margin-top: 2px; color: var(--ssh-muted); font-family: var(--ssh-mono); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.dsh-ssh-card-desc { margin: 6px 0 0; color: var(--ssh-faint); font-size: 12.5px; line-height: 19px; }
.dsh-ssh-card-actions { display: flex; align-items: center; gap: 2px; flex: none; margin: -3px -3px 0 0; }
.dsh-ssh-card-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 7px; }
.dsh-ssh-test { margin-top: 11px; border-radius: var(--ssh-radius-sm); border: .5px solid var(--ssh-border); background: var(--ssh-layer-2); padding: 8px 10px; font-size: 12px; line-height: 18px; color: var(--ssh-muted); overflow-wrap: anywhere; }
.dsh-ssh-test.good { border-color: color-mix(in srgb, var(--ssh-success) 26%, transparent); background: color-mix(in srgb, var(--ssh-success) 7%, transparent); color: var(--ssh-success); }
.dsh-ssh-test.bad { border-color: color-mix(in srgb, var(--ssh-danger) 26%, transparent); background: color-mix(in srgb, var(--ssh-danger) 7%, transparent); color: var(--ssh-danger); }
.dsh-ssh-details { margin-top: 11px; border-top: .5px solid var(--ssh-border); padding-top: 9px; }
.dsh-ssh-details > summary { cursor: pointer; color: var(--ssh-faint); font-size: 12px; line-height: 18px; list-style: none; display: inline-flex; align-items: center; gap: 5px; }
.dsh-ssh-details > summary::-webkit-details-marker { display: none; }
.dsh-ssh-details > summary::before { content: "›"; display: inline-block; transition: transform .15s ease; font-size: 15px; line-height: 1; }
.dsh-ssh-details[open] > summary::before { transform: rotate(90deg); }
.dsh-ssh-details-body { margin-top: 9px; display: flex; flex-direction: column; gap: 9px; }
.dsh-ssh-kv { display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 4px 12px; font-size: 12px; line-height: 18px; }
.dsh-ssh-kv dt { color: var(--ssh-caption); }
.dsh-ssh-kv dd { margin: 0; color: var(--ssh-muted); overflow-wrap: anywhere; }
.dsh-ssh-code { font-family: var(--ssh-mono); font-size: 11.5px; line-height: 18px; color: var(--ssh-muted); background: var(--ssh-layer-2); border: .5px solid var(--ssh-border); border-radius: 7px; padding: 7px 9px; margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.dsh-ssh-keybar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-ssh-key-help { color: var(--ssh-caption); font-size: 11.5px; line-height: 17px; }
.dsh-ssh-empty { border: 1px dashed var(--ssh-border-strong); border-radius: var(--ssh-radius); background: var(--ssh-layer-1); padding: 44px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.dsh-ssh-empty-icon { width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; color: var(--ssh-accent); background: color-mix(in srgb, var(--ssh-accent) 8%, transparent); margin-bottom: 4px; }
.dsh-ssh-empty-title { margin: 0; font-size: 15px; font-weight: 600; line-height: 22px; }
.dsh-ssh-empty-text { margin: 0; max-width: 460px; color: var(--ssh-muted); font-size: 12.5px; line-height: 20px; }
.dsh-ssh-empty .dsh-ssh-btn { margin-top: 8px; }
.dsh-ssh-tools { border: .5px solid var(--ssh-border); border-radius: var(--ssh-radius); background: var(--ssh-layer-1); padding: 15px 18px; display: flex; flex-direction: column; gap: 8px; }
.dsh-ssh-tools-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.dsh-ssh-tool-name { font-family: var(--ssh-mono); font-size: 11.5px; color: var(--ssh-accent); background: color-mix(in srgb, var(--ssh-accent) 8%, transparent); border: .5px solid color-mix(in srgb, var(--ssh-accent) 18%, transparent); border-radius: 6px; padding: 2px 7px; }
.dsh-ssh-tools p { margin: 0; color: var(--ssh-muted); font-size: 12.5px; line-height: 19px; }
.dsh-ssh-error { border: .5px solid color-mix(in srgb, var(--ssh-danger) 30%, transparent); background: color-mix(in srgb, var(--ssh-danger) 7%, transparent); color: var(--ssh-danger); border-radius: var(--ssh-radius-sm); padding: 10px 12px; font-size: 12.5px; line-height: 19px; overflow-wrap: anywhere; }
.dsh-ssh-loading { color: var(--ssh-muted); font-size: 13px; padding: 28px 0; display: flex; align-items: center; gap: 8px; }
.dsh-ssh-spin { animation: dsh-ssh-spin .8s linear infinite; transform-origin: center; }
@keyframes dsh-ssh-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .dsh-ssh-spin { animation: none; } .dsh-ssh-details > summary::before { transition: none; } }
.dsh-ssh-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,.45); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 24px; }
.dsh-ssh-modal { width: min(700px, 100%); max-height: min(860px, 100%); display: flex; flex-direction: column; border-radius: var(--dsw-radius-xl, 16px); background: var(--dsw-alias-bg-layer-2, #fff); color: var(--ssh-text); border: .5px solid var(--ssh-border-strong); box-shadow: var(--dsw-elevation-prominent, 0 28px 80px rgba(0,0,0,.3)); overflow: hidden; }
.dsh-ssh-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 20px 14px; border-bottom: .5px solid var(--ssh-border); }
.dsh-ssh-modal-title { margin: 0; font-size: 16px; font-weight: 600; line-height: 24px; }
.dsh-ssh-modal-sub { margin: 3px 0 0; color: var(--ssh-muted); font-size: 12px; line-height: 18px; }
.dsh-ssh-modal-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.dsh-ssh-modal-foot { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: .5px solid var(--ssh-border); background: var(--ssh-layer-1); }
.dsh-ssh-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 12px; }
.dsh-ssh-grid .full { grid-column: 1 / -1; }
.dsh-ssh-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.dsh-ssh-label { color: var(--ssh-text); font-size: 12.5px; font-weight: 500; line-height: 18px; }
.dsh-ssh-optional { color: var(--ssh-caption); font-weight: 400; }
.dsh-ssh-help { color: var(--ssh-caption); font-size: 11.5px; line-height: 17px; margin: 0; }
.dsh-ssh-input, .dsh-ssh-select, .dsh-ssh-textarea { width: 100%; border: .5px solid var(--ssh-border-strong); border-radius: var(--ssh-radius-sm); background: var(--ssh-layer-2); color: var(--ssh-text); font: inherit; font-size: 13px; line-height: 20px; min-height: 36px; padding: 7px 10px; outline: none; transition: border-color .14s ease, background .14s ease; }
.dsh-ssh-input::placeholder, .dsh-ssh-textarea::placeholder { color: var(--ssh-caption); }
.dsh-ssh-input:focus, .dsh-ssh-select:focus, .dsh-ssh-textarea:focus { border-color: var(--ssh-accent); background: var(--ssh-layer-1); }
.dsh-ssh-textarea { resize: vertical; min-height: 76px; }
.dsh-ssh-key-textarea { font-family: var(--ssh-mono); font-size: 11px; line-height: 16px; min-height: 116px; }
.dsh-ssh-segment { display: inline-flex; align-items: stretch; border: .5px solid var(--ssh-border-strong); border-radius: var(--ssh-radius-sm); background: var(--ssh-layer-2); padding: 2px; gap: 2px; width: fit-content; max-width: 100%; flex-wrap: wrap; }
.dsh-ssh-segment button { appearance: none; border: 0; background: transparent; color: var(--ssh-muted); font: inherit; font-size: 12px; line-height: 18px; min-height: 28px; padding: 3px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap; }
.dsh-ssh-segment button.active { background: var(--ssh-accent); color: var(--dsw-alias-label-primary-foreground, #fff); }
.dsh-ssh-notice { border-radius: var(--ssh-radius-sm); border: .5px solid var(--ssh-border); background: var(--ssh-layer-2); padding: 9px 11px; color: var(--ssh-muted); font-size: 11.5px; line-height: 18px; }
.dsh-ssh-notice strong { color: var(--ssh-text); font-weight: 600; }
.dsh-ssh-form-error { border-radius: var(--ssh-radius-sm); border: .5px solid color-mix(in srgb, var(--ssh-danger) 30%, transparent); background: color-mix(in srgb, var(--ssh-danger) 7%, transparent); color: var(--ssh-danger); padding: 8px 10px; font-size: 12px; line-height: 18px; }
.dsh-ssh-toast { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 1100; max-width: min(560px, calc(100vw - 40px)); background: var(--dsw-alias-bg-layer-3, #1f2937); color: var(--ssh-text); border: .5px solid var(--ssh-border-strong); border-radius: 10px; box-shadow: 0 12px 36px rgba(0,0,0,.25); padding: 9px 14px; font-size: 12.5px; line-height: 19px; overflow-wrap: anywhere; display: flex; align-items: flex-start; gap: 8px; }
.dsh-ssh-toast.good { border-color: color-mix(in srgb, var(--ssh-success) 35%, transparent); }
.dsh-ssh-toast.bad { border-color: color-mix(in srgb, var(--ssh-danger) 38%, transparent); color: var(--ssh-danger); }
.dsh-ssh-confirm { width: min(440px, 100%); }
.dsh-ssh-confirm .dsh-ssh-modal-body { gap: 8px; }
.dsh-ssh-confirm p { margin: 0; color: var(--ssh-muted); font-size: 13px; line-height: 21px; }
.dsh-ssh-spacer { flex: 1; }
@media (max-width: 640px) {
  .dsh-ssh-page { padding: 20px 16px 48px; }
  .dsh-ssh-title { font-size: 19px; }
  .dsh-ssh-grid { grid-template-columns: 1fr; }
  .dsh-ssh-overlay { padding: 10px; align-items: flex-end; }
  .dsh-ssh-modal { max-height: calc(100vh - 20px); border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
  .dsh-ssh-card { padding: 14px; }
  .dsh-ssh-card-head { flex-wrap: wrap; }
  .dsh-ssh-card-actions { width: 100%; justify-content: flex-end; }
  .dsh-ssh-kv { grid-template-columns: 84px minmax(0, 1fr); }
}
`;

    /** Insert the page stylesheet once per document. */
    function ensureStyles() {
      if (document.getElementById(CSS_ID)) return;
      const style = document.createElement("style");
      style.id = CSS_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    function icon(name, size = 16, props = {}) {
      const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        focusable: "false",
        ...props,
      };
      const paths = {
        terminal: [h("rect", { key: "r", x: 3, y: 4.5, width: 18, height: 15, rx: 3 }), h("path", { key: "p", d: "M7.5 9.5 10 12l-2.5 2.5M12.5 15h4" })],
        plus: [h("path", { key: "p", d: "M12 5v14M5 12h14" })],
        refresh: [h("path", { key: "a", d: "M20 11a8 8 0 1 0 .4 3.2" }), h("path", { key: "b", d: "M20 5v6h-6" })],
        edit: [h("path", { key: "a", d: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" }), h("path", { key: "b", d: "M13.5 7.5l3 3" })],
        trash: [h("path", { key: "a", d: "M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5" })],
        key: [h("circle", { key: "c", cx: 8, cy: 8, r: 4 }), h("path", { key: "p", d: "M11 11l9 9M17 17l2-2M14 14l2-2" })],
        copy: [h("rect", { key: "r", x: 8, y: 8, width: 11, height: 11, rx: 2 }), h("path", { key: "p", d: "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" })],
        check: [h("path", { key: "p", d: "m5 12.5 4.2 4.2L19 7" })],
        alert: [h("path", { key: "p", d: "M12 4 3.5 19h17L12 4Z" }), h("path", { key: "q", d: "M12 9v4.5M12 16.5h.01" })],
        spinner: [h("path", { key: "p", d: "M12 3a9 9 0 1 0 9 9", opacity: .9 })],
        server: [h("rect", { key: "r", x: 3, y: 4, width: 18, height: 7, rx: 2 }), h("rect", { key: "s", x: 3, y: 13, width: 18, height: 7, rx: 2 }), h("path", { key: "p", d: "M7 7.5h.01M7 16.5h.01" })],
      };
      return h("svg", common, paths[name] ?? paths.terminal);
    }

    function cx(...values) {
      return values.filter(Boolean).join(" ");
    }

    /**
     * Build a mountable client contribution for the Host's SRC-mode `ssh`
     * namespace. The schemas are intentionally opaque: the browser face never
     * parses inputs or results, and the Host validates each call itself.
     */
    function buildDescriptors() {
      const passthrough = () => ({ parse: value => value });
      const codec = typeSymbol => ({ mode: "strict", typeSymbol, create: passthrough, jsonSchema: {} });
      const resultCodec = method => codec(`dsh-ssh#ssh.${method}:result`);
      const method = (name, hasRequest) => {
        const parameters = hasRequest
          ? [{
              name: "request",
              wire: "request",
              source: "json",
              codec: codec(`dsh-ssh#ssh.${name}:request`),
              strictCodec: codec(`dsh-ssh#ssh.${name}:request`),
            }]
          : [];
        return {
          id: `dsh-ssh/${name}`,
          service: "sshServers",
          namespace: "ssh",
          method: name,
          invocation: { kind: "direct" },
          parameters,
          result: resultCodec(name),
          description: `dsh-ssh settings: ${name}`,
          sourceLocation: { file: "dsh-ssh/lib/index.js", line: 1, column: 1 },
        };
      };
      return [method("listServers", false), method("saveServer", true), method("removeServer", true), method("testServer", true)];
    }

    function useCopy() {
      return useCallback(async (text) => {
        if (!text) return false;
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          try {
            const area = document.createElement("textarea");
            area.value = text;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.left = "-9999px";
            document.body.appendChild(area);
            area.select();
            const ok = document.execCommand("copy");
            area.remove();
            return ok;
          } catch {
            return false;
          }
        }
      }, []);
    }

    function formatTestResult(result) {
      if (!result) return "";
      if (result.ok) {
        const first = String(result.stdout || "").trim().split("\n").filter(Boolean).slice(0, 3).join(" · ");
        return `${first || "连接成功"} · ${result.durationMs}ms`;
      }
      if (result.timedOut) return `连接超时 · ${result.durationMs}ms`;
      const stderr = String(result.stderr || "").trim().split("\n").filter(Boolean);
      const stdout = String(result.stdout || "").trim().split("\n").filter(Boolean);
      return stderr.at(-1) || stdout.at(-1) || `连接失败（退出码 ${result.exitCode ?? "unknown"}）`;
    }

    function useServers(call) {
      const [state, setState] = useState({ status: "loading", servers: [], paths: null, error: null });
      const alive = useRef(true);
      useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; };
      }, []);
      const load = useCallback(async () => {
        setState(previous => ({ ...previous, status: previous.servers.length ? previous.status : "loading", error: null }));
        try {
          const value = await call("listServers");
          if (!alive.current) return;
          setState({ status: "ready", servers: value.servers ?? [], paths: value.paths ?? null, error: null });
        } catch (error) {
          if (!alive.current) return;
          setState(previous => ({ ...previous, status: "error", error: error instanceof Error ? error.message : String(error) }));
        }
      }, [call]);
      useEffect(() => { load(); }, [load]);
      return { ...state, reload: load };
    }

    function Tag({ children, tone }) {
      return h("span", { className: cx("dsh-ssh-pill", tone) }, children);
    }

    function Toast({ toast }) {
      if (!toast) return null;
      return h("div", { className: cx("dsh-ssh-toast", toast.tone), role: "status", "aria-live": "polite" },
        h("span", { style: { marginTop: 1, flex: "none" } }, icon(toast.tone === "bad" ? "alert" : "check", 15)),
        h("span", null, toast.text));
    }

    function ConfirmDelete({ server, busy, onClose, onConfirm }) {
      useEffect(() => {
        const onKey = event => { if (event.key === "Escape" && !busy) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [busy, onClose]);
      return h("div", { className: "dsh-ssh-overlay", role: "presentation", onMouseDown: event => { if (event.target === event.currentTarget && !busy) onClose(); } },
        h("div", { className: "dsh-ssh-modal dsh-ssh-confirm", role: "dialog", "aria-modal": "true", "aria-labelledby": "dsh-ssh-delete-title" },
          h("div", { className: "dsh-ssh-modal-head" },
            h("div", null,
              h("h2", { id: "dsh-ssh-delete-title", className: "dsh-ssh-modal-title" }, "删除服务器？"),
              h("p", { className: "dsh-ssh-modal-sub" }, server.name)),
            h("button", { type: "button", className: "dsh-ssh-icon-btn", "aria-label": "关闭", onClick: onClose, disabled: busy }, "×")),
          h("div", { className: "dsh-ssh-modal-body" },
            h("p", null, "这会删除服务器配置，以及插件托管的私钥或密码。外部私钥文件不会被删除。"),
            h("p", null, "正在执行的远端命令可能会继续运行，请先确认没有重要任务。")),
          h("div", { className: "dsh-ssh-modal-foot" },
            h("button", { type: "button", className: "dsh-ssh-btn", onClick: onClose, disabled: busy }, "取消"),
            h("button", { type: "button", className: "dsh-ssh-btn dsh-ssh-btn-danger", onClick: onConfirm, disabled: busy }, busy ? "删除中…" : "删除服务器"))));
    }

    function ServerEditor({ call, initial, onClose, onSaved, notify }) {
      const editing = Boolean(initial);
      const [draft, setDraft] = useState(() => ({
        id: initial?.id,
        name: initial?.name ?? "",
        host: initial?.host ?? "",
        port: String(initial?.port ?? 22),
        username: initial?.username ?? "",
        auth: initial?.auth ?? "key",
        keyMode: initial ? (initial.hasKey ? "keep" : "generate") : "generate",
        privateKey: "",
        privateKeyPath: initial?.keyPath ?? "",
        passphrase: "",
        password: "",
        description: initial?.description ?? "",
      }));
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState("");
      const firstInput = useRef(null);
      useEffect(() => { firstInput.current?.focus(); }, []);
      useEffect(() => {
        const onKey = event => { if (event.key === "Escape" && !saving) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [saving, onClose]);
      const set = useCallback((key, value) => {
        setDraft(previous => ({ ...previous, [key]: value }));
      }, []);

      const submit = useCallback(async event => {
        event.preventDefault();
        setError("");
        if (!draft.name.trim()) return setError("请输入服务器名称");
        if (!draft.host.trim()) return setError("请输入主机地址");
        if (!draft.username.trim()) return setError("请输入用户名");
        const port = Number(draft.port);
        if (!Number.isInteger(port) || port < 1 || port > 65535) return setError("端口必须是 1–65535 的整数");
        if (draft.auth === "key") {
          if (draft.keyMode === "paste" && !draft.privateKey.trim()) return setError("请粘贴私钥内容");
          if (draft.keyMode === "path" && !draft.privateKeyPath.trim()) return setError("请输入本机私钥文件路径");
        }
        if (draft.auth === "password" && !initial?.hasPassword && !draft.password) {
          return setError("请输入 SSH 登录密码");
        }
        const request = {
          name: draft.name.trim(),
          host: draft.host.trim(),
          port,
          username: draft.username.trim(),
          auth: draft.auth,
          description: draft.description.trim(),
        };
        if (draft.id) request.id = draft.id;
        if (draft.auth === "key") {
          if (draft.keyMode === "generate") request.generateKey = true;
          if (draft.keyMode === "paste") request.privateKey = draft.privateKey;
          if (draft.keyMode === "path") request.privateKeyPath = draft.privateKeyPath.trim();
          if (draft.passphrase) request.passphrase = draft.passphrase;
        }
        if (draft.auth === "password" && draft.password) request.password = draft.password;
        setSaving(true);
        try {
          await call("saveServer", request);
          notify(editing ? "服务器已更新" : "服务器已添加", "good");
          onSaved();
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure));
        } finally {
          setSaving(false);
        }
      }, [call, draft, editing, notify, onClose, onSaved]);

      const showPassphrase = draft.auth === "key";
      const passphraseHint = initial?.hasPassphrase
        ? "已保存口令；留空会沿用。更换私钥时填写新私钥的口令。"
        : "私钥有口令时填写；留空表示无口令。口令以明文保存在本机配置中。";

      return h("div", { className: "dsh-ssh-overlay", role: "presentation", onMouseDown: event => { if (event.target === event.currentTarget && !saving) onClose(); } },
        h("div", { className: "dsh-ssh-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "dsh-ssh-editor-title" },
          h("div", { className: "dsh-ssh-modal-head" },
            h("div", null,
              h("h2", { id: "dsh-ssh-editor-title", className: "dsh-ssh-modal-title" }, editing ? "编辑 SSH 服务器" : "添加 SSH 服务器"),
              h("p", { className: "dsh-ssh-modal-sub" }, "凭据只保存在本机 DSH 数据目录，不会发送给模型。")),
            h("button", { type: "button", className: "dsh-ssh-icon-btn", "aria-label": "关闭", onClick: onClose, disabled: saving }, "×")),
          h("form", { onSubmit: submit, style: { display: "contents" } },
            h("div", { className: "dsh-ssh-modal-body" },
              error ? h("div", { className: "dsh-ssh-form-error", role: "alert" }, error) : null,
              h("div", { className: "dsh-ssh-grid" },
                h("label", { className: "dsh-ssh-field" },
                  h("span", { className: "dsh-ssh-label" }, "名称"),
                  h("input", { ref: firstInput, className: "dsh-ssh-input", value: draft.name, onChange: event => set("name", event.target.value), placeholder: "例如：生产环境", autoComplete: "off" })),
                h("label", { className: "dsh-ssh-field" },
                  h("span", { className: "dsh-ssh-label" }, "主机地址"),
                  h("input", { className: "dsh-ssh-input", value: draft.host, onChange: event => set("host", event.target.value), placeholder: "10.0.0.12 或 example.com", autoComplete: "off", spellCheck: false })),
                h("label", { className: "dsh-ssh-field" },
                  h("span", { className: "dsh-ssh-label" }, "用户名"),
                  h("input", { className: "dsh-ssh-input", value: draft.username, onChange: event => set("username", event.target.value), placeholder: "root", autoComplete: "off", spellCheck: false })),
                h("label", { className: "dsh-ssh-field" },
                  h("span", { className: "dsh-ssh-label" }, "端口"),
                  h("input", { className: "dsh-ssh-input", value: draft.port, onChange: event => set("port", event.target.value), inputMode: "numeric", placeholder: "22" }))),
              h("div", { className: "dsh-ssh-field" },
                h("span", { className: "dsh-ssh-label" }, "认证方式"),
                h("div", { className: "dsh-ssh-segment", role: "group", "aria-label": "认证方式" },
                  h("button", { type: "button", className: draft.auth === "key" ? "active" : "", onClick: () => set("auth", "key") }, "私钥"),
                  h("button", { type: "button", className: draft.auth === "password" ? "active" : "", onClick: () => set("auth", "password") }, "密码"),
                  h("button", { type: "button", className: draft.auth === "agent" ? "active" : "", onClick: () => set("auth", "agent") }, "SSH Agent"))),
              draft.auth === "key" ? h(React.Fragment, null,
                h("div", { className: "dsh-ssh-field" },
                  h("span", { className: "dsh-ssh-label" }, "私钥来源"),
                  h("div", { className: "dsh-ssh-segment", role: "group", "aria-label": "私钥来源" },
                    editing && initial?.hasKey ? h("button", { type: "button", className: draft.keyMode === "keep" ? "active" : "", onClick: () => set("keyMode", "keep") }, "保留现有") : null,
                    h("button", { type: "button", className: draft.keyMode === "generate" ? "active" : "", onClick: () => set("keyMode", "generate") }, "生成 Ed25519"),
                    h("button", { type: "button", className: draft.keyMode === "paste" ? "active" : "", onClick: () => set("keyMode", "paste") }, "粘贴私钥"),
                    h("button", { type: "button", className: draft.keyMode === "path" ? "active" : "", onClick: () => set("keyMode", "path") }, "本机文件"))),
                draft.keyMode === "keep" ? h("p", { className: "dsh-ssh-help" }, "现有私钥保持不变。")
                  : draft.keyMode === "generate" ? h("p", { className: "dsh-ssh-help" }, "将生成新的 Ed25519 密钥对，保存后显示公钥，可复制到远端 authorized_keys。")
                    : draft.keyMode === "paste" ? h("p", { className: "dsh-ssh-help" }, "支持 OpenSSH / PEM 私钥。保存后会校验并提取公钥。")
                      : h("p", { className: "dsh-ssh-help" }, "使用本机已有私钥文件，不复制文件。路径支持 ~。")) : null,
              draft.auth === "key" && draft.keyMode === "paste" ? h("label", { className: "dsh-ssh-field" },
                h("span", { className: "dsh-ssh-label" }, "私钥内容"),
                h("textarea", { className: "dsh-ssh-textarea dsh-ssh-key-textarea", value: draft.privateKey, onChange: event => set("privateKey", event.target.value), placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----", spellCheck: false })) : null,
              draft.auth === "key" && draft.keyMode === "path" ? h("label", { className: "dsh-ssh-field" },
                h("span", { className: "dsh-ssh-label" }, "本机私钥文件路径"),
                h("input", { className: "dsh-ssh-input", value: draft.privateKeyPath, onChange: event => set("privateKeyPath", event.target.value), placeholder: "~/.ssh/id_ed25519", spellCheck: false })) : null,
              showPassphrase ? h("label", { className: "dsh-ssh-field" },
                h("span", { className: "dsh-ssh-label" }, "私钥口令 ", h("span", { className: "dsh-ssh-optional" }, "可选")),
                h("input", { className: "dsh-ssh-input", type: "password", value: draft.passphrase, onChange: event => set("passphrase", event.target.value), placeholder: passphraseHint, autoComplete: "new-password" })) : null,
              draft.auth === "password" ? h("label", { className: "dsh-ssh-field" },
                h("span", { className: "dsh-ssh-label" }, "登录密码"),
                h("input", { className: "dsh-ssh-input", type: "password", value: draft.password, onChange: event => set("password", event.target.value), placeholder: initial?.hasPassword ? "已保存密码，留空沿用" : "输入 SSH 登录密码", autoComplete: "new-password" })) : null,
              draft.auth === "agent" ? h("div", { className: "dsh-ssh-notice" }, "将通过本机运行 DSH 的用户环境中的 SSH Agent 认证。请确保 Agent 已启动并加载了远端授权的密钥。") : null,
              h("label", { className: "dsh-ssh-field" },
                h("span", { className: "dsh-ssh-label" }, "备注 ", h("span", { className: "dsh-ssh-optional" }, "可选")),
                h("textarea", { className: "dsh-ssh-textarea", value: draft.description, onChange: event => set("description", event.target.value), placeholder: "例如：Web 生产机 / Docker 宿主机", rows: 2 })),
              h("div", { className: "dsh-ssh-notice" },
                h("strong", null, "安全提示： "),
                draft.auth === "password"
                  ? "密码将以明文保存在本机 DSH 数据目录（文件权限 600），不会显示在服务器列表或发送给模型。"
                  : draft.auth === "agent"
                    ? "认证由本机 SSH Agent 完成；DSH 进程需要能访问 SSH_AUTH_SOCK。"
                    : "私钥只保存在本机 DSH 数据目录；插件托管的密钥文件权限为 600，不会返回浏览器或发送给模型。",
                "首次连接会自动接受并记录主机密钥。")),
            h("div", { className: "dsh-ssh-modal-foot" },
              h("button", { type: "button", className: "dsh-ssh-btn", onClick: onClose, disabled: saving }, "取消"),
              h("button", { type: "submit", className: "dsh-ssh-btn dsh-ssh-btn-primary", disabled: saving }, saving ? "保存中…" : editing ? "保存更改" : "添加服务器")))));
    }

    function ServerCard({ server, call, notify, onEdit, onDelete, testState, onTest }) {
      const copy = useCopy();
      const [copied, setCopied] = useState("");
      const copyKey = async () => {
        if (!server.publicKey) return;
        const ok = await copy(server.publicKey, "公钥");
        if (ok) {
          setCopied("public");
          notify("公钥已复制，可粘贴到远端 ~/.ssh/authorized_keys", "good");
          setTimeout(() => setCopied(""), 1800);
        } else {
          notify("复制失败，请手动选择公钥文本", "bad");
        }
      };
      const testing = testState?.status === "running";
      const test = testState?.result;
      return h("article", { className: "dsh-ssh-card" },
        h("div", { className: "dsh-ssh-card-head" },
          h("div", { className: "dsh-ssh-avatar" }, icon("terminal", 19)),
          h("div", { className: "dsh-ssh-card-main" },
            h("div", { className: "dsh-ssh-card-title-row" },
              h("span", { className: "dsh-ssh-card-title" }, server.name),
              h(Tag, { tone: test?.ok ? "good" : test ? "warn" : undefined }, test ? (test.ok ? "已连接" : "连接失败") : "已配置")),
            h("div", { className: "dsh-ssh-card-addr" }, `${server.username}@${server.host}:${server.port}`),
            server.description ? h("p", { className: "dsh-ssh-card-desc" }, server.description) : null,
            h("div", { className: "dsh-ssh-card-tags" },
              h(Tag, null, server.auth === "agent" ? "SSH Agent" : server.auth === "password" ? "密码认证" : server.keySource === "path" ? "外部私钥" : "插件托管密钥"),
              server.hasPassphrase ? h(Tag, null, "口令保护") : null,
              server.auth === "password" ? h(Tag, null, "密码已保存") : null)),
          h("div", { className: "dsh-ssh-card-actions" },
            h("button", { type: "button", className: "dsh-ssh-btn dsh-ssh-btn-sm", onClick: () => onTest(server), disabled: testing },
              testing ? h("span", { className: "dsh-ssh-spin", style: { display: "inline-flex" } }, icon("spinner", 14)) : icon("check", 14),
              testing ? "测试中…" : "测试连接"),
            h("button", { type: "button", className: "dsh-ssh-icon-btn", title: "编辑服务器", "aria-label": `编辑 ${server.name}`, onClick: () => onEdit(server) }, icon("edit", 16)),
            h("button", { type: "button", className: "dsh-ssh-icon-btn danger", title: "删除服务器", "aria-label": `删除 ${server.name}`, onClick: () => onDelete(server) }, icon("trash", 16)))),
        testState?.status === "error" ? h("div", { className: "dsh-ssh-test bad", role: "status" }, testState.error)
          : test ? h("div", { className: cx("dsh-ssh-test", test.ok ? "good" : "bad"), role: "status" }, formatTestResult(test)) : null,
        h("details", { className: "dsh-ssh-details" },
          h("summary", null, server.auth === "key" ? "连接信息与公钥" : "连接信息"),
          h("div", { className: "dsh-ssh-details-body" },
            h("dl", { className: "dsh-ssh-kv" },
              h("dt", null, "服务器 id"), h("dd", null, h("code", { className: "dsh-ssh-tool-name" }, server.id)),
              h("dt", null, "认证"), h("dd", null, server.auth === "agent" ? "SSH Agent" : server.auth === "password" ? "密码认证" : server.keySource === "path" ? "本机私钥文件" : server.keySource === "generated" ? "插件生成的 Ed25519 密钥" : "插件托管私钥"),
              h("dt", null, "凭据"), h("dd", null, server.auth === "password" ? "密码已保存在本机（不可查看）" : server.keyPath ? h("code", { className: "dsh-ssh-tool-name" }, server.keyPath) : server.hasKey ? "私钥已保存在 DSH 数据目录（不可查看）" : "未绑定私钥"),
              h("dt", null, "主机密钥"), h("dd", null, "首次连接自动接受并记录，之后变化会拒绝连接")),
            server.auth === "key" && server.publicKey ? h("div", { className: "dsh-ssh-field" },
              h("div", { className: "dsh-ssh-keybar" },
                h("span", { className: "dsh-ssh-label" }, "公钥"),
                h("button", { type: "button", className: "dsh-ssh-btn dsh-ssh-btn-sm", onClick: copyKey }, icon(copied === "public" ? "check" : "copy", 13), copied === "public" ? "已复制" : "复制公钥")),
              h("pre", { className: "dsh-ssh-code" }, server.publicKey),
              h("p", { className: "dsh-ssh-key-help" }, "把这段公钥添加到远端的 ~/.ssh/authorized_keys（每行一个）。")) : null,
            server.auth === "agent" ? h("p", { className: "dsh-ssh-key-help" }, "认证由本机 SSH Agent 完成；Agent 中需要加载远端已授权的私钥。") : null,
            server.auth === "password" ? h("p", { className: "dsh-ssh-key-help" }, "密码以明文保存在本机 DSH 数据目录，不会返回浏览器或发送给模型。") : null)));
    }

    function SshPage({ call, notify }) {
      const { status, servers, paths, error, reload } = useServers(call);
      const [editor, setEditor] = useState(null);
      const [deleting, setDeleting] = useState(null);
      const [deleteBusy, setDeleteBusy] = useState(false);
      const [tests, setTests] = useState({});
      const [refreshing, setRefreshing] = useState(false);

      const refresh = useCallback(async () => {
        setRefreshing(true);
        try { await reload(); } finally { setRefreshing(false); }
      }, [reload]);

      const runTest = useCallback(async server => {
        setTests(previous => ({ ...previous, [server.id]: { status: "running" } }));
        try {
          const result = await call("testServer", { id: server.id });
          setTests(previous => ({ ...previous, [server.id]: { status: "done", result } }));
          notify(result.ok ? `${server.name} 连接成功` : `${server.name} 连接失败`, result.ok ? "good" : "bad");
        } catch (failure) {
          const message = failure instanceof Error ? failure.message : String(failure);
          setTests(previous => ({ ...previous, [server.id]: { status: "error", error: message } }));
          notify(message, "bad");
        }
      }, [call, notify]);

      const remove = useCallback(async () => {
        if (!deleting) return;
        setDeleteBusy(true);
        try {
          await call("removeServer", { id: deleting.id });
          notify(`已删除 ${deleting.name}`, "good");
          setDeleting(null);
          await reload();
        } catch (failure) {
          notify(failure instanceof Error ? failure.message : String(failure), "bad");
        } finally {
          setDeleteBusy(false);
        }
      }, [call, deleting, notify, reload]);

      const installed = paths?.dataDir;

      return h("div", { className: "dsh-ssh-page" },
        h("div", { className: "dsh-ssh-inner" },
          h("header", { className: "dsh-ssh-header" },
            h("div", { className: "dsh-ssh-heading" },
              h("div", { className: "dsh-ssh-mark" }, icon("terminal", 23)),
              h("div", null,
                h("h1", { className: "dsh-ssh-title" }, "SSH 远程服务器"),
                h("p", { className: "dsh-ssh-subtitle" }, "管理密钥与服务器，让 Agent 直接在远端执行命令。"))),
            h("div", { className: "dsh-ssh-header-actions" },
              h("button", { type: "button", className: "dsh-ssh-btn", onClick: refresh, disabled: refreshing || status === "loading", title: "刷新列表" },
                h("span", { className: refreshing ? "dsh-ssh-spin" : "", style: { display: "inline-flex" } }, icon("refresh", 15)),
                "刷新"),
              h("button", { type: "button", className: "dsh-ssh-btn dsh-ssh-btn-primary", onClick: () => setEditor({ mode: "add" }) }, icon("plus", 15), "添加服务器"))),
          status === "loading" ? h("div", { className: "dsh-ssh-loading" }, h("span", { className: "dsh-ssh-spin", style: { display: "inline-flex" } }, icon("spinner", 16)), "正在读取配置…") : null,
          status === "error" ? h("div", { className: "dsh-ssh-error" }, error) : null,
          status !== "loading" ? h("div", { className: "dsh-ssh-summary" },
            h(Tag, { tone: servers.length ? "good" : undefined }, `${servers.length} 台服务器`),
            installed ? h("span", null, "配置目录：", h("span", { className: "dsh-ssh-pill" }, installed)) : null) : null,
          h("section", { "aria-labelledby": "dsh-ssh-servers-title" },
            h("div", { className: "dsh-ssh-section-head" },
              h("h2", { id: "dsh-ssh-servers-title", className: "dsh-ssh-section-title" }, "服务器"),
              servers.length ? h("span", { className: "dsh-ssh-section-hint" }, "测试连接会实际登录远端，执行只读探测命令") : null),
            status !== "loading" && servers.length === 0
              ? h("div", { className: "dsh-ssh-empty" },
                  h("div", { className: "dsh-ssh-empty-icon" }, icon("server", 26)),
                  h("h3", { className: "dsh-ssh-empty-title" }, "还没有配置 SSH 服务器"),
                  h("p", { className: "dsh-ssh-empty-text" }, "添加服务器并配置私钥、密码或 SSH Agent 后，我就可以在远端执行命令、查看日志和排查问题。凭据只保存在本机。"),
                  h("button", { type: "button", className: "dsh-ssh-btn dsh-ssh-btn-primary", onClick: () => setEditor({ mode: "add" }) }, icon("plus", 15), "添加第一台服务器"))
              : h("div", { className: "dsh-ssh-list" },
                  servers.map(server => h(ServerCard, {
                    key: server.id,
                    server,
                    call,
                    notify,
                    onEdit: value => setEditor({ mode: "edit", server: value }),
                    onDelete: value => setDeleting(value),
                    testState: tests[server.id],
                    onTest: runTest,
                  })))),
          ),
        editor ? h(ServerEditor, {
          call,
          initial: editor.server,
          notify,
          onClose: () => setEditor(null),
          onSaved: async () => { setEditor(null); await reload(); },
        }) : null,
        deleting ? h(ConfirmDelete, {
          server: deleting,
          busy: deleteBusy,
          onClose: () => { if (!deleteBusy) setDeleting(null); },
          onConfirm: remove,
        }) : null);
    }

    /** DSH browser plugin entry. */
    const inject = ["slots", "layout", "remote"];

    function apply(ctx) {
      ensureStyles();
      const descriptors = buildDescriptors();
      const mounted = ctx.remote.$mount({ package: "dsh-ssh", descriptors });
      mounted.catch(error => {
        console.error("dsh-ssh: failed to mount its Remote namespace", error);
      });

      const call = async (method, input) => {
        await mounted;
        const namespace = ctx.get('remote.ssh');
        if (!namespace || typeof namespace[method] !== "function") {
          throw new Error("SSH 配置服务尚未就绪，请刷新页面后重试");
        }
        const result = input === undefined ? await namespace[method]() : await namespace[method](input);
        if (!result.ok) {
          const error = result.error;
          throw new Error(error?.message || "SSH 配置服务返回错误");
        }
        return result.value;
      };

      function notify(text, tone = "good") {
        // The page owns the toast; this window-level event keeps the editor
        // usable before React mounts its own state.
        window.dispatchEvent(new CustomEvent("dsh-ssh:notify", { detail: { text, tone } }));
      }

      function SshPanel() {
        const [toast, setToast] = useState(null);
        const timer = useRef(null);
        useEffect(() => {
          const onNotify = event => {
            setToast({ text: String(event.detail?.text ?? ""), tone: event.detail?.tone === "bad" ? "bad" : "good" });
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setToast(null), 5200);
          };
          window.addEventListener("dsh-ssh:notify", onNotify);
          return () => {
            window.removeEventListener("dsh-ssh:notify", onNotify);
            if (timer.current) clearTimeout(timer.current);
          };
        }, []);
        return h(React.Fragment, null,
          h(SshPage, { call, notify }),
          h(Toast, { toast }));
      }

      function SshPanelIcon({ size = 20, active }) {
        return h("span", { style: { display: "inline-flex", color: active ? "var(--dsw-alias-state-business-primary)" : "currentColor" } }, icon("terminal", size));
      }

      ctx.effect(() => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 6,
        label: "SSH",
      }, SshPanelIcon)), "dsh-ssh: sidebar entry");

      ctx.effect(() => ctx.slots.inject("main", () => ctx.slots.register({
        name: "main",
        key: PANEL_ID,
      }, SshPanel)), "dsh-ssh: settings panel");
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.PANEL_ID = PANEL_ID;
    return module.exports;
  }
});
