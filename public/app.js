const state = {
  menu: null,
  activeCategory: 'all',
  search: ''
};

const els = {
  hero: document.querySelector('#hero'),
  businessName: document.querySelector('#businessName'),
  businessSubtitle: document.querySelector('#businessSubtitle'),
  businessHours: document.querySelector('#businessHours'),
  businessAddress: document.querySelector('#businessAddress'),
  footerName: document.querySelector('#footerName'),
  instagram: document.querySelector('#instagram'),
  whatsapp: document.querySelector('#whatsapp'),
  searchInput: document.querySelector('#searchInput'),
  categoryNav: document.querySelector('#categoryNav'),
  featuredSection: document.querySelector('#featuredSection'),
  featuredGrid: document.querySelector('#featuredGrid'),
  menuContainer: document.querySelector('#menuContainer'),
  emptyState: document.querySelector('#emptyState')
};

function money(value) {
  const symbol = state.menu?.business?.currency || '$';
  return `${symbol}${Number(value).toLocaleString('es-AR')}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function filteredProducts() {
  const query = state.search.trim().toLowerCase();
  return state.menu.products.filter((product) => {
    const matchesCategory = state.activeCategory === 'all' || product.categoryId === state.activeCategory;
    const haystack = `${product.name} ${product.description}`.toLowerCase();
    return matchesCategory && (!query || haystack.includes(query));
  });
}

function renderBusiness() {
  const business = state.menu.business;
  document.title = `${business.name} · Menú`;
  els.businessName.textContent = business.name;
  els.businessSubtitle.textContent = business.subtitle;
  els.businessHours.textContent = business.hours;
  els.businessAddress.textContent = business.address;
  els.footerName.textContent = business.name;
  els.instagram.textContent = business.instagram;
  els.whatsapp.textContent = business.whatsapp;

  if (business.heroImage) {
    els.hero.classList.add('hero--has-image');
    els.hero.style.setProperty('--hero-photo', `url("${business.heroImage.replaceAll('"', '%22')}")`);
  } else {
    els.hero.classList.remove('hero--has-image');
    els.hero.style.removeProperty('--hero-photo');
  }
}

function renderCategories() {
  const buttons = [
    `<button class="category-button ${state.activeCategory === 'all' ? 'is-active' : ''}" data-category="all">Todo</button>`,
    ...state.menu.categories.map((category) =>
      `<button class="category-button ${state.activeCategory === category.id ? 'is-active' : ''}" data-category="${escapeHtml(category.id)}">${escapeHtml(category.name)}</button>`
    )
  ];
  els.categoryNav.innerHTML = buttons.join('');
  els.categoryNav.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeCategory = button.dataset.category;
      renderCategories();
      renderMenu();
    });
  });
}

function renderFeatured(products) {
  const featured = products.filter((product) => product.featured).slice(0, 3);
  els.featuredSection.hidden = featured.length === 0;
  els.featuredGrid.innerHTML = featured.map((product) => `
    <article class="featured-card ${product.image ? 'has-image' : ''}">
      ${product.image ? `<img class="featured-card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />` : ''}
      <div class="featured-card__shade"></div>
      <div class="featured-card__content">
        <span class="featured-card__tag">RECOMENDADO</span>
        <div class="featured-card__bottom">
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <span class="price">${money(product.price)}</span>
        </div>
      </div>
    </article>`).join('');
}

function renderMenu() {
  const products = filteredProducts();
  renderFeatured(products);

  const sections = state.menu.categories.map((category) => {
    const items = products.filter((product) => product.categoryId === category.id);
    if (!items.length) return '';

    const cards = items.map((product) => `
      <article class="product-card ${product.image ? 'product-card--has-image' : ''}">
        ${product.image ? `<img class="product-card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />` : ''}
        <div class="product-card__content">
          <div class="product-card__heading">
            <h3>${escapeHtml(product.name)}${product.featured ? '<span class="product-card__badge">Favorito</span>' : ''}</h3>
            <span class="product-card__price">${money(product.price)}</span>
          </div>
          <p>${escapeHtml(product.description)}</p>
        </div>
      </article>`).join('');

    return `
      <section class="category-section" id="category-${escapeHtml(category.id)}">
        <div class="category-heading">
          <h2>${escapeHtml(category.name)}</h2>
          <p>${escapeHtml(category.description)}</p>
        </div>
        <div class="product-list">${cards}</div>
      </section>`;
  }).join('');

  els.menuContainer.innerHTML = sections;
  els.emptyState.hidden = products.length > 0;
}

async function init() {
  try {
    const response = await fetch('/api/menu', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar el menú');
    state.menu = await response.json();
    renderBusiness();
    renderCategories();
    renderMenu();
  } catch (error) {
    els.menuContainer.innerHTML = '<section class="empty-state"><h2>Menú no disponible</h2><p>Intentá nuevamente en unos minutos.</p></section>';
  }
}

els.searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderMenu();
});

init();
