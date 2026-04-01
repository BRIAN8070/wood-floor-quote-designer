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
    ["MFB-BOARD-01", "MFB-ACC-START-STOP"],
  ];

  function ownerPrice(product) {
    if (!product) return null;
    if (product.pricing && Number.isFinite(Number(product.pricing.owner))) return Number(product.pricing.owner);
    if (Number.isFinite(Number(product.price))) return Number(product.price);
    return null;
  }

  function designerPrice(product) {
    if (!product || !product.pricing) return null;
    if (Number.isFinite(Number(product.pricing.designer))) return Number(product.pricing.designer);
    return null;
  }

  function formatPrice(value) {
    if (!Number.isFinite(Number(value))) return "";
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

  function replaceFirstPrice(text, value) {
    const next = formatPrice(value);
    if (!next) return text;
    if (/\$[\d,]+/u.test(text)) {
      return text.replace(/\$[\d,]+/u, next);
    }
    return next;
  }

  function setCellPrice(cell, value) {
    if (!cell || !Number.isFinite(Number(value))) return;
    cell.textContent = formatPrice(value);
  }

  function setRowPrice(row, owner, designer) {
    if (!row) return;
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;
    setCellPrice(cells[1], owner);
    if (cells.length >= 3 && Number.isFinite(Number(designer))) {
      setCellPrice(cells[2], designer);
    }
  }

  function setPriceSpans(box, owner, designer) {
    if (!box) return;
    const ownerNode = box.querySelector(".owner");
    const designerNode = box.querySelector(".designer");

    if (ownerNode && Number.isFinite(Number(owner))) {
      ownerNode.textContent = replaceFirstPrice(ownerNode.textContent, owner);
    }
    if (designerNode && Number.isFinite(Number(designer))) {
      designerNode.textContent = replaceFirstPrice(designerNode.textContent, designer);
    }
  }

  function updateMetaDate(lastUpdatedAt) {
    const dateText = formatDate(lastUpdatedAt);
    if (!dateText) return;
    const chips = document.querySelectorAll(".hero-meta .meta-chip");
    for (const chip of chips) {
      if (chip.textContent.includes("更新")) {
        chip.textContent = `${dateText} 更新`;
        break;
      }
    }
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

    const mainTable = section.querySelector("table");
    const rows = mainTable ? Array.from(mainTable.querySelectorAll("tr")).slice(1) : [];
    BALTERIO_IDS.forEach((id, index) => {
      const product = productsById.get(id);
      if (!product) return;
      setRowPrice(rows[index], ownerPrice(product), designerPrice(product));
    });
  }

  function updateEgger(productsById) {
    const priceBoxes = document.querySelectorAll(".section-egger .series-block .series-price");
    EGGER_IDS.forEach((id, index) => {
      const product = productsById.get(id);
      if (!product) return;
      setPriceSpans(priceBoxes[index], ownerPrice(product), designerPrice(product));
    });
  }

  function updateNodaAndMfb(productsById) {
    const blocks = document.querySelectorAll(".section-noda .series-block");
    NODA_TABLE_IDS.forEach((idList, blockIndex) => {
      const block = blocks[blockIndex];
      const table = block ? block.querySelector("table") : null;
      const rows = table ? Array.from(table.querySelectorAll("tr")).slice(1) : [];
      idList.forEach((id, rowIndex) => {
        const product = productsById.get(id);
        if (!product) return;
        setRowPrice(rows[rowIndex], ownerPrice(product), designerPrice(product));
      });
    });
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
