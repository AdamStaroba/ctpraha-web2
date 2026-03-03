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
    // detail: { intro, use, equip, spec, note }
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

  const pageDef = data.pages[page];
  if (!pageDef) return;

  if (tilesWrap && pageDef.tiles){
    tilesWrap.innerHTML = pageDef.tiles.map(tileHTML).join("");
  }
  if (productsWrap && pageDef.products){
    productsWrap.innerHTML = pageDef.products.map(productHTML).join("");
    // bind detail
    $$("[data-open]", productsWrap).forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-open");
        const prod = pageDef.products.find(x => x.id === id);
        if (prod) openModal(prod);
      });
    });
  }
})();
