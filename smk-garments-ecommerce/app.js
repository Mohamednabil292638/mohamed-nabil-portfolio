const SMK_ECOM_KEY = 'smk_garments_cart_v1';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function formatINR(amount) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(SMK_ECOM_KEY) || '[]');
  } catch {
    return [];
  }
}

function setCart(items) {
  localStorage.setItem(SMK_ECOM_KEY, JSON.stringify(items));
}

function cartAdd(productId, qty = 1) {
  const products = window.__SMK_PRODUCTS__ || [];
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const cart = getCart();
  const idx = cart.findIndex(x => x.id === productId);
  if (idx >= 0) cart[idx].qty += qty;
  else cart.push({ id: productId, qty });
  setCart(cart);
}

function cartUpdate(productId, qty) {
  const cart = getCart().map(x => ({ ...x }));
  const idx = cart.findIndex(x => x.id === productId);
  if (idx < 0) return;
  if (qty <= 0) cart.splice(idx, 1);
  else cart[idx].qty = qty;
  setCart(cart);
}

function cartRemove(productId) {
  const cart = getCart().filter(x => x.id !== productId);
  setCart(cart);
}

function buildWhatsAppLink(phoneNumber, text) {
  const base = `https://wa.me/${phoneNumber}`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

function buildOrderText({ storeName, items, customerName, phone, city, address }) {
  const lines = [];
  lines.push(`Order Request - ${storeName}`);
  if (customerName) lines.push(`Name: ${customerName}`);
  if (phone) lines.push(`Phone: ${phone}`);
  if (city) lines.push(`City: ${city}`);
  if (address) lines.push(`Address/Note: ${address}`);

  lines.push('');
  lines.push('Items:');
  if (!items.length) lines.push('- (No items)');
  for (const it of items) {
    const p = (window.__SMK_PRODUCTS__ || []).find(x => x.id === it.id);
    const name = p ? p.name : it.id;
    const price = p ? p.price : 0;
    lines.push(`- ${name} x${it.qty} (${formatINR(price)} each)`);
  }

  const total = items.reduce((acc, it) => {
    const p = (window.__SMK_PRODUCTS__ || []).find(x => x.id === it.id);
    return acc + (p ? p.price * it.qty : 0);
  }, 0);
  lines.push('');
  lines.push(`Estimated Total: ${formatINR(total)}`);

  lines.push('');
  lines.push('Please confirm availability and bulk pricing.');
  return lines.join('\n');
}

async function loadProducts() {
  if (window.__SMK_PRODUCTS_LOADED__) return window.__SMK_PRODUCTS__;
  const res = await fetch('./data/products.json');
  const data = await res.json();
  window.__SMK_PRODUCTS_DATA__ = data;
  window.__SMK_PRODUCTS__ = data.products || [];
  window.__SMK_PRODUCTS_LOADED__ = true;
  return window.__SMK_PRODUCTS__;
}

function applyCatalogFilters() {
  const search = ($('#search')?.value || '').trim().toLowerCase();
  const category = $('#category')?.value || 'all';
  const sort = $('#sort')?.value || 'featured';

  let products = [...(window.__SMK_PRODUCTS__ || [])];

  if (category !== 'all') {
    products = products.filter(p => p.category === category);
  }

  if (search) {
    products = products.filter(p => {
      const hay = `${p.name} ${p.category} ${p.description}`.toLowerCase();
      return hay.includes(search);
    });
  }

  if (sort === 'low') products.sort((a, b) => a.price - b.price);
  if (sort === 'high') products.sort((a, b) => b.price - a.price);

  return products;
}

function renderProductsGrid(products) {
  const grid = $('#productsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  products.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card glass-panel tilt-card reveal-bottom';
    if (i > 0) card.style.transitionDelay = `${Math.min(i * 0.08, 0.3)}s`;

    card.innerHTML = `
      <div class="product-visual">
        <img src="${p.image}" alt="${p.name}" class="product-img" />
        <div class="product-overlay">
          <a href="product.html?id=${encodeURIComponent(p.id)}" class="btn-icon interactive-element" title="View Product"><i class="fas fa-eye"></i></a>
          <button class="btn-icon interactive-element" type="button" data-add="${p.id}" title="Add to Cart"><i class="fas fa-cart-plus"></i></button>
        </div>
      </div>
      <div class="product-details">
        <h3 class="product-title">${p.name}</h3>
        <div class="product-meta">${p.category}</div>
        <p class="product-desc">${p.description}</p>
        <div class="product-price">${formatINR(p.price)}</div>
      </div>
    `;

    grid.appendChild(card);

    const addBtn = $('button[data-add="' + p.id + '"]', card);
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        cartAdd(p.id, 1);
        window.dispatchEvent(new Event('smk_cart_updated'));
      });
    }
  });
}

