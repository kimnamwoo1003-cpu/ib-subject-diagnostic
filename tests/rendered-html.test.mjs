import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AdminClient from "../app/admin/admin-client.tsx";
import { PremiumApplication } from "../app/diagnostic-client.tsx";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("renders the complete Premium payment and administrator review surfaces", () => {
  const premiumHtml = renderToStaticMarkup(React.createElement(PremiumApplication, {
    request: null, message: "", amount: "", method: "bank_transfer", payer: "", reference: "", note: "", busy: false,
    onAmount() {}, onMethod() {}, onPayer() {}, onReference() {}, onNote() {}, onSubmit() {}, async onRefresh() {}, onBack() {},
  }));
  assert.match(premiumHtml, /Amount paid \(KRW\)/);
  assert.match(premiumHtml, /Payment reference/);
  assert.match(premiumHtml, /does not charge a card/i);
  assert.match(premiumHtml, /Submit for payment review/);

  const adminHtml = renderToStaticMarkup(React.createElement(AdminClient, { adminName: "justinnamwoo1003", embedded: true, onBack() {} }));
  assert.match(adminHtml, /Premium reviews/);
  assert.match(adminHtml, /Search accounts or payment reference/);
  assert.match(adminHtml, /Safe review workflow/);
});
