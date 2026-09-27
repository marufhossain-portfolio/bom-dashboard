(function () {
  "use strict";

  var items = [];
  var generatedAt = "";
  var searchInput = document.getElementById("searchInput");
  var clearBtn = document.getElementById("clearBtn");
  var resultsList = document.getElementById("resultsList");
  var detailContent = document.getElementById("detailContent");
  var detailEmpty = document.getElementById("detailEmpty");
  var panelTitle = document.getElementById("panelTitle");
  var panelCount = document.getElementById("panelCount");
  var resultCount = document.getElementById("resultCount");
  var statBadges = document.getElementById("statBadges");
  var footerInfo = document.getElementById("footerInfo");

  var activeCode = null;

  // Build a searchable string per item (lowercased)
  function searchText(it) {
    return [
      it.code, it.name, it.barcode, it.skuName, it.type, it.category,
      it.subCategory, it.hsCode, it.grp, it.subGroup, it.variant,
      it.color, it.partNo, it.drawingCode, it.uom
    ].join(" ").toLowerCase();
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtNum(n) {
    if (n === null || n === undefined || n === "") return "";
    if (typeof n === "string") {
      var parsed = parseFloat(n);
      if (!isNaN(parsed)) n = parsed;
      else return n;
    }
    if (typeof n === "number") {
      if (Number.isInteger(n)) return n.toLocaleString();
      return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
    return n;
  }

  function loadData() {
    fetch("data/items.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        items = data.items || [];
        generatedAt = data.generatedAt || "";
        // precompute search text
        for (var i = 0; i < items.length; i++) {
          items[i]._st = searchText(items[i]);
        }
        renderStats();
        footerInfo.textContent = "Data snapshot: " + generatedAt + " · " + items.length + " items";
        renderList(items);
      })
      .catch(function (err) {
        statBadges.innerHTML = '<span class="badge">Error loading data</span>';
        resultsList.innerHTML = '<div class="list-hint">Failed to load data: ' + escapeHtml(err.message) + "</div>";
      });
  }

  function renderStats() {
    var bomRows = 0;
    for (var i = 0; i < items.length; i++) {
      bomRows += (items[i].bom || []).length;
    }
    statBadges.innerHTML =
      '<span class="badge">Items <b>' + items.length.toLocaleString() + "</b></span>" +
      '<span class="badge">BOM Lines <b>' + bomRows.toLocaleString() + "</b></span>";
  }

  function renderList(list) {
    panelCount.textContent = list.length.toLocaleString();
    resultCount.textContent = list.length === items.length
      ? ""
      : list.length + " result" + (list.length === 1 ? "" : "s") + " found";

    if (list.length === 0) {
      resultsList.innerHTML = '<div class="list-hint">No matching items. Try a different SKU or keyword.</div>';
      return;
    }
    var html = "";
    var max = 400;
    for (var i = 0; i < list.length && i < max; i++) {
      var it = list[i];
      html +=
        '<div class="result-item' + (it.code === activeCode ? " active" : "") + '" data-code="' + escapeHtml(it.code) + '">' +
          '<div class="ri-code">' + escapeHtml(it.code) + "</div>" +
          '<div class="ri-name">' + escapeHtml(it.name) + "</div>" +
          '<div class="ri-meta">' +
            (it.category ? "<span>" + escapeHtml(it.category) + "</span>" : "") +
            (it.type ? "<span>" + escapeHtml(it.type) + "</span>" : "") +
            '<span>' + (it.bom || []).length + " comps</span>" +
          "</div>" +
        "</div>";
    }
    if (list.length > max) {
      html += '<div class="list-hint">Showing first ' + max + " of " + list.length.toLocaleString() + ". Refine your search.</div>";
    }
    resultsList.innerHTML = html;
  }

  function renderDetail(it) {
    detailEmpty.classList.add("hidden");
    detailContent.classList.remove("hidden");

    var bom = it.bom || [];
    var bomRows = "";
    for (var i = 0; i < bom.length; i++) {
      var r = bom[i];
      bomRows +=
        "<tr>" +
          '<td class="td-idx">' + (i + 1) + "</td>" +
          '<td class="td-code">' + escapeHtml(r.code) + "</td>" +
          '<td class="td-name">' + escapeHtml(r.name) + "</td>" +
          '<td class="td-qty">' + fmtNum(r.qty) + "</td>" +
          '<td class="td-uom">' + escapeHtml(r.uom || "") + "</td>" +
        "</tr>";
    }

    function cell(k, v) {
      var val = (v === null || v === undefined || v === "") ? "" : v;
      return '<div class="info-cell"><div class="k">' + k + '</div><div class="v' + (val === "" ? " empty" : "") + '">' +
        (val === "" ? "—" : escapeHtml(String(val))) + "</div></div>";
    }

    var info = "";
    info += cell("Item Code", it.code);
    info += cell("Item Name", it.name);
    info += cell("SKU Name", it.skuName);
    info += cell("Barcode", it.barcode);
    info += cell("Type", it.type);
    info += cell("Category", it.category);
    info += cell("Sub Category", it.subCategory);
    info += cell("Group", it.grp);
    info += cell("Sub Group", it.subGroup);
    info += cell("Variant", it.variant);
    info += cell("Color", it.color);
    info += cell("HS Code", it.hsCode);
    info += cell("Part No", it.partNo);
    info += cell("Drawing Code", it.drawingCode);
    info += cell("UOM", it.uom);
    info += cell("Size", it.size ? (fmtNum(it.size) + (it.sizeUom ? " " + it.sizeUom : "")) : "");
    info += cell("Purchase Rate", it.purchaseRate != null ? fmtNum(it.purchaseRate) : "");
    info += cell("Sales Rate", it.salesRate != null ? fmtNum(it.salesRate) : "");
    info += cell("Production Rate", it.productionRate != null ? fmtNum(it.productionRate) : "");
    info += cell("Available Stock", it.availableStock != null ? fmtNum(it.availableStock) : "");
    info += cell("Lot Size", it.lotSize != null ? fmtNum(it.lotSize) : "");
    info += cell("Item ID", it.itemId);
    info += cell("Master ID", it.masterId != null ? it.masterId : "");

    var tags = "";
    tags += it.category ? '<span class="chip primary">' + escapeHtml(it.category) + "</span>" : "";
    tags += it.type ? '<span class="chip">' + escapeHtml(it.type) + "</span>" : "";
    tags += '<span class="chip">' + bom.length + " components</span>";

    detailContent.innerHTML =
      '<div class="detail-title">' +
        '<div class="dt-left">' +
          "<h2>" + escapeHtml(it.name) + "</h2>" +
          '<div class="dt-code">' + escapeHtml(it.code) + "</div>" +
        "</div>" +
        '<div class="dt-tags">' + tags + "</div>" +
      "</div>" +
      '<div class="section-title">Product Information</div>' +
      '<div class="info-grid">' + info + "</div>" +
      '<div class="section-title">Bill of Materials (' + bom.length + " components)</div>" +
      (bom.length
        ? '<div class="bom-table-wrap"><table class="bom-table"><thead><tr>' +
            "<th>#</th><th>Component Code</th><th>Component Name</th><th style='text-align:right'>Qty</th><th>UOM</th>" +
          "</tr></thead><tbody>" + bomRows + "</tbody></table></div>"
        : '<div class="list-hint">No components in this BOM.</div>');
  }

  function onSearch() {
    var q = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = q ? "block" : "none";
    if (!q) {
      panelTitle.textContent = "All Items";
      activeCode = null;
      renderList(items);
      return;
    }
    panelTitle.textContent = "Search Results";
    var terms = q.split(/\s+/).filter(Boolean);
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var st = items[i]._st;
      var match = true;
      for (var t = 0; t < terms.length; t++) {
        if (st.indexOf(terms[t]) === -1) { match = false; break; }
      }
      if (match) out.push(items[i]);
    }
    renderList(out);
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  resultsList.addEventListener("click", function (e) {
    var el = e.target.closest(".result-item");
    if (!el) return;
    var code = el.getAttribute("data-code");
    var it = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].code === code) { it = items[i]; break; }
    }
    if (!it) return;
    activeCode = code;
    var all = resultsList.querySelectorAll(".result-item");
    for (var j = 0; j < all.length; j++) {
      all[j].classList.toggle("active", all[j].getAttribute("data-code") === code);
    }
    renderDetail(it);
  });

  searchInput.addEventListener("input", debounce(onSearch, 150));
  clearBtn.addEventListener("click", function () {
    searchInput.value = "";
    onSearch();
    searchInput.focus();
  });

  loadData();
})();