function renderCatalog() {
  const data = window.__SMK_PRODUCTS_DATA__;
  const categories = data?.categories || [];

  const categorySel = $('#category');
  if (categorySel) {
    categorySel.innerHTML = `<option value="all">All</option>` + categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  const products = applyCatalogFilters();
  renderProductsGrid(products);
}

function renderProductDetail() {
  const id = new URLSearchParams(location.search).get('id');
  const layout = $('#productLayout');
  if (!layout) return;

  const p = (window.__SMK_PRODUCTS__ || []).find(x => x.id === id);
  if (!p) {
    layout.innerHTML = `<div class="glass-panel" style="padding:25px;">Product not found.</div>`;
    return;
  }

  layout.innerHTML = `
    <div class="product-image-wrap glass-panel tilt-card reveal-left">
      <div class="product-image-hero">
        <img src="${p.image}" alt="${p.name}" />
      </div>
    </div>

    <div class="product-info glass-panel tilt-card reveal-right">
      <h3 class="project-title">${p.name}</h3>
      <p class="product-meta">Category: ${p.category}</p>
      <p class="hero-desc" style="margin-top:10px;">${p.description}</p>

      <div class="product-price" style="margin-top:18px;">${formatINR(p.price)}</div>

      <div class="qty-row">
        <button class="qty-btn" id="qtyMinus" type="button"><i class="fas fa-minus"></i></button>
        <div class="qty-value" id="qtyValue">1</div>
        <button class="qty-btn" id="qtyPlus" type="button"><i class="fas fa-plus"></i></button>
      </div>

      <div style="margin-top:18px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn-primary interactive-element" id="addToCartBtn" type="button">Add to Cart</button>
        <a href="cart.html" class="btn btn-secondary interactive-element">View Cart</a>
      </div>

      <a id="whatsappProductBtn" class="btn btn-outline interactive-element" style="margin-top:16px; width:100%;" href="#" target="_blank">Order on WhatsApp</a>

    </div>
  `;

  let qty = 1;
  const qtyValue = $('#qtyValue');
  const minus = $('#qtyMinus');
  const plus = $('#qtyPlus');

  const clamp = (v) => Math.max(1, Math.min(99, v));

  minus?.addEventListener('click', () => {
    qty = clamp(qty - 1);
    qtyValue.textContent = String(qty);
  });
  plus?.addEventListener('click', () => {
    qty = clamp(qty + 1);
    qtyValue.textContent = String(qty);
  });

  $('#addToCartBtn')?.addEventListener('click', () => {
    cartAdd(p.id, qty);
    window.dispatchEvent(new Event('smk_cart_updated'));
  });

  const store = window.__SMK_PRODUCTS_DATA__.store;
  const items = [{ id: p.id, qty }];
  const text = buildOrderText({
    storeName: store.name,
    items,
    customerName: null,
    phone: null,
    city: null,
    address: null
  });

  const link = buildWhatsAppLink(store.whatsappNumber, text);
  const btn = $('#whatsappProductBtn');
  if (btn) btn.href = link;
}

function renderCart() {
  const itemsRoot = $('#cartItems');
  const summaryRoot = $('#cartSummary');
  if (!itemsRoot || !summaryRoot) return;

  const cart = getCart();
  const products = window.__SMK_PRODUCTS__ || [];

  if (!cart.length) {
    itemsRoot.innerHTML = `<div class="glass-panel" style="padding:22px;">Your cart is empty.</div>`;
    summaryRoot.innerHTML = `
      <h3 class="project-title">Summary</h3>
      <p class="hero-desc" style="margin:0; font-size:0.95rem;">Add products to proceed.</p>
      <div style="margin-top:14px; display:flex; gap:12px; flex-wrap:wrap;">
        <a href="index.html" class="btn btn-primary interactive-element">Shop Now</a>
      </div>
    `;
    return;
  }

  itemsRoot.innerHTML = '';

  for (const it of cart) {
    const p = products.find(x => x.id === it.id);
    const item = document.createElement('div');
    item.className = 'cart-item glass-panel tilt-card reveal-bottom';
    item.innerHTML = `
      <div class="cart-thumb">
        <img src="${p?.image || ''}" alt="${p?.name || it.id}" />
      </div>
      <div>
        <h4>${p?.name || it.id}</h4>
        <div class="muted">${p?.category || ''}</div>
        <div class="muted" style="margin-top:6px;">${formatINR(p?.price || 0)} each</div>
      </div>
      <div class="cart-actions">
        <button class="btn btn-secondary interactive-element" type="button" data-dec="${it.id}">-</button>
        <div class="qty-value" style="min-width:74px;">Qty: ${it.qty}</div>
        <button class="btn btn-secondary interactive-element" type="button" data-inc="${it.id}">+</button>
        <button class="btn btn-outline interactive-element" type="button" data-rem="${it.id}">Remove</button>
      </div>
    `;

    itemsRoot.appendChild(item);

    $('button[data-dec="' + it.id + '"]', item)?.addEventListener('click', () => {
      cartUpdate(it.id, it.qty - 1);
      renderCart();
    });
    $('button[data-inc="' + it.id + '"]', item)?.addEventListener('click', () => {
      cartUpdate(it.id, it.qty + 1);
      renderCart();
    });
    $('button[data-rem="' + it.id + '"]', item)?.addEventListener('click', () => {
      cartRemove(it.id);
      renderCart();
    });
  }

  const total = cart.reduce((acc, it) => {
    const p = products.find(x => x.id === it.id);
    return acc + (p ? p.price * it.qty : 0);
  }, 0);

  const store = window.__SMK_PRODUCTS_DATA__.store;
  const text = buildOrderText({
    storeName: store.name,
    items: cart,
    customerName: null,
    phone: null,
    city: null,
    address: null
  });

  const link = buildWhatsAppLink(store.whatsappNumber, text);

  summaryRoot.innerHTML = `
    <h3 class="project-title">Order Summary</h3>
    <p class="hero-desc" style="margin:0; font-size:0.95rem;">Items: ${cart.reduce((a, b) => a + b.qty, 0)}</p>
    <p class="hero-desc" style="margin-top:10px; font-size:0.95rem;">Estimated Total: <span style="color: var(--accent-gold); font-weight:800;">${formatINR(total)}</span></p>
    <div style="margin-top:16px; display:flex; gap:12px; flex-wrap:wrap;">
      <a href="checkout.html" class="btn btn-primary interactive-element">Checkout</a>
      <a href="${link}" target="_blank" class="btn btn-outline interactive-element">WhatsApp Order</a>
    </div>
  `;
}

function renderCheckout() {
  const summaryRoot = $('#checkoutSummary');
  const cart = getCart();
  if (!summaryRoot) return;

  const products = window.__SMK_PRODUCTS__ || [];

  if (!cart.length) {
    summaryRoot.innerHTML = `
      <h3 class="project-title">No items</h3>
      <p class="hero-desc" style="margin:0; font-size:0.95rem;">Cart is empty. Add items first.</p>
      <div style="margin-top:16px;">
        <a href="index.html" class="btn btn-primary interactive-element">Shop Now</a>
      </div>
    `;
    return;
  }

  const total = cart.reduce((acc, it) => {
    const p = products.find(x => x.id === it.id);
    return acc + (p ? p.price * it.qty : 0);
  }, 0);

  summaryRoot.innerHTML = `
    <h3 class="project-title">Checkout Summary</h3>
    <p class="hero-desc" style="margin:0; font-size:0.95rem;">Items: ${cart.reduce((a, b) => a + b.qty, 0)}</p>
    <div style="margin-top:14px; border-top: 1px solid rgba(255,255,255,0.06); padding-top:14px;">
      ${cart.map(it => {
        const p = products.find(x => x.id === it.id);
        return `<div style="display:flex; justify-content:space-between; gap:12px; margin:10px 0;">
          <div style="color: var(--text-main); font-weight:600;">${p?.name || it.id}</div>
          <div style="color: var(--accent-gold); font-weight:800;">x${it.qty}</div>
        </div>`;
      }).join('')}
    </div>
    <p class="hero-desc" style="margin-top:14px; font-size:0.95rem;">Estimated Total: <span style="color: var(--accent-gold); font-weight:800;">${formatINR(total)}</span></p>
  `;

  const store = window.__SMK_PRODUCTS_DATA__.store;

  $('#whatsappCheckoutBtn')?.addEventListener('click', () => {
    const name = $('#name')?.value?.trim() || '';
    const phone = $('#phone')?.value?.trim() || '';
    const city = $('#city')?.value?.trim() || '';
    const address = $('#address')?.value?.trim() || '';

    const text = buildOrderText({
      storeName: store.name,
      items: cart,
      customerName: name,
      phone,
      city,
      address
    });

    const link = buildWhatsAppLink(store.whatsappNumber, text);
    window.open(link, '_blank');
  });
}

function renderQuickWhatsApp() {
  const link = $('#whatsappQuickLink');
  if (!link) return;
  const store = window.__SMK_PRODUCTS_DATA__.store;
  const cart = getCart();

  const items = cart.length ? cart : [];
  const text = buildOrderText({
    storeName: store.name,
    items,
    customerName: null,
    phone: null,
    city: null,
    address: null
  });
  link.href = buildWhatsAppLink(store.whatsappNumber, text);
}

function initEcomPage() {
  // prevent using portfolio script.js for cart rendering; this is standalone
  const page = location.pathname.split('/').pop();
  if (page === 'index.html') {
    loadProducts().then(() => {
      renderCatalog();
      renderQuickWhatsApp();

      $('#category')?.addEventListener('change', renderCatalog);
      $('#search')?.addEventListener('input', () => {
        window.clearTimeout(window.__smkSearchT);
        window.__smkSearchT = window.setTimeout(renderCatalog, 200);
      });
      $('#sort')?.addEventListener('change', renderCatalog);
    });
  }

  if (page === 'product.html') {
    loadProducts().then(() => renderProductDetail());
  }

  if (page === 'cart.html') {
    loadProducts().then(() => {
      renderCart();
      window.addEventListener('smk_cart_updated', renderCart);
    });
  }

  if (page === 'checkout.html') {
    loadProducts().then(() => {
      renderCheckout();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Footer year reuse (existing portfolio JS handles it only on main index.html)
  const yearSpan = $('#year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  initEcomPage();
});

