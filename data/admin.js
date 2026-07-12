const state = {
  menu: null,
  panel: 'products',
  editorType: null,
  editingId: null,
  productSearch: '',
  productCategory: 'all'
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const els = {
  loginView: document.querySelector('#loginView'),
  adminView: document.querySelector('#adminView'),
  loginForm: document.querySelector('#loginForm'),
  password: document.querySelector('#password'),
  loginError: document.querySelector('#loginError'),
  logoutButton: document.querySelector('#logoutButton'),
  navButtons: [...document.querySelectorAll('.nav-button')],
  panelTitle: document.querySelector('#panelTitle'),
  primaryAction: document.querySelector('#primaryAction'),
  notice: document.querySelector('#notice'),
  productSearch: document.querySelector('#productSearch'),
  productCategoryFilter: document.querySelector('#productCategoryFilter'),
  productTable: document.querySelector('#productTable'),
  categoryTable: document.querySelector('#categoryTable'),
  businessForm: document.querySelector('#businessForm'),
  businessHeroFile: document.querySelector('#businessHeroFile'),
  businessHeroPreview: document.querySelector('#businessHeroPreview'),
  businessHeroEmpty: document.querySelector('#businessHeroEmpty'),
  removeBusinessHero: document.querySelector('#removeBusinessHero'),
  publicMenuLinks: [...document.querySelectorAll('[data-public-menu-link]')],
  sidebarBusinessName: document.querySelector('#sidebarBusinessName'),
  qrUrl: document.querySelector('#qrUrl'),
  qrImage: document.querySelector('#qrImage'),
  downloadQr: document.querySelector('#downloadQr'),
  dialog: document.querySelector('#editorDialog'),
  editorForm: document.querySelector('#editorForm'),
  dialogTitle: document.querySelector('#dialogTitle'),
  dialogFields: document.querySelector('#dialogFields'),
  saveEditorButton: document.querySelector('#saveEditorButton')
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ocurrió un error');
  return data;
}

function showNotice(message, isError = false) {
  els.notice.textContent = message;
  els.notice.classList.toggle('is-error', isError);
  els.notice.hidden = false;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => { els.notice.hidden = true; }, 4000);
}

function money(value) {
  return `${state.menu.business.currency || '$'}${Number(value).toLocaleString('es-AR')}`;
}

function validateImage(file) {
  if (!file) return;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('La foto debe ser JPG, PNG, WEBP o GIF');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La foto no puede superar los 5 MB');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la foto'));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file) {
  validateImage(file);
  const dataUrl = await readFileAsDataUrl(file);
  const result = await api('/api/admin/uploads', {
    method: 'POST',
    body: JSON.stringify({ dataUrl, filename: file.name })
  });
  return result.url;
}

function showImagePreview(image, emptyLabel, url) {
  if (url) {
    image.src = url;
    image.hidden = false;
    emptyLabel.hidden = true;
  } else {
    image.removeAttribute('src');
    image.hidden = true;
    emptyLabel.hidden = false;
  }
}

function publicMenuPath() {
  const slug = state.menu?.business?.slug || '';
  return slug ? `/${encodeURIComponent(slug)}` : '/';
}

async function checkSession() {
  const session = await api('/api/admin/session');
  if (session.authenticated) {
    await enterAdmin();
  } else {
    els.loginView.hidden = false;
    els.adminView.hidden = true;
  }
}

async function enterAdmin() {
  state.menu = await api('/api/admin/menu');
  els.loginView.hidden = true;
  els.adminView.hidden = false;
  renderAll();
}

function renderAll() {
  renderProductFilters();
  renderProducts();
  renderCategories();
  renderBusiness();
  switchPanel(state.panel);
}

