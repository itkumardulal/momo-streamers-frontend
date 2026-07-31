import {
  AssetStatus,
  type AssetMaintenanceReport,
  type AssetReport,
  type MonthlyBusinessSheet,
  type OutletDailyStockReport,
  type OutletDailySheetReport,
  type PerOutletPerformanceReport,
  type RawMaterialPurchaseDetail,
  type WarehouseDailyStockReport,
  type WarehouseProductionDetail,
  type WarehouseTransferDetail,
} from "@/entities/types";

const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  [AssetStatus.Active]: "Active",
  [AssetStatus.Inactive]: "Inactive",
  [AssetStatus.Disposed]: "Disposed",
};

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

function openPrintDocument(
  title: string,
  innerHtml: string,
  options?: { bodyMaxWidth?: string },
) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const bodyMaxWidth = options?.bodyMaxWidth ?? "48rem";
  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 1.5rem; max-width: ${bodyMaxWidth}; margin: 0 auto; color: #111; }
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

export function printOutletDailyStockReport(r: OutletDailyStockReport) {
  const dayBlocks = r.days
    .map((day) => {
      const menuRows = day.menuRows
        .map(
          (row) =>
            `<tr>
        <td>${escapeHtml(row.itemName)}</td>
        <td class="num">${formatQty(row.openingStock)}</td>
        <td class="num">${formatQty(row.transferIn)}</td>
        <td class="num">${formatQty(row.sold)}</td>
        <td class="num">${formatQty(row.damage)}</td>
        <td class="num">${formatQty(row.staff)}</td>
        <td class="num">${formatQty(row.closingStock)}</td>
      </tr>`,
        )
        .join("");
      const directRows = day.directRows
        .map(
          (row) =>
            `<tr>
        <td>${escapeHtml(row.itemName)}</td>
        <td class="num">${formatQty(row.openingStock)}</td>
        <td class="num">${formatQty(row.purchasedIn)}</td>
        <td class="num">${formatQty(row.sold)}</td>
        <td class="num">${formatQty(row.damage)}</td>
        <td class="num">${formatQty(row.staff)}</td>
        <td class="num">${formatQty(row.closingStock)}</td>
      </tr>`,
        )
        .join("");
      return `<h2 style="margin-top:1.25rem;font-size:1.05rem;">${escapeHtml(formatPurchaseDateOnly(day.date))}</h2>
    <p style="margin:0.35rem 0 0.2rem;font-size:0.9rem;font-weight:600;">Momo (menu) stock</p>
    <table style="margin-top:0.35rem;">
      <thead><tr>
        <th style="background:#e5e7eb;">Item</th>
        <th class="num" style="background:#e5e7eb;">Opening</th>
        <th class="num" style="background:#e5e7eb;">In (transfer)</th>
        <th class="num" style="background:#e5e7eb;">Sold</th>
        <th class="num" style="background:#e5e7eb;">Damage</th>
        <th class="num" style="background:#e5e7eb;">Staff</th>
        <th class="num" style="background:#e5e7eb;">Closing</th>
      </tr></thead>
      <tbody>${menuRows}</tbody>
    </table>
    <p style="margin:0.85rem 0 0.2rem;font-size:0.9rem;font-weight:600;">Drinks / retail</p>
    <table style="margin-top:0.35rem;">
      <thead><tr>
        <th style="background:#e5e7eb;">Item</th>
        <th class="num" style="background:#e5e7eb;">Opening</th>
        <th class="num" style="background:#e5e7eb;">Purchased</th>
        <th class="num" style="background:#e5e7eb;">Sold</th>
        <th class="num" style="background:#e5e7eb;">Damage</th>
        <th class="num" style="background:#e5e7eb;">Staff</th>
        <th class="num" style="background:#e5e7eb;">Closing</th>
      </tr></thead>
      <tbody>${directRows}</tbody>
    </table>`;
    })
    .join("");

  const inner = `
    <h1>Outlet daily stock</h1>
    <div class="meta">
      <div><strong>Outlet</strong> ${escapeHtml(r.outletName)}</div>
      <div><strong>Warehouse</strong> ${escapeHtml(r.warehouseName)}</div>
      <div><strong>From</strong> ${escapeHtml(formatPurchaseDateOnly(r.fromDate))}</div>
      <div><strong>To</strong> ${escapeHtml(formatPurchaseDateOnly(r.toDate))}</div>
      <div style="font-size:0.8rem;color:#666;">Days follow UTC midnight boundaries (same as server stock history).</div>
    </div>
    ${dayBlocks}
  `;
  return openPrintDocument(
    `Outlet stock ${r.outletName} ${r.fromDate}–${r.toDate}`,
    inner,
  );
}

