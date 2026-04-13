import type {
  RawMaterialPurchaseDetail,
  WarehouseDailyStockReport,
  WarehouseProductionDetail,
  WarehouseTransferDetail,
} from "@/entities/types";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatQty(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatPurchaseDateOnly(isoDate: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    try {
      const [y, m, d] = isoDate.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoDate;
    }
  }
  return isoDate;
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function openPrintDocument(title: string, innerHtml: string) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 1.5rem; max-width: 48rem; margin: 0 auto; color: #111; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    .meta { font-size: 0.875rem; color: #444; margin-bottom: 1rem; }
    .meta div { margin: 0.15rem 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.875rem; }
    th, td { border-bottom: 1px solid #ddd; padding: 0.5rem 0.4rem; text-align: left; }
    th { font-weight: 600; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .notes { margin-top: 1rem; font-size: 0.875rem; white-space: pre-wrap; }
    @media print { body { padding: 0.5rem; } }
  </style>
</head>
<body>
${innerHtml}
</body>
</html>`;
  w.document.write(doc);
  w.document.close();
  w.focus();
  w.print();
  w.close();
  return true;
}

export function printWarehouseProductionDetail(d: WarehouseProductionDetail) {
  const rows = d.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.menuItemName)}</td><td class="num">${formatQty(l.quantity)}</td><td class="num">${formatQty(l.damageQuantity ?? 0)}</td></tr>`,
    )
    .join("");
  const notes = d.notes?.trim()
    ? `<div class="notes"><strong>Notes</strong><br/>${escapeHtml(d.notes.trim())}</div>`
    : "";
  const inner = `
    <h1>Warehouse production</h1>
    <div class="meta">
      <div><strong>Receipt</strong> ${escapeHtml(d.receiptNo)}</div>
      <div><strong>Warehouse</strong> ${escapeHtml(d.warehouseName)}</div>
      <div><strong>Date</strong> ${escapeHtml(formatWhen(d.createdAt))}</div>
    </div>
    <table>
      <thead><tr><th>Item</th><th class="num">Good qty</th><th class="num">Damage</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${notes}
  `;
  return openPrintDocument(`Production ${d.receiptNo}`, inner);
}

export function printWarehouseTransferDetail(d: WarehouseTransferDetail) {
  const rows = d.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.menuItemName)}</td><td class="num">${formatQty(l.quantity)}</td></tr>`,
    )
    .join("");
  const notes = d.notes?.trim()
    ? `<div class="notes"><strong>Notes</strong><br/>${escapeHtml(d.notes.trim())}</div>`
    : "";
  const inner = `
    <h1>Warehouse transfer</h1>
    <div class="meta">
      <div><strong>Receipt</strong> ${escapeHtml(d.receiptNo)}</div>
      <div><strong>Warehouse</strong> ${escapeHtml(d.warehouseName)}</div>
      <div><strong>Outlet</strong> ${escapeHtml(d.outletName)}</div>
      <div><strong>Date</strong> ${escapeHtml(formatWhen(d.createdAt))}</div>
    </div>
    <table>
      <thead><tr><th>Item</th><th class="num">Qty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${notes}
  `;
  return openPrintDocument(`Transfer ${d.receiptNo}`, inner);
}

export function printRawMaterialPurchaseDetail(d: RawMaterialPurchaseDetail) {
  const rows = d.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.rawMaterialItemName)}</td><td>${escapeHtml(l.supplierName)}</td><td class="num">${formatQty(l.quantity)}</td><td class="num">${formatMoney(l.ratePerUnit)}</td><td class="num">${formatMoney(l.lineTotal)}</td></tr>`,
    )
    .join("");
  const notes = d.notes?.trim()
    ? `<div class="notes"><strong>Notes</strong><br/>${escapeHtml(d.notes.trim())}</div>`
    : "";
  const grand = d.lines.reduce((s, l) => s + l.lineTotal, 0);
  const inner = `
    <h1>Raw material purchase</h1>
    <div class="meta">
      <div><strong>Receipt</strong> ${escapeHtml(d.receiptNo)}</div>
      <div><strong>Warehouse</strong> ${escapeHtml(d.warehouseName)}</div>
      <div><strong>Purchase date</strong> ${escapeHtml(formatPurchaseDateOnly(d.purchaseDate))}</div>
      <div><strong>Recorded</strong> ${escapeHtml(formatWhen(d.createdAt))}</div>
    </div>
    <table>
      <thead><tr><th>Item</th><th>Purchased from</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="notes"><strong>Grand total</strong> ${escapeHtml(formatMoney(grand))}</p>
    ${notes}
  `;
  return openPrintDocument(`Purchase ${d.receiptNo}`, inner);
}

export function printWarehouseDailyStockReport(r: WarehouseDailyStockReport) {
  const outletHeaderCells = r.outletColumns
    .map(
      (o) =>
        `<th class="num" style="background:#e5e7eb;">${escapeHtml(o.name)}</th>`,
    )
    .join("");

  const dayBlocks = r.days
    .map((day) => {
      const rows = day.rows
        .map((row) => {
          const transferCells = r.outletColumns
            .map((_, i) => {
              const q = row.transferQuantities[i] ?? 0;
              return `<td class="num">${formatQty(q)}</td>`;
            })
            .join("");
          return `<tr>
        <td>${escapeHtml(row.itemName)}</td>
        <td class="num">${formatQty(row.openingStock)}</td>
        <td class="num">${formatQty(row.productionAdded)}</td>
        ${transferCells}
        <td class="num">${formatQty(row.damage)}</td>
        <td class="num">${formatQty(row.closingStock)}</td>
      </tr>`;
        })
        .join("");
      return `<h2 style="margin-top:1.25rem;font-size:1.05rem;">${escapeHtml(formatPurchaseDateOnly(day.date))}</h2>
    <table style="margin-top:0.5rem;">
      <thead><tr>
        <th style="background:#e5e7eb;">Item</th>
        <th class="num" style="background:#e5e7eb;">Opening</th>
        <th class="num" style="background:#e5e7eb;">Production</th>
        ${outletHeaderCells}
        <th class="num" style="background:#e5e7eb;">Damage</th>
        <th class="num" style="background:#e5e7eb;">Closing</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    })
    .join("");

  const inner = `
    <h1>Warehouse daily stock</h1>
    <div class="meta">
      <div><strong>Warehouse</strong> ${escapeHtml(r.warehouseName)}</div>
      <div><strong>From</strong> ${escapeHtml(formatPurchaseDateOnly(r.fromDate))}</div>
      <div><strong>To</strong> ${escapeHtml(formatPurchaseDateOnly(r.toDate))}</div>
      <div style="font-size:0.8rem;color:#666;">Days follow UTC midnight boundaries (same as server stock history).</div>
    </div>
    ${dayBlocks}
  `;
  return openPrintDocument(
    `Stock ${r.warehouseName} ${r.fromDate}–${r.toDate}`,
    inner,
  );
}
