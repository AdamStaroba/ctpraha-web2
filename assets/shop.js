(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const page = document.documentElement.dataset.page || "eshop";
  const data = window.CTP_SHOP_DATA;

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Render helpers
  function tileHTML(t){
    return `
      <a class="tile" href="${t.href}" aria-label="${escapeHTML(t.title)}">
        <div class="tile__title">${escapeHTML(t.title)}</div>
        ${t.sub ? `<div class="tile__sub">${escapeHTML(t.sub)}</div>` : ""}
      </a>
    `;
  }

  function productHTML(p){
    const tags = (p.tags||[]).map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("");
    const hasDetail = Boolean(p.detail);
    return `
      <article class="product" data-id="${escapeHTML(p.id)}">
        <div class="pimg" aria-hidden="true"></div>
        <div class="pbody">
          <div class="meta">${tags}</div>
          <h3>${escapeHTML(p.title)}</h3>
          ${p.subtitle ? `<p>${escapeHTML(p.subtitle)}</p>` : ""}
        </div>
        <div class="pfoot">
          ${hasDetail ? `<button class="btn btn--ghost" type="button" data-open="${escapeHTML(p.id)}">Detail</button>` : ""}
        </div>
      </article>
    `;
  }

  function escapeHTML(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // Modal
  const modalBackdrop = $("#modalBackdrop");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");
  const modalClose = $("#modalClose");

  function openModal(p){
    if (!modalBackdrop) return;
    modalTitle.textContent = p.title;
    modalBody.innerHTML = buildDetail(p.detail);
    modalBackdrop.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
  }
  function closeModal(){
    if (!modalBackdrop) return;
    modalBackdrop.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
  }
  function buildDetail(detail){
    if (!detail) return "";
    const blocks = [];
    if (detail.intro) blocks.push(card("Popis", detail.intro));
    if (detail.use) blocks.push(card("Možnosti využití", detail.use));
    if (detail.equip) blocks.push(card("Výbava a příslušenství", detail.equip));
    if (detail.spec) blocks.push(card("Technická specifikace", detail.spec));
    if (detail.note) blocks.push(card("Poznámka", detail.note));
    return `<div class="kv">${blocks.join("")}</div>`;
    function card(title, body){
      return `<div class="card"><h4>${escapeHTML(title)}</h4><pre>${escapeHTML(body)}</pre></div>`;
    }
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Render page content
  const tilesWrap = $("#tiles");
  const productsWrap = $("#products");
  const breadcrumbsWrap = $(".breadcrumbs");

  const pageDef = data.pages[page];
  if (!pageDef) return;

  // ============================
  // Breadcrumbs (dynamic + hash)
  // ============================
  function renderBreadcrumbs(extra = []){
    if (!breadcrumbsWrap) return;

    // pokud nejsou breadcrumbs v datech, necháme HTML jak je
    if (!Array.isArray(pageDef.breadcrumbs) || pageDef.breadcrumbs.length === 0) return;

    const base = pageDef.breadcrumbs.slice(); // [{title, href}, ...]
    const items = [];

    // Base: poslední položka je normálně "aktuální stránka" => span
    // Ale když jsme ve vnořené úrovni (hash), tak poslední položku chceme jako link,
    // aby šlo kliknout zpět na stránku bez hashe.
    const hasExtra = Array.isArray(extra) && extra.length > 0;

    base.forEach((b, idx) => {
      const isLast = idx === base.length - 1;
      if (isLast && !hasExtra){
        items.push(`<span>${escapeHTML(b.title)}</span>`);
      } else {
        items.push(`<a href="${b.href}">${escapeHTML(b.title)}</a>`);
      }
    });

    extra.forEach((x, i) => {
      const isLast = i === extra.length - 1;
      if (x.href && !isLast){
        items.push(`<a href="${x.href}">${escapeHTML(x.title)}</a>`);
      } else if (x.href && isLast && x.forceLink){
        items.push(`<a href="${x.href}">${escapeHTML(x.title)}</a>`);
      } else {
        items.push(`<span>${escapeHTML(x.title)}</span>`);
      }
    });

    breadcrumbsWrap.innerHTML = items.join(' <span aria-hidden="true">/</span> ');
  }

  // Default tiles render (first level blocks)
  if (tilesWrap && pageDef.tiles){
    tilesWrap.innerHTML = pageDef.tiles.map(tileHTML).join("");
  }

  // ============================
  // Special UX: Laminovací fólie
  // ============================
  const isFolie = page === "laminovaci-folie" && pageDef.nav && pageDef.nav.mode === "filterBlocks";

  function parseFolieHash(){
    const raw = (location.hash || "").replace(/^#/, "").trim();
    if (!raw) return { group: null, filter: null };

    // support: #druh, #povrch, #lepidlo, #druh/BOPP, #druh=BOPP
    const normalized = raw.replaceAll("=", "/");
    const parts = normalized.split("/").filter(Boolean);

    const alias = pageDef.nav.hashAliases && pageDef.nav.hashAliases[parts[0]];
    const group = alias || parts[0] || null;
    const filter = parts[1] ? decodeURIComponent(parts[1]) : null;

    return { group, filter };
  }

  function folieGroupTitle(group){
    if (!group) return "";
    const t = (pageDef.tiles || []).find(x => (x.href || "").includes(`#${group}`));
    return t ? t.title : group;
  }

  function folieFilterTitle(group, filter){
    const levels = (pageDef.nav && pageDef.nav.levels) ? pageDef.nav.levels : {};
    const options = levels[group] || [];
    const o = options.find(x => x.tag === filter);
    return o ? o.title : filter;
  }

  function renderFolie(){
    if (!tilesWrap || !productsWrap) return;

    const { group, filter } = parseFolieHash();
    const levels = (pageDef.nav && pageDef.nav.levels) ? pageDef.nav.levels : {};
    const options = levels[group] || [];

    // Breadcrumbs
    if (!group){
      renderBreadcrumbs([]);
    } else if (group && !filter){
      renderBreadcrumbs([
        { title: folieGroupTitle(group) }
      ]);
    } else {
      renderBreadcrumbs([
        { title: folieGroupTitle(group), href: `laminovaci-folie.html#${group}` },
        { title: folieFilterTitle(group, filter) }
      ]);
    }

    // 1) Bez hashe: zobraz jen 3 hlavní bloky, produkty pryč
    if (!group){
      // tilesWrap už obsahuje 3 bloky z pageDef.tiles
      productsWrap.innerHTML = "";
      return;
    }

    // 2) Klikl jsem na hlavní blok (#druh / #povrch / #lepidlo):
    //    zobraz podbloky, produkty pryč
    if (group && !filter){
      tilesWrap.innerHTML = options.map(o => tileHTML({
        title: o.title,
        sub: o.sub || "",
        href: `laminovaci-folie.html#${group}/${encodeURIComponent(o.tag)}`
      })).join("");

      productsWrap.innerHTML = "";
      return;
    }

    // 3) Klikl jsem na konkrétní podblok (#druh/BOPP, #povrch/Matná, ...):
    //    SCHOVAT všechny podbloky a ukázat jen produkty
    tilesWrap.innerHTML = "";

    const allProducts = (pageDef.products || []).filter(p => !(p.tags || []).includes("Sekce"));
    const filterTag = filter;

    // Povrchové tagy: aby se např. Metalická NEzobrazovala v Lesklá, i když má tag Lesklá
    const surfaceTags = new Set(["Lesklá", "Matná", "Polomatná", "AntiScuff", "SoftTouch", "Metalická", "Speciální"]);
    const glueTags = new Set(["Standard", "SuperStick", "Samolepicí"]);
    const typeTags = new Set(["BOPP", "PET", "Tlakem aktivované"]);

    let filteredProducts = allProducts.filter(p => (p.tags || []).includes(filterTag));

    if (group === "povrch" && surfaceTags.has(filterTag)){
      // nechceme míchat povrchy: produkt se smí zobrazit jen v jedné povrchové sekci
      filteredProducts = filteredProducts.filter(p => {
        const tags = new Set(p.tags || []);
        for (const t of surfaceTags){
          if (t !== filterTag && tags.has(t)) return false;
        }
        return true;
      });
    }

    if (group === "lepidlo" && glueTags.has(filterTag)){
      // nechceme míchat lepidla
      filteredProducts = filteredProducts.filter(p => {
        const tags = new Set(p.tags || []);
        for (const t of glueTags){
          if (t !== filterTag && tags.has(t)) return false;
        }
        return true;
      });
    }

    if (group === "druh" && typeTags.has(filterTag)){
      // druh je OK čistě podle typu (bez dalšího omezení)
    }

    productsWrap.innerHTML = filteredProducts.map(productHTML).join("");

    $$("[data-open]", productsWrap).forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-open");
        const prod = (pageDef.products || []).find(x => x.id === id);
        if (prod) openModal(prod);
      });
    });
  }

  if (isFolie){
    renderFolie();
    window.addEventListener("hashchange", renderFolie);
    return;
  }

  // =====================================
  // Special UX: Rolové laminátory (3 bloky -> produkty)
  // =====================================
  const isRollers = page === "rolove-laminatory" && pageDef.nav && pageDef.nav.mode === "blockNav";

  function parseBlockHash(){
    const raw = (location.hash || "").replace(/^#/, "").trim();
    if (!raw) return { key: null };
    const key = decodeURIComponent(raw);
    const alias = pageDef.nav.hashAliases && pageDef.nav.hashAliases[key];
    return { key: alias || key };
  }

  function rollersKeyTitle(key){
    if (!key) return "";
    const t = (pageDef.tiles || []).find(x => (x.href || "").includes(`#${key}`));
    return t ? t.title : key;
  }

  function renderRollers(){
    if (!tilesWrap || !productsWrap) return;

    const { key } = parseBlockHash();

    if (!key){
      renderBreadcrumbs([]);
    } else {
      renderBreadcrumbs([
        { title: rollersKeyTitle(key) }
      ]);
    }

    if (!key){
      productsWrap.innerHTML = "";
      if (pageDef.tiles) tilesWrap.innerHTML = pageDef.tiles.map(tileHTML).join("");
      return;
    }

    tilesWrap.innerHTML = "";

    const groups = pageDef.nav.groups || {};
    const g = groups[key];

    if (!g){
      productsWrap.innerHTML = "";
      return;
    }

    const allProducts = (pageDef.products || []).filter(p => !(p.tags || []).includes("Sekce"));
    const matchTags = Array.isArray(g.matchTags) ? g.matchTags : [];

    const filteredProducts = matchTags.length
      ? allProducts.filter(p => (p.tags || []).some(t => matchTags.includes(t)))
      : [];

    productsWrap.innerHTML = filteredProducts.map(productHTML).join("");

    $$("[data-open]", productsWrap).forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-open");
        const prod = (pageDef.products || []).find(x => x.id === id);
        if (prod) openModal(prod);
      });
    });
  }

  if (isRollers){
    renderRollers();
    window.addEventListener("hashchange", renderRollers);
    return;
  }

  // === Default rendering (ostatní stránky) ===
  renderBreadcrumbs([]);

  if (productsWrap && pageDef.products){
    productsWrap.innerHTML = pageDef.products.map(productHTML).join("");
    $$("[data-open]", productsWrap).forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-open");
        const prod = pageDef.products.find(x => x.id === id);
        if (prod) openModal(prod);
      });
    });
  }
})();