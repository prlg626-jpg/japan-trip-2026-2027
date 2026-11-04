import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const { build } = createRequire(import.meta.resolve('vite'))('esbuild');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purchase-comparison-'));
try {
  const outfile = path.join(dir, 'comparison.mjs');
  await build({ stdin: { contents: 'export * from "./src/utils/purchaseComparison";', resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile });
  const { purchaseComparison, purchaseCardLastFour } = await import(pathToFileURL(outfile));
  const item = (id, category, amountCOP, extra = {}) => ({ id, category, amountCOP, status: 'Pagado', name: '', notes: '', ...extra });
  const rows = [
    item('activity', 'Actividades', 100, { paymentMethodLabel: 'Tarjeta terminada en 2724' }),
    item('old-teamlab', 'Actividades', 200, { name: 'teamLab · tarjeta 2724' }),
    item('old-notes', 'Actividades', 50, { notes: 'Pagado con tarjeta terminada en 2724.' }),
    item('other-card', 'Actividades', 900, { paymentMethodLabel: '0116', notes: 'Antes tarjeta 2724' }),
    item('unpaid', 'Actividades', 400, { status: 'Reservado', paymentMethodLabel: '2724' }),
    item('cancelled', 'Actividades', 500, { status: 'Cancelado', paymentMethodLabel: '2724' }),
    item('shopping', 'Compras', 600, { paymentMethodLabel: '2724' }),
    item('hotel', 'Hoteles', 1000), item('flight', 'Vuelos internacionales', 2000),
    item('unpaid-hotel', 'Hoteles', 3000, { status: 'Reservado' }),
    item('summary-selected-activities', 'Actividades', 9000, { paymentMethodLabel: '2724' }),
  ];
  const total = purchaseComparison(rows);
  assert.equal(total.activityTotal, 350);
  assert.equal(total.hotelFlightTotal, 3000);
  assert.equal(total.remaining, 2650);
  assert.equal(total.exceeded, 0);
  assert.equal(purchaseCardLastFour(rows[3]), '0116', 'explicit card overrides historical notes');
  assert.equal(purchaseCardLastFour(item('a','Actividades',2724)), null, 'amount is not a card');
  const added = [...rows, item('new', 'Actividades', 4000, { paymentMethodLabel: '2724' })];
  assert.equal(purchaseComparison(added).remaining, 0);
  assert.equal(purchaseComparison(added).exceeded, 1350);
  added.at(-1).amountCOP = 1000;
  assert.equal(purchaseComparison(added).remaining, 1650, 'edited bank charge immediately changes comparison');
  added.at(-1).status = 'Cancelado';
  assert.equal(purchaseComparison(added).activityTotal, 350);
  assert.equal(purchaseComparison([]).remaining, 0);
  console.log('Purchase comparison passed: card attribution, paid only, no hotel/flight duplication, edits, new purchases and exceeded target.');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