function renderProductFilters() {
  els.productCategoryFilter.innerHTML = '<option value="all">Todas las categorías</option>' + [...state.menu.categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`)
    .join('');
  els.productCategoryFilter.value = state.productCategory;
}

function renderProducts() {
  const query = state.productSearch.toLowerCase().trim();
  const products = state.menu.products.filter((product) => {
    const text = `${product.name} ${product.description}`.toLowerCase();
    const categoryOk = state.productCategory === 'all' || product.categoryId === state.productCategory;
    return categoryOk && (!query || text.includes(query));
  });

  if (!products.length) {
    els.productTable.innerHTML = '<p class="muted">No hay productos para mostrar.</p>';
    return;
  }

  els.productTable.innerHTML = products.map((product) => {
    const category = state.menu.categories.find((item) => item.id === product.categoryId);
    const thumb = product.image
      ? `<img class="product-thumb" src="${escapeHtml(product.image)}" alt="" />`
      : '<span class="product-thumb product-thumb--empty">☕</span>';
    return `
      <div class="table-row">
        <div class="product-title-cell">${thumb}<div class="table-title"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.description || 'Sin descripción')}</small></div></div>
        <div>${escapeHtml(category?.name || 'Sin categoría')}</div>
        <strong>${money(product.price)}</strong>
        <div class="row-actions">
          <span class="status ${product.available ? 'status--on' : 'status--off'}">${product.available ? 'Visible' : 'Oculto'}</span>
          <button class="icon-action" data-edit-product="${escapeHtml(product.id)}">Editar</button>
          <button class="icon-action icon-action--danger" data-delete-product="${escapeHtml(product.id)}">Eliminar</button>
        </div>
      </div>`;
  }).join('');

  els.productTable.querySelectorAll('[data-edit-product]').forEach((button) => button.addEventListener('click', () => openProductEditor(button.dataset.editProduct)));
  els.productTable.querySelectorAll('[data-delete-product]').forEach((button) => button.addEventListener('click', () => deleteProduct(button.dataset.deleteProduct)));
}

function renderCategories() {
  if (!state.menu.categories.length) {
    els.categoryTable.innerHTML = '<p class="muted">Todavía no hay categorías.</p>';
    return;
  }
  els.categoryTable.innerHTML = [...state.menu.categories].sort((a, b) => a.order - b.order).map((category) => {
    const count = state.menu.products.filter((product) => product.categoryId === category.id).length;
    return `
      <div class="table-row table-row--category">
        <div class="table-title"><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.description || 'Sin descripción')}</small></div>
        <span>Orden ${category.order}</span>
        <div class="row-actions">
          <span class="status status--on">${count} producto${count === 1 ? '' : 's'}</span>
          <button class="icon-action" data-edit-category="${escapeHtml(category.id)}">Editar</button>
          <button class="icon-action icon-action--danger" data-delete-category="${escapeHtml(category.id)}">Eliminar</button>
        </div>
      </div>`;
  }).join('');

  els.categoryTable.querySelectorAll('[data-edit-category]').forEach((button) => button.addEventListener('click', () => openCategoryEditor(button.dataset.editCategory)));
  els.categoryTable.querySelectorAll('[data-delete-category]').forEach((button) => button.addEventListener('click', () => deleteCategory(button.dataset.deleteCategory)));
}

function renderBusiness() {
  const business = state.menu.business;
  for (const [key, value] of Object.entries(business)) {
    if (els.businessForm.elements[key] && els.businessForm.elements[key].type !== 'file') {
      els.businessForm.elements[key].value = value || '';
    }
  }
  els.businessHeroFile.value = '';
  els.removeBusinessHero.checked = false;
  showImagePreview(els.businessHeroPreview, els.businessHeroEmpty, business.heroImage || '');

  els.sidebarBusinessName.textContent = business.name || 'Menú Café';
  document.title = `${business.name || 'Café'} · Administración`;
  const path = publicMenuPath();
  els.publicMenuLinks.forEach((link) => { link.href = path; });
}

async function renderQr() {
  try {
    const qr = await api('/api/admin/qr');
    els.qrUrl.textContent = qr.url;
    els.qrImage.src = qr.dataUrl;
    els.downloadQr.href = qr.dataUrl;
  } catch (error) {
    showNotice(error.message, true);
  }
}

function switchPanel(panel) {
  state.panel = panel;
  const titles = { products: 'Productos', categories: 'Categorías', business: 'Datos del local', qr: 'Código QR' };
  els.panelTitle.textContent = titles[panel];
  els.navButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.panel === panel));
  document.querySelectorAll('.panel').forEach((section) => { section.hidden = section.id !== `${panel}Panel`; });

  if (panel === 'products') {
    els.primaryAction.hidden = false;
    els.primaryAction.textContent = 'Nuevo producto';
  } else if (panel === 'categories') {
    els.primaryAction.hidden = false;
    els.primaryAction.textContent = 'Nueva categoría';
  } else {
    els.primaryAction.hidden = true;
  }
  if (panel === 'qr') renderQr();
}

function openProductEditor(id = null) {
  const product = id ? state.menu.products.find((item) => item.id === id) : null;
  state.editorType = 'product';
  state.editingId = id;
  els.dialogTitle.textContent = product ? 'Editar producto' : 'Nuevo producto';
  els.dialogFields.innerHTML = `
    <label>Nombre<input name="name" value="${escapeHtml(product?.name || '')}" required /></label>
    <label>Categoría<select name="categoryId" required>${state.menu.categories.map((category) => `<option value="${escapeHtml(category.id)}" ${category.id === product?.categoryId ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}</select></label>
    <label>Precio<input name="price" type="number" min="0" step="1" value="${product?.price ?? ''}" required /></label>
    <label class="span-2 file-field">Foto del producto (opcional)
      <input id="productImageFile" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
      <small>Elegí una foto descargada desde la computadora o el celular. Máximo 5 MB.</small>
    </label>
    <div class="span-2 image-picker-preview">
      <img id="productImagePreview" alt="Vista previa de la foto" hidden />
      <span id="productImageEmpty">${product?.image ? '' : 'Sin foto: el producto se mostrará solo con texto.'}</span>
    </div>
    ${product?.image ? '<label class="checkbox span-2"><input id="removeProductImage" name="removeImage" type="checkbox" /> Quitar la foto actual</label>' : ''}
    <label class="span-2">Descripción<textarea name="description">${escapeHtml(product?.description || '')}</textarea></label>
    <label class="checkbox"><input name="available" type="checkbox" ${product?.available !== false ? 'checked' : ''} /> Visible en el menú</label>
    <label class="checkbox"><input name="featured" type="checkbox" ${product?.featured ? 'checked' : ''} /> Mostrar como recomendado</label>`;

  const fileInput = document.querySelector('#productImageFile');
  const preview = document.querySelector('#productImagePreview');
  const empty = document.querySelector('#productImageEmpty');
  showImagePreview(preview, empty, product?.image || '');
  fileInput.addEventListener('change', () => {
    try {
      const file = fileInput.files[0];
      if (!file) return showImagePreview(preview, empty, product?.image || '');
      validateImage(file);
      showImagePreview(preview, empty, URL.createObjectURL(file));
      const remove = document.querySelector('#removeProductImage');
      if (remove) remove.checked = false;
    } catch (error) {
      fileInput.value = '';
      showNotice(error.message, true);
    }
  });

  const remove = document.querySelector('#removeProductImage');
  if (remove) {
    remove.addEventListener('change', () => {
      if (remove.checked) {
        fileInput.value = '';
        showImagePreview(preview, empty, '');
      } else {
        showImagePreview(preview, empty, product?.image || '');
      }
    });
  }
  els.dialog.showModal();
}

function openCategoryEditor(id = null) {
  const category = id ? state.menu.categories.find((item) => item.id === id) : null;
  state.editorType = 'category';
  state.editingId = id;
  els.dialogTitle.textContent = category ? 'Editar categoría' : 'Nueva categoría';
  els.dialogFields.innerHTML = `
    <label>Nombre<input name="name" value="${escapeHtml(category?.name || '')}" required /></label>
    <label>Orden<input name="order" type="number" min="1" value="${category?.order ?? state.menu.categories.length + 1}" /></label>
    <label class="span-2">Descripción<textarea name="description">${escapeHtml(category?.description || '')}</textarea></label>`;
  els.dialog.showModal();
}

async function saveEditor(event) {
  event.preventDefault();
  const formData = new FormData(els.editorForm);
  let url;
  let method;
  let body;

  els.saveEditorButton.disabled = true;
  els.saveEditorButton.textContent = 'Guardando...';

  try {
    if (state.editorType === 'product') {
      const currentProduct = state.editingId ? state.menu.products.find((item) => item.id === state.editingId) : null;
      const file = formData.get('imageFile');
      let image = currentProduct?.image || '';

      if (file instanceof File && file.size > 0) {
        image = await uploadImage(file);
      } else if (formData.get('removeImage') === 'on') {
        image = '';
      }

      url = state.editingId ? `/api/admin/products/${state.editingId}` : '/api/admin/products';
      method = state.editingId ? 'PUT' : 'POST';
      body = {
        name: formData.get('name'),
        categoryId: formData.get('categoryId'),
        price: Number(formData.get('price')),
        image,
        description: formData.get('description'),
        available: formData.get('available') === 'on',
        featured: formData.get('featured') === 'on'
      };
    } else {
      url = state.editingId ? `/api/admin/categories/${state.editingId}` : '/api/admin/categories';
      method = state.editingId ? 'PUT' : 'POST';
      body = {
        name: formData.get('name'),
        order: Number(formData.get('order')),
        description: formData.get('description')
      };
    }

    await api(url, { method, body: JSON.stringify(body) });
    els.dialog.close();
    state.menu = await api('/api/admin/menu');
    renderAll();
    showNotice('Cambios guardados');
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    els.saveEditorButton.disabled = false;
    els.saveEditorButton.textContent = 'Guardar';
  }
}

async function deleteProduct(id) {
  const product = state.menu.products.find((item) => item.id === id);
  if (!confirm(`¿Eliminar “${product?.name}”?`)) return;
  try {
    await api(`/api/admin/products/${id}`, { method: 'DELETE' });
    state.menu = await api('/api/admin/menu');
    renderAll();
    showNotice('Producto eliminado');
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function deleteCategory(id) {
  const category = state.menu.categories.find((item) => item.id === id);
  if (!confirm(`¿Eliminar la categoría “${category?.name}”?`)) return;
  try {
    await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
    state.menu = await api('/api/admin/menu');
    renderAll();
    showNotice('Categoría eliminada');
  } catch (error) {
    showNotice(error.message, true);
  }
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.loginError.hidden = true;
  try {
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: els.password.value }) });
    els.password.value = '';
    await enterAdmin();
  } catch (error) {
    els.loginError.textContent = error.message;
    els.loginError.hidden = false;
  }
});

