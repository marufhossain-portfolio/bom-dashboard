const sql = require("mssql");
const fs = require("fs");
const path = require("path");

const config = {
  server: process.env.MSSQL_SERVER,
  port: parseInt(process.env.MSSQL_PORT || "1433", 10),
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 120000,
    connectionTimeout: 30000,
  },
};

async function run() {
  const pool = await new sql.ConnectionPool(config).connect();

  // UOM map (most common non-empty name per id)
  const uomRes = await pool.request().query(
    "SELECT intBaseUOM, strBaseUomName FROM DWH.itm.tblItemArc WHERE intBaseUOM IS NOT NULL AND intBaseUOM <> 0 AND strBaseUomName IS NOT NULL AND LTRIM(RTRIM(strBaseUomName)) <> ''"
  );
  const uomMap = {};
  for (const r of uomRes.recordset) {
    const id = r.intBaseUOM;
    if (!(id in uomMap)) uomMap[id] = r.strBaseUomName;
  }

  // Headers + item info
  const headerSql = `
SELECT
 h.intBillOfMaterialId AS bomId, h.numLotSize,
 i.intItemId AS itemId, i.intItemMasterId AS masterId,
 i.strItemCode AS code, i.strItemBarcode AS barcode, i.strItemName AS name,
 i.itemSKUName AS skuName, i.strItemTypeName AS type,
 i.strItemCategoryName AS category, i.strItemSubCategoryName AS subCategory,
 i.strHSCode AS hsCode, i.stritemGroup AS grp, i.stritemSubGroup AS subGroup,
 i.stritemVariant AS variant, i.stritemColor AS color,
 i.strBaseUomName AS uom, i.strDrawingCode AS drawingCode, i.strPartNo AS partNo,
 i.numItemSize AS size, i.strItemSizeUOM AS sizeUom,
 i.numStdPurchaseRate AS purchaseRate, i.numStdSalesRate AS salesRate,
 i.numStdProductionRate AS productionRate, i.numAvailableStock AS availableStock
FROM DWH.mes.tblBillOfMaterialHeaderArc h
JOIN DWH.itm.tblItemArc i ON i.intItemId = h.intItemId
WHERE h.isStandardBoM = 1 AND h.isActive = 1 AND h.isApproved = 1
ORDER BY i.strItemCode`;

  const headerRes = await pool.request().query(headerSql);

  // Rows
  const rowSql = `
SELECT r.intBillOfMaterialId AS bomId, r.strItemCode AS code, r.strItemName AS name,
       r.numQuantity AS qty, r.intUOMId AS uomId
FROM DWH.mes.tblBillOfMaterialRowArc r
JOIN DWH.mes.tblBillOfMaterialHeaderArc h ON r.intBillOfMaterialId = h.intBillOfMaterialId
WHERE h.isStandardBoM = 1 AND h.isActive = 1 AND h.isApproved = 1 AND r.isActive = 1
ORDER BY r.intBillOfMaterialId, r.intBoMRowId`;
  const rowRes = await pool.request().query(rowSql);

  const rowsByBom = {};
  for (const r of rowRes.recordset) {
    if (!rowsByBom[r.bomId]) rowsByBom[r.bomId] = [];
    rowsByBom[r.bomId].push(r);
  }

  const items = [];
  for (const h of headerRes.recordset) {
    const bomRows = (rowsByBom[h.bomId] || []).map((r) => ({
      code: r.code || "",
      name: r.name || "",
      qty: r.qty == null ? "" : Number(r.qty),
      uom: uomMap[r.uomId] || "",
    }));

    const num = (v) => (v == null ? null : Number(v));
    items.push({
      itemId: h.itemId,
      masterId: h.masterId == null ? null : Number(h.masterId),
      code: h.code || "",
      barcode: h.barcode || "",
      name: h.name || "",
      skuName: h.skuName || "",
      type: h.type || "",
      category: h.category || "",
      subCategory: h.subCategory || "",
      hsCode: h.hsCode || "",
      grp: h.grp || "",
      subGroup: h.subGroup || "",
      variant: h.variant || "",
      color: h.color || "",
      uom: h.uom || "",
      drawingCode: h.drawingCode || "",
      partNo: h.partNo || "",
      size: h.size == null ? "" : Number(h.size),
      sizeUom: h.sizeUom || "",
      purchaseRate: num(h.purchaseRate),
      salesRate: num(h.salesRate),
      productionRate: num(h.productionRate),
      availableStock: num(h.availableStock),
      bomId: h.bomId,
      lotSize: h.numLotSize == null ? 1 : Number(h.numLotSize),
      bom: bomRows,
    });
  }

  const root = {
    generatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
    totalItems: items.length,
    items: items,
  };

  const outPath = path.join(__dirname, "data", "items.json");
  fs.writeFileSync(outPath, JSON.stringify(root), "utf8");
  console.log("Wrote " + outPath + " (" + items.length + " items, " + rowRes.recordset.length + " bom rows)");

  await pool.close();
}

run().catch((err) => {
  console.error("Export failed:", err.message);
  process.exit(1);
});