export function printOutletDailySheetReport(r: OutletDailySheetReport) {
  const coll = r.collection;
  const menuBody = r.menuRows
    .map(
      (row) =>
        `<tr>
        <td>${escapeHtml(row.itemName)}</td>
        <td class="num">${formatQty(row.opening)}</td>
        <td class="num">${formatQty(row.purchasedIn)}</td>
        <td class="num">${formatQty(row.available)}</td>
        <td class="num">${formatQty(row.sold)}</td>
        <td class="num">${formatQty(row.damage)}</td>
        <td class="num">${formatQty(row.staff)}</td>
        <td class="num">${formatQty(row.remaining)}</td>
        <td class="num">${escapeHtml(formatMoney(row.costPerUnit))}</td>
        <td class="num">${escapeHtml(formatMoney(row.sellPerUnit))}</td>
        <td class="num">${escapeHtml(formatMoney(row.salesValue))}</td>
        <td class="num">${escapeHtml(formatMoney(row.cogs))}</td>
        <td class="num">${escapeHtml(formatMoney(row.profit))}</td>
      </tr>`,
    )
    .join("");
  const directBody = r.directRows
    .map(
      (row) =>
        `<tr>
        <td>${escapeHtml(row.itemName)}</td>
        <td class="num">${formatQty(row.opening)}</td>
        <td class="num">${formatQty(row.purchasedIn)}</td>
        <td class="num">${formatQty(row.available)}</td>
        <td class="num">${formatQty(row.sold)}</td>
        <td class="num">${formatQty(row.damage)}</td>
        <td class="num">${formatQty(row.staff)}</td>
        <td class="num">${formatQty(row.remaining)}</td>
        <td class="num">—</td>
        <td class="num">${escapeHtml(formatMoney(row.sellPerUnit))}</td>
        <td class="num">${escapeHtml(formatMoney(row.salesValue))}</td>
        <td class="num">—</td>
        <td class="num">${escapeHtml(formatMoney(row.profit))}</td>
      </tr>`,
    )
    .join("");
  const saleableHead = `<tr>
      <th style="background:#e5e7eb;">Item</th>
      <th class="num" style="background:#e5e7eb;">Opening</th>
      <th class="num" style="background:#e5e7eb;">In</th>
      <th class="num" style="background:#e5e7eb;">Avail.</th>
      <th class="num" style="background:#e5e7eb;">Sold</th>
      <th class="num" style="background:#e5e7eb;">Damage</th>
      <th class="num" style="background:#e5e7eb;">Staff</th>
      <th class="num" style="background:#e5e7eb;">Rem.</th>
      <th class="num" style="background:#e5e7eb;">Cost/u</th>
      <th class="num" style="background:#e5e7eb;">Sell/u</th>
      <th class="num" style="background:#e5e7eb;">Sales</th>
      <th class="num" style="background:#e5e7eb;">COGS</th>
      <th class="num" style="background:#e5e7eb;">Profit</th>
    </tr>`;

  const expenseBlock =
    r.includeExpenses && r.expenseRows.length > 0
      ? `<h2 style="margin-top:1.25rem;font-size:1.05rem;">Other purchases / expenses</h2>
    <table style="margin-top:0.35rem;">
      <thead><tr>
        <th style="background:#e5e7eb;">Item</th>
        <th class="num" style="background:#e5e7eb;">Total</th>
      </tr></thead>
      <tbody>${r.expenseRows
        .map(
          (e) =>
            `<tr><td>${escapeHtml(e.itemName)}</td><td class="num">${escapeHtml(formatMoney(e.totalCost))}</td></tr>`,
        )
        .join("")}</tbody>
    </table>`
      : r.includeExpenses
        ? `<p style="margin-top:1rem;font-size:0.9rem;color:#666;">No expense entries for this day.</p>`
        : "";

  const s = r.summary;
  const summaryBlock = `<h2 style="margin-top:1.25rem;font-size:1.05rem;">Summary</h2>
    <table style="margin-top:0.35rem;max-width:28rem;">
      <tbody>
        <tr><th scope="row" style="text-align:left;">Total sales (receipts)</th><td class="num">${escapeHtml(formatMoney(s.totalSalesValue))}</td></tr>
        <tr><th scope="row" style="text-align:left;">Other charge income</th><td class="num">${escapeHtml(formatMoney(s.otherChargeIncome))}</td></tr>
        <tr><th scope="row" style="text-align:left;">Saleable COGS</th><td class="num">${escapeHtml(formatMoney(s.saleableCogs))}</td></tr>
        <tr><th scope="row" style="text-align:left;">Gross profit</th><td class="num">${escapeHtml(formatMoney(s.grossProfit))}</td></tr>
        <tr><th scope="row" style="text-align:left;">Other purchase cost</th><td class="num">${escapeHtml(formatMoney(s.otherPurchaseCost))}</td></tr>
        <tr><th scope="row" style="text-align:left;"><strong>Net profit</strong></th><td class="num"><strong>${escapeHtml(formatMoney(s.netProfit))}</strong></td></tr>
      </tbody>
    </table>`;

  const inner = `
    <h1>Outlet daily sheet</h1>
    <div class="meta">
      <div><strong>Outlet</strong> ${escapeHtml(r.outletName)}</div>
      <div><strong>Warehouse</strong> ${escapeHtml(r.warehouseName)}</div>
      <div><strong>Date</strong> ${escapeHtml(formatPurchaseDateOnly(r.date))}</div>
      <div style="font-size:0.8rem;color:#666;">UTC calendar day; menu COGS uses current recipe costs (same caveat as dashboard).</div>
    </div>
    <h2 style="margin-top:1.25rem;font-size:1.05rem;">Collection</h2>
    <table style="margin-top:0.35rem;max-width:24rem;">
      <tbody>
        <tr><th scope="row" style="text-align:left;">Cash</th><td class="num">${escapeHtml(formatMoney(coll.cashCollection))}</td></tr>
        <tr><th scope="row" style="text-align:left;">Card / bank</th><td class="num">${escapeHtml(formatMoney(coll.bankCollection))}</td></tr>
        <tr><th scope="row" style="text-align:left;"><strong>Total collection</strong></th><td class="num"><strong>${escapeHtml(formatMoney(coll.totalCollection))}</strong></td></tr>
      </tbody>
    </table>
    <h2 style="margin-top:1.25rem;font-size:1.05rem;">Saleable stock — Menu</h2>
    <table style="margin-top:0.35rem;font-size:0.82rem;">
      <thead>${saleableHead}</thead>
      <tbody>${menuBody}</tbody>
    </table>
    <h2 style="margin-top:1rem;font-size:1.05rem;">Saleable stock — Direct retail</h2>
    <p style="margin:0.2rem 0;font-size:0.78rem;color:#666;">Direct retail has no stored default unit cost; COGS shown as —.</p>
    <table style="margin-top:0.35rem;font-size:0.82rem;">
      <thead>${saleableHead}</thead>
      <tbody>${directBody || `<tr><td colspan="13" style="padding:0.5rem;color:#666;">No direct retail rows.</td></tr>`}</tbody>
    </table>
    ${expenseBlock}
    ${summaryBlock}
  `;
  return openPrintDocument(`Daily sheet ${r.outletName} ${r.date}`, inner);
}

/** Print-friendly monthly P&L grid (POS revenue + dynamic expense items). */
export function printMonthlyBusinessSheet(d: MonthlyBusinessSheet): boolean {
  const monthTitle = new Date(d.year, d.month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const thOutlet = d.outlets
    .map((o) => `<th class="num">${escapeHtml(o.name)}</th>`)
    .join("");
  const num = (x: number) =>
    `<td class="num">${escapeHtml(formatMoney(x))}</td>`;
  const rowNums = (vals: number[]) => vals.map((x) => num(x)).join("");

  const salesRow = `<tr><th scope="row">Sales</th>${rowNums(d.outletSales)}${num(0)}${num(d.totalSales)}</tr>`;
  const otherRow = `<tr><th scope="row">Other income</th>${rowNums(d.outletOtherIncome)}${num(0)}${num(d.totalOtherIncome)}</tr>`;
  const totRevRow = `<tr><th scope="row"><strong>Total revenue</strong></th>${rowNums(d.outletTotalRevenue)}${num(0)}${num(d.totalRevenue)}</tr>`;

  const expenseBody = d.expenseRows
    .map(
      (r) =>
        `<tr><th scope="row">${escapeHtml(r.label)}</th>${rowNums(r.outletAmounts)}${num(r.warehouseAmount)}${num(r.rowTotal)}</tr>`,
    )
    .join("");
  const totExpRow = `<tr><th scope="row"><strong>Total expenses</strong></th>${rowNums(d.outletTotalExpenses)}${num(d.warehouseTotalExpenses)}${num(d.grandTotalExpenses)}</tr>`;

  const inner = `
    <div style="max-width:none">
    <h1>${escapeHtml(monthTitle)} — ${escapeHtml(d.warehouseName)}</h1>
    <div class="meta">
      <div><strong>Warehouse</strong> ${escapeHtml(d.warehouseName)}</div>
      <div style="font-size:0.8rem;color:#666;">Revenue from outlet POS (UTC month boundaries). Warehouse revenue column is zero by convention.</div>
    </div>
    <h2 style="font-size:1rem;margin:1rem 0 0.35rem;">Revenue</h2>
    <table>
      <thead><tr>
        <th></th>${thOutlet}<th class="num">Warehouse</th><th class="num">Total</th>
      </tr></thead>
      <tbody>${salesRow}${otherRow}${totRevRow}</tbody>
    </table>
    <h2 style="font-size:1rem;margin:1rem 0 0.35rem;">Operating expenses</h2>
    <table>
      <thead><tr>
        <th></th>${thOutlet}<th class="num">Warehouse</th><th class="num">Total</th>
      </tr></thead>
      <tbody>${expenseBody}${totExpRow}</tbody>
    </table>
    <p style="margin-top:1rem;"><strong>Net profit</strong> ${escapeHtml(formatMoney(d.netProfit))}</p>
    <p><strong>Profit margin</strong> ${escapeHtml(formatMoney(d.profitMarginPercent))}%</p>
    </div>
  `;
  return openPrintDocument(
    `Monthly sheet ${d.warehouseName} ${d.year}-${String(d.month).padStart(2, "0")}`,
    inner,
    { bodyMaxWidth: "100%" },
  );
}

function formatMarginOrDash(n: number | null | undefined) {
  if (n == null) return "—";
  return `${formatMoney(n)}%`;
}

/** Print-friendly outlet performance (range summary + net profit by period). */
export function printPerOutletPerformance(d: PerOutletPerformanceReport): boolean {
  const num = (x: number) =>
    `<td class="num">${escapeHtml(formatMoney(x))}</td>`;

  const summaryBody = d.rangeSummary
    .map(
      (r) =>
        `<tr>
          <th scope="row">${escapeHtml(r.entityName)}</th>
          ${num(r.rangeRevenue)}
          ${num(r.rangeExpenses)}
          ${num(r.rangeNetProfit)}
          <td class="num">${escapeHtml(formatMarginOrDash(r.profitMarginPercent))}</td>
          ${num(r.avgNetPerPeriod)}
        </tr>`,
    )
    .join("");

  const thOutlets = d.outlets
    .map((o) => `<th class="num">${escapeHtml(o.name)} (net)</th>`)
    .join("");

  const periodRows = d.periods
    .map((p) => {
      const cells = d.outlets
        .map((_, i) => num(p.outletNetProfit[i] ?? 0))
        .join("");
      const head = `${escapeHtml(p.periodLabel)} <span style="font-weight:normal;font-size:0.78rem;color:#666;">(${escapeHtml(p.periodStart)} — ${escapeHtml(p.periodEnd)})</span>`;
      return `<tr>
        <th scope="row" style="text-align:left;">${head}</th>
        ${cells}
        ${num(p.warehouseNetProfit)}
        ${num(p.totalBusinessNetProfit)}
      </tr>`;
    })
    .join("");

  const outletSumNet = d.outlets.map((_, i) =>
    d.periods.reduce((s, p) => s + (p.outletNetProfit[i] ?? 0), 0),
  );
  const whSum = d.periods.reduce((s, p) => s + p.warehouseNetProfit, 0);
  const bizSum = d.periods.reduce((s, p) => s + p.totalBusinessNetProfit, 0);
  const totalCells = outletSumNet.map((x) => num(x)).join("");

  const totalRow = `<tr>
    <th scope="row"><strong>Period totals (sum of nets)</strong></th>
    ${totalCells}
    ${num(whSum)}
    ${num(bizSum)}
  </tr>`;

  const inner = `
    <div style="max-width:none">
    <h1>${escapeHtml(d.warehouseName)}</h1>
    <div class="meta">
      <div><strong>Range</strong> ${escapeHtml(d.fromDate)} — ${escapeHtml(d.toDate)}</div>
      <div><strong>Granularity</strong> ${escapeHtml(d.granularity)}</div>
      <div style="font-size:0.8rem;color:#666;">Sales bucketed by UTC date of POS timestamps; expenses by expense date. ISO weeks per ISO 8601. Same rules as monthly business sheet.</div>
    </div>
    <h2 style="font-size:1rem;margin:1rem 0 0.35rem;">Range summary</h2>
    <table>
      <thead><tr>
        <th>Entity</th>
        <th class="num">Range revenue</th>
        <th class="num">Range expenses</th>
        <th class="num">Range net profit</th>
        <th class="num">Profit margin %</th>
        <th class="num">Avg net / period</th>
      </tr></thead>
      <tbody>${summaryBody}</tbody>
    </table>
    <h2 style="font-size:1rem;margin:1rem 0 0.35rem;">Net profit by period</h2>
    <table>
      <thead><tr>
        <th>Period</th>
        ${thOutlets}
        <th class="num">Warehouse net</th>
        <th class="num">Total business net</th>
      </tr></thead>
      <tbody>${periodRows}${totalRow}</tbody>
    </table>
    </div>
  `;
  return openPrintDocument(
    `Outlet performance ${d.warehouseName} ${d.fromDate}_${d.toDate}_${d.granularity}`,
    inner,
    { bodyMaxWidth: "100%" },
  );
}

export function printAssetsReport(r: AssetReport) {
  const rows = r.rows
    .map((row) => {
      const loc = row.outletName || row.warehouseName || "—";
      const status =
        ASSET_STATUS_LABEL[row.status as AssetStatus] ?? String(row.status);
      return `<tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.categoryName)}</td>
        <td>${escapeHtml(status)}</td>
        <td>${escapeHtml(formatPurchaseDateOnly(row.purchaseDate))}</td>
        <td class="num">${formatMoney(row.purchaseCost)}</td>
        <td>${escapeHtml(row.warrantyExpiry ? formatPurchaseDateOnly(row.warrantyExpiry) : "—")}</td>
        <td>${escapeHtml(loc)}</td>
        <td>${escapeHtml(row.remarks?.trim() || "—")}</td>
      </tr>`;
    })
    .join("");

  const inner = `
    <h1>Assets report</h1>
    <div class="meta">
      <div><strong>Total assets</strong> ${r.totalCount}</div>
      <div><strong>Total purchase cost</strong> ${formatMoney(r.totalPurchaseCost)}</div>
    </div>
    <table>
      <thead><tr>
        <th>Name</th>
        <th>Category</th>
        <th>Status</th>
        <th>Purchase date</th>
        <th class="num">Purchase cost</th>
        <th>Warranty</th>
        <th>Location</th>
        <th>Remarks</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="8">No assets match the filters.</td></tr>`}</tbody>
    </table>
  `;
  return openPrintDocument("Assets report", inner, { bodyMaxWidth: "64rem" });
}

export function printAssetMaintenanceReport(r: AssetMaintenanceReport) {
  const rows = r.rows
    .map((row) => {
      const loc = row.outletName || row.warehouseName || "—";
      return `<tr>
        <td>${escapeHtml(formatPurchaseDateOnly(row.maintenanceDate))}</td>
        <td>${escapeHtml(row.assetName)}</td>
        <td>${escapeHtml(row.categoryName || "—")}</td>
        <td class="num">${formatMoney(row.cost)}</td>
        <td>${row.recordAsExpense ? "Yes" : "No"}</td>
        <td>${escapeHtml(row.expenseItemName || "—")}</td>
        <td>${escapeHtml(loc)}</td>
        <td>${escapeHtml(row.description?.trim() || "—")}</td>
      </tr>`;
    })
    .join("");

  const inner = `
    <h1>Asset maintenance report</h1>
    <div class="meta">
      <div><strong>Range</strong> ${escapeHtml(r.fromDate)} — ${escapeHtml(r.toDate)}</div>
      <div><strong>Records</strong> ${r.totalCount}</div>
      <div><strong>Total cost</strong> ${formatMoney(r.totalCost)}</div>
      <div><strong>Recorded as expense</strong> ${r.expenseCount} (${formatMoney(r.expenseCostTotal)})</div>
    </div>
    <table>
      <thead><tr>
        <th>Date</th>
        <th>Asset</th>
        <th>Category</th>
        <th class="num">Cost</th>
        <th>Expense</th>
        <th>Expense item</th>
        <th>Location</th>
        <th>Description</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="8">No maintenance records in this range.</td></tr>`}</tbody>
    </table>
  `;
  return openPrintDocument("Asset maintenance report", inner, {
    bodyMaxWidth: "64rem",
  });
}