els.logoutButton.addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.reload();
});

els.navButtons.forEach((button) => button.addEventListener('click', () => switchPanel(button.dataset.panel)));
els.primaryAction.addEventListener('click', () => state.panel === 'products' ? openProductEditor() : openCategoryEditor());
els.productSearch.addEventListener('input', (event) => { state.productSearch = event.target.value; renderProducts(); });
els.productCategoryFilter.addEventListener('change', (event) => { state.productCategory = event.target.value; renderProducts(); });
els.editorForm.addEventListener('submit', saveEditor);

els.businessHeroFile.addEventListener('change', () => {
  try {
    const file = els.businessHeroFile.files[0];
    if (!file) return showImagePreview(els.businessHeroPreview, els.businessHeroEmpty, state.menu.business.heroImage || '');
    validateImage(file);
    showImagePreview(els.businessHeroPreview, els.businessHeroEmpty, URL.createObjectURL(file));
    els.removeBusinessHero.checked = false;
  } catch (error) {
    els.businessHeroFile.value = '';
    showNotice(error.message, true);
  }
});

els.removeBusinessHero.addEventListener('change', () => {
  if (els.removeBusinessHero.checked) {
    els.businessHeroFile.value = '';
    showImagePreview(els.businessHeroPreview, els.businessHeroEmpty, '');
  } else {
    showImagePreview(els.businessHeroPreview, els.businessHeroEmpty, state.menu.business.heroImage || '');
  }
});

els.businessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(els.businessForm);
  const submitButton = els.businessForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Guardando...';

  try {
    let heroImage = state.menu.business.heroImage || '';
    const file = els.businessHeroFile.files[0];
    if (file) heroImage = await uploadImage(file);
    else if (els.removeBusinessHero.checked) heroImage = '';

    const body = Object.fromEntries(formData);
    delete body.heroFile;
    delete body.removeHeroImage;
    body.heroImage = heroImage;

    await api('/api/admin/business', { method: 'PUT', body: JSON.stringify(body) });
    state.menu = await api('/api/admin/menu');
    renderAll();
    showNotice('Datos del local actualizados');
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Guardar cambios';
  }
});

checkSession().catch((error) => {
  els.loginError.textContent = error.message;
  els.loginError.hidden = false;
});
