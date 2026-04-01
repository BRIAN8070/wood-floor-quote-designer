(function localApiBridge() {
  const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
  if (!LOCAL_HOSTS.has(window.location.hostname)) return;

  const mode = String(document.body.dataset.pageMode || "owner").toLowerCase() === "designer" ? "designer" : "owner";
  const apiUrl = `http://127.0.0.1:4010/api/v1/catalog?mode=${mode}`;

  const BALTERIO_IDS = [
    "BT-NEW-VITALITY-SELECT",
    "BT-NEW-VITALITY-LUXE",
    "BT-STYLE-BOUTIQUE",
    "BT-NEW-JUMBO-WIDE",
  ];

  const EGGER_IDS = [
    "EG-CLASSIC-AQUA-01",
    "EG-832-AQUA-02",
    "EG-833-AQUA-03",
    "EG-LARGE-AQUA-04",
    "EG-LONG-AQUA-05",
    "EG-AQUA-PLUS-06",
  ];

  const NODA_TABLE_IDS = [
    ["ND-DIANYUN-A1501-A1512", "ND-HERRINGBONE-H201-H206"],
    ["ND-ACC-START-STOP", "ND-ACC-TMOLD", "ND-ACC-STAIR"],
  ];
  const MFB_TABLE_IDS = [["MFB-BOARD-01", "MFB-ACC-START-STOP"]];

  function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
  }

  function ownerPrice(product) {
    if (!product) return null;
    if (product.pricing && isFiniteNumber(product.pricing.owner)) return Number(product.pricing.owner);
    if (isFiniteNumber(product.price)) return Number(product.price);
    return null;
  }

  function designerPrice(product) {
    if (!product || !product.pricing) return null;
    if (isFiniteNumber(product.pricing.designer)) return Number(product.pricing.designer);
    return null;
  }

  function productIsActive(product) {
    if (!product) return false;
    const status = String(product.status || "active").toLowerCase();
    return status !== "inactive";
  }

  function formatPrice(value) {
    if (!isFiniteNumber(value)) return "";
    return `$${Number(value).toLocaleString("en-US")}`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y} / ${m} / ${d}`;
  }

  function formatMillimeter(value) {
    if (!isFiniteNumber(value)) return null;
    const n = Number(value);
    return Number.isInteger(n) ? String(n) : String(n);
  }

  function buildSpecText(product) {
    if (!product || !product.specs) return "";
    const length = formatMillimeter(product.specs.length_mm);
    const width = formatMillimeter(product.specs.width_mm);
    const thickness = formatMillimeter(product.specs.thickness_mm);
    if (!length || !width || !thickness) return "";
    return `${length} x ${width} x ${thickness} mm`;
  }

  function buildSeriesMetaText(product) {
    const parts = [];
    const series = String(product?.series || "").trim();
    const spec = buildSpecText(product);
    if (series) parts.push(series);
    if (spec) parts.push(spec);
    return parts.join(" / ");
  }

  function replaceFirstPrice(text, value) {
    const next = formatPrice(value);
    if (!next) return text;
    if (/\$[\d,]+/u.test(text)) {
      return text.replace(/\$[\d,]+/u, next);
    }
    return next;
  }

  function setHidden(node, hidden) {
    if (!node) return;
    node.style.display = hidden ? "none" : "";
  }

  function setFirstTextKeepingChildren(container, text) {
    if (!container || !text) return;
    let textNode = null;
    for (const node of container.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        textNode = node;
        break;
      }
    }
    if (textNode) {
      textNode.textContent = text;
      return;
    }
    container.insertBefore(document.createTextNode(text), container.firstChild || null);
  }

  function ensureSpecNode(container) {
    let specNode = container ? container.querySelector(".spec") : null;
    if (!specNode && container) {
      specNode = document.createElement("span");
      specNode.className = "spec";
      container.appendChild(specNode);
    }
    return specNode;
  }

  function setCellPrice(cell, value) {
    if (!cell || !isFiniteNumber(value)) return;
    cell.textContent = formatPrice(value);
  }

  function setRowPrice(row, owner, designer) {
    if (!row) return;
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;
    setCellPrice(cells[1], owner);
    if (cells.length >= 3 && isFiniteNumber(designer)) {
      setCellPrice(cells[2], designer);
    }
  }

  function setPriceSpans(box, owner, designer) {
    if (!box) return;
    const ownerNode = box.querySelector(".owner");
    const designerNode = box.querySelector(".designer");

    if (ownerNode && isFiniteNumber(owner)) {
      ownerNode.textContent = replaceFirstPrice(ownerNode.textContent, owner);
    }
    if (designerNode && isFiniteNumber(designer)) {
      designerNode.textContent = replaceFirstPrice(designerNode.textContent, designer);
    }
  }

  function setSeriesBlockData(block, product) {
    const active = productIsActive(product);
    setHidden(block, !active);
    if (!active) return;

    const titleNode = block.querySelector(".series-name");
    const metaNode = block.querySelector(".series-meta");
    const priceBox = block.querySelector(".series-price");

    const name = String(product.name || "").trim();
    if (name && titleNode) {
      setFirstTextKeepingChildren(titleNode, name);
    }

    const metaText = buildSeriesMetaText(product);
    if (metaNode && metaText) {
      metaNode.textContent = metaText;
    } else if (titleNode && metaText && !metaNode) {
      const appendedMeta = document.createElement("span");
      appendedMeta.className = "series-meta";
      appendedMeta.textContent = metaText;
      titleNode.appendChild(appendedMeta);
    }

    setPriceSpans(priceBox, ownerPrice(product), designerPrice(product));
  }

  function setTableRowData(row, product) {
    const active = productIsActive(product);
    setHidden(row, !active);
    if (!active) return false;

    const firstCell = row.querySelector("td");
    if (firstCell) {
      const name = String(product.name || "").trim();
      if (name) setFirstTextKeepingChildren(firstCell, name);

      const specText = buildSpecText(product);
      const existingSpec = firstCell.querySelector(".spec");
      if (specText) {
        const specNode = existingSpec || ensureSpecNode(firstCell);
        if (specNode) specNode.textContent = specText;
      } else if (existingSpec) {
        existingSpec.remove();
      }
    }

    setRowPrice(row, ownerPrice(product), designerPrice(product));
    return true;
  }

  function updateMetaDate(lastUpdatedAt) {
    const dateText = formatDate(lastUpdatedAt);
    if (!dateText) return;

    const chips = Array.from(document.querySelectorAll(".hero-meta .meta-chip"));
    if (!chips.length) return;

    let target = chips.find((chip) => /\d{4}\s*\/\s*\d{2}\s*\/\s*\d{2}/u.test(chip.textContent));
    if (!target && chips.length >= 3) {
      target = chips[2];
    }
    if (!target) return;

    const suffix = target.textContent.replace(/\d{4}\s*\/\s*\d{2}\s*\/\s*\d{2}/u, "").trim();
    target.textContent = suffix ? `${dateText} ${suffix}` : dateText;
  }

  function updateBrandLinks(brandMap) {
    const mapping = [
      [".swatch-berry .swatch-link", "balterio"],
      [".swatch-egger .swatch-link", "egger"],
      [".swatch-noda .swatch-link", "noda"],
      [".swatch-mfb .swatch-link", "mfb"],
    ];

    for (const [selector, brandId] of mapping) {
      const node = document.querySelector(selector);
      const website = brandMap.get(brandId)?.website_url;
      if (node && website) node.href = website;
    }
  }

  function updateBalterio(productsById) {
    const section = document.querySelector(".section-berry");
    if (!section) return;

    const blocks = Array.from(section.querySelectorAll(".series-block")).slice(0, BALTERIO_IDS.length);
    BALTERIO_IDS.forEach((id, index) => {
      const block = blocks[index];
      if (!block) return;
      const product = productsById.get(id);
      setSeriesBlockData(block, product);
    });
  }

  function updateEgger(productsById) {
    const section = document.querySelector(".section-egger");
    if (!section) return;

    const blocks = Array.from(section.querySelectorAll(".series-block")).slice(0, EGGER_IDS.length);
    EGGER_IDS.forEach((id, index) => {
      const block = blocks[index];
      if (!block) return;
      const product = productsById.get(id);
      setSeriesBlockData(block, product);
    });
  }

  function updateTableSection(sectionSelector, tableIdGroups, productsById) {
    const section = document.querySelector(sectionSelector);
    if (!section) return;

    const blocks = section.querySelectorAll(".series-block");
    let sectionActiveCount = 0;

    tableIdGroups.forEach((idList, blockIndex) => {
      const block = blocks[blockIndex];
      if (!block) return;
      const table = block.querySelector("table");
      const rows = table ? Array.from(table.querySelectorAll("tr")).slice(1) : [];

      let activeCount = 0;
      idList.forEach((id, rowIndex) => {
        const row = rows[rowIndex];
        if (!row) return;
        const product = productsById.get(id);
        if (setTableRowData(row, product)) activeCount += 1;
      });

      setHidden(block, activeCount === 0);
      if (activeCount > 0) sectionActiveCount += 1;
    });

    setHidden(section, sectionActiveCount === 0);
  }

  function updateNoda(productsById) {
    updateTableSection(".section-noda", NODA_TABLE_IDS, productsById);
  }

  function updateMfb(productsById) {
    updateTableSection(".section-mfb", MFB_TABLE_IDS, productsById);
  }

  function updateNodaAndMfb(productsById) {
    updateNoda(productsById);
    updateMfb(productsById);
  }

  function buildMaps(payload) {
    const productsById = new Map();
    const brandMap = new Map();

    if (Array.isArray(payload.brands)) {
      payload.brands.forEach((brand) => {
        if (brand && brand.id) brandMap.set(brand.id, brand);
      });
    }

    if (Array.isArray(payload.products)) {
      payload.products.forEach((product) => {
        if (product && product.id) productsById.set(product.id, product);
      });
    }

    return { productsById, brandMap };
  }

  async function fetchCatalog() {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  fetchCatalog().then((payload) => {
    if (!payload || !Array.isArray(payload.products)) return;
    const { productsById, brandMap } = buildMaps(payload);
    updateMetaDate(payload.last_updated_at);
    updateBrandLinks(brandMap);
    updateBalterio(productsById);
    updateEgger(productsById);
    updateNodaAndMfb(productsById);
  });
})();
