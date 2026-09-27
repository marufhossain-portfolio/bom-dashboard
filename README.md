# Standard BOM Dashboard

A static, searchable dashboard for Standard Bills of Materials (BOM).

Search any SKU / item code / name to instantly view:

- Full product information (category, type, HS code, barcode, rates, stock, etc.)
- The complete Bill of Materials (component list with quantities)

## Tech

- Pure HTML / CSS / vanilla JavaScript (no build step, no dependencies)
- Data is a static JSON snapshot in `data/items.json`
- Hosted on GitHub Pages

## Regenerating data

The data snapshot is exported from the DWH SQL Server via `export.ps1`:

```powershell
powershell -ExecutionPolicy Bypass -File export.ps1
```

This queries standard (approved & active) BOMs and writes `data/items.json`.
