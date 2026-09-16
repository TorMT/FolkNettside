const state = { products: [], cart: JSON.parse(localStorage.getItem('matpris-cart') || '[]'), controller: null };
const $ = (selector) => document.querySelector(selector);
const input = $('#search-input');
const results = $('#results');
const status = $('#status');

const KASSALAPP_API_BASE = 'https://kassal.app/api/v1';
const KASSALAPP_API_KEY = 'TSnGt9KUo4ytltLNmVQcUQg4YZqhNxY9ZSKA9kIB';

const apiUrl = (path) => new URL(path, window.location.href).toString();

const directApiUrl = (path, params = {}) => {
	const url = new URL(path, `${KASSALAPP_API_BASE}/`);
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && String(value).length) {
			url.searchParams.set(key, String(value));
		}
	});
	return url.toString();
};

const matprisFetch = async (path, params = {}, init = {}) => {
	const url = directApiUrl(path, params);
	const headers = {
		Accept: 'application/json',
		Authorization: `Bearer ${KASSALAPP_API_KEY}`,
		...(init.headers || {})
	};
	return fetch(url, { ...init, headers, credentials: 'omit' });
};

const kroner = (value) => Number.isFinite(Number(value))
	? new Intl.NumberFormat('no-NO', { style: 'currency', currency: 'NOK' }).format(Number(value))
	: '';

const text = (value) => String(value ?? '').trim();
const esc = (value) => text(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const dataItems = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.data?.products)) return payload.data.products;
	if (Array.isArray(payload?.data?.items)) return payload.data.items;
	if (Array.isArray(payload?.products)) return payload.products;
	if (Array.isArray(payload?.items)) return payload.items;
	return [];
};

const numeric = (value) => {
	if (Array.isArray(value)) return numeric(value[0]);
	if (Number.isFinite(Number(value))) return Number(value);
	if (value && typeof value === 'object') {
		const fallback = value.value ?? value.price ?? value.amount ?? value.current_price ?? value.current_unit_price ?? NaN;
		return Number.isFinite(Number(fallback)) ? Number(fallback) : NaN;
	}
	return NaN;
};

const price = (item) => numeric(item?.current_price ?? item?.price ?? item?.currentPrice ?? item?.prices?.current ?? item?.latest_price);
const unitPrice = (item) => numeric(item?.current_unit_price ?? item?.unit_price ?? item?.unitPrice ?? item?.prices?.unit);
const store = (item) => {
	const value = Array.isArray(item?.store) ? item.store[0] : item?.store;
	return text(value?.name ?? value ?? item?.chain ?? item?.retailer ?? item?.vendor ?? item?.shop ?? item?.merchant);
};
const image = (item) => text(item?.image ?? item?.image_url ?? item?.imageUrl ?? item?.thumbnail ?? '');

const ensureJsonResponse = (response) => {
	const contentType = (response.headers.get('content-type') || '').toLowerCase();
	if (!contentType.includes('application/json')) {
		throw new Error('Matprissøk er ikke tilgjengelig via API-et akkurat nå. Prøv igjen senere.');
	}
	return response;
};

function unique(items) {
	const seen = new Set();
	return items.filter((item) => {
		const key = text(item.ean);
		if (!key) return true;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function setUrl(key, value) {
	const url = new URL(location.href);
	if (value) url.searchParams.set(key, value);
	else url.searchParams.delete(key);
	history.replaceState({}, '', url);
}

async function search(query) {
	if (state.controller) state.controller.abort();
	state.controller = new AbortController();

	status.textContent = 'Henter priser...';
	results.innerHTML = '';

	try {
		const request = matprisFetch('products', { search: query, unique: '1', size: '50' }, {
			signal: state.controller.signal,
			credentials: 'omit'
		}).catch(async () => {
			const url = apiUrl(`api/products.php?q=${encodeURIComponent(query)}`);
			return fetch(url, { signal: state.controller.signal, credentials: 'same-origin' });
		});

		const response = await request;
		if (!response.ok) {
			const raw = await response.text().catch(() => '');
			let body = null;
			try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
			const message = body?.error || body?.message || (response.status === 429 ? 'For mange forespørsler akkurat nå.' : 'Kunne ikke hente priser akkurat nå.');
			throw new Error(message);
		}

		ensureJsonResponse(response);
		const body = await response.json().catch(() => ({}));
		state.products = unique(dataItems(body));
		populateStores();
		render();
	} catch (error) {
		if (error.name === 'AbortError') return;
		status.textContent = error.message || 'Kunne ikke hente priser akkurat nå.';
	}
}

function populateStores() {
	const select = $('#store-filter');
	const current = select.value;
	const stores = [...new Set(state.products.map(store).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb'));
	select.innerHTML = '<option value="">Alle butikker</option>' + stores.map((storeName) => `<option value="${esc(storeName)}">${esc(storeName)}</option>`).join('');
	if (stores.includes(current)) select.value = current;
}

function render() {
	const selected = $('#store-filter').value;
	const onlyPriced = $('#priced-only').checked;
	const sortMode = $('#sort-select').value;

	let items = state.products.filter((product) => {
		const productStore = store(product);
		const matchStore = !selected || productStore === selected;
		const matchPrice = !onlyPriced || Number.isFinite(price(product));
		return matchStore && matchPrice;
	});

	items.sort((a, b) => {
		const av = sortMode === 'unit' ? unitPrice(a) : price(a);
		const bv = sortMode === 'unit' ? unitPrice(b) : price(b);
		return (Number.isFinite(av) ? av : Infinity) - (Number.isFinite(bv) ? bv : Infinity);
	});

	status.textContent = items.length ? `${items.length} varer funnet.` : `Fant ingen varer for «${input.value}».`;
	results.innerHTML = items.map(card).join('');
	renderAutocomplete();

	document.querySelectorAll('[data-action]').forEach((button) => {
		button.onclick = () => {
			const item = state.products.find((product) => text(product.id) === button.dataset.id || text(product.ean) === button.dataset.id);
			if (button.dataset.action === 'add') add(item);
			else showProduct(item);
		};
	});
}

function renderAutocomplete() {
	const box = $('#autocomplete');
	const suggestions = state.products.slice(0, 6);

	if (!suggestions.length || input.value.trim().length < 2) {
		box.hidden = true;
		box.innerHTML = '';
		return;
	}

	box.innerHTML = suggestions
		.map((product) => `<button type="button" data-suggestion="${esc(text(product.ean) || text(product.id))}">${esc(text(product.name) || 'Ukjent vare')} <small>${esc(store(product))}</small></button>`)
		.join('');

	box.hidden = false;
	box.querySelectorAll('[data-suggestion]').forEach((button) => {
		button.onclick = () => {
			const matched = state.products.find((product) => (text(product.ean) || text(product.id)) === button.dataset.suggestion);
			input.value = matched?.name || input.value;
			box.hidden = true;
			search(input.value);
		};
	});
}

function card(product) {
	const amount = text(product.weight) && text(product.weight_unit) ? `${esc(product.weight)} ${esc(product.weight_unit)}` : '';
	const current = price(product);
	const unit = unitPrice(product);
	const key = esc(text(product.ean) || text(product.id));

	return `<article class="product-card"><img src="${esc(image(product) || '/img/welcome-generic.svg')}" alt=""><div class="product-body"><p class="brand">${esc(text(product.brand) || 'Ukjent merke')}</p><h2 class="product-name">${esc(text(product.name) || 'Ukjent vare')}</h2>${amount ? `<p class="meta">${amount}</p>` : ''}<p class="price">${kroner(current) || 'Pris ikke tilgjengelig'}</p>${Number.isFinite(unit) ? `<p class="unit-price">${kroner(unit)} / ${esc(text(product.weight_unit) || 'enhet')}</p>` : ''}<p class="store">${esc(store(product) || 'Butikk ikke oppgitt')}</p><div class="card-actions"><button data-action="compare" data-id="${key}">Sammenlign priser</button><button data-action="add" data-id="${key}">+ Legg til</button></div></div></article>`;
}

async function showProduct(product) {
	const ean = text(product?.ean);
	if (!ean) {
		openDialog(`<h2>${esc(product?.name)}</h2><p>Dette produktet har ikke EAN for butikk-sammenligning.</p>`);
		return;
	}

	openDialog('<p>Henter priser fra butikker...</p>');

	try {
		const response = await matprisFetch(`products/ean/${encodeURIComponent(ean)}`, {}, {}).catch(async () => fetch(apiUrl(`api/product.php?ean=${encodeURIComponent(ean)}`), { credentials: 'same-origin' }));

		if (!response.ok) {
			const raw = await response.text().catch(() => '');
			let body = null;
			try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
			throw new Error(body?.error || body?.message || 'Kunne ikke hente sammenligningen akkurat nå.');
		}

		ensureJsonResponse(response);
		const body = await response.json().catch(() => ({}));
		const items = dataItems(body).filter((item) => Number.isFinite(price(item)));
		items.sort((a, b) => price(a) - price(b));

		const best = price(items[0]);
		const worst = price(items.at(-1));

		openDialog(`<p class="eyebrow">Prissammenligning</p><h2>${esc(product.name)}</h2><table class="compare-table">${items.map((item, index) => `<tr class="${index === 0 ? 'cheapest' : ''}"><td>${index + 1}. ${esc(store(item) || 'Butikk ikke oppgitt')} ${index === 0 ? '<span class="badge">BILLIGST</span>' : ''}</td><td>${kroner(price(item))}</td></tr>`).join('')}</table>${Number.isFinite(best) && Number.isFinite(worst) ? `<p>Du sparer <strong>${kroner(worst - best)}</strong> mot dyreste butikk.</p>` : ''}<p class="meta">EAN: ${esc(ean)}</p>${text(product.ingredients) ? `<details><summary>Ingredienser</summary><p>${esc(product.ingredients)}</p></details>` : ''}`);
	} catch (error) {
		openDialog(`<p>${esc(error.message || 'Kunne ikke hente sammenligningen akkurat nå.')}</p>`);
	}
}

function openDialog(html) {
	$('#dialog-content').innerHTML = html;
	const dialog = $('#product-dialog');
	if (!dialog.open) dialog.showModal();
}

function add(product) {
	if (!product) return;

	const key = text(product.ean) || text(product.id) || text(product.name);
	const found = state.cart.find((item) => item.key === key);

	if (found) found.quantity += 1;
	else state.cart.push({ key, name: text(product.name) || 'Ukjent vare', price: price(product), quantity: 1 });

	saveCart();
}

function saveCart() {
	localStorage.setItem('matpris-cart', JSON.stringify(state.cart));
	renderCart();
}

function renderCart() {
	$('#cart-count').textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0);
	$('#cart-total').textContent = kroner(state.cart.reduce((sum, item) => sum + (Number.isFinite(item.price) ? item.price * item.quantity : 0), 0));
	$('#cart-items').innerHTML = state.cart.map((item, index) => `<div class="cart-row"><span>${item.name}<small>${kroner(item.price) || 'Pris ikke tilgjengelig'}</small></span><span class="quantity"><button data-cart="minus" data-index="${index}">−</button>${item.quantity}<button data-cart="plus" data-index="${index}">+</button></span><button class="remove" data-cart="remove" data-index="${index}">Fjern</button></div>`).join('');

	document.querySelectorAll('[data-cart]').forEach((button) => {
		button.onclick = () => {
			const index = Number(button.dataset.index);
			if (button.dataset.cart === 'plus') state.cart[index].quantity += 1;
			if (button.dataset.cart === 'minus') state.cart[index].quantity -= 1;
			if (button.dataset.cart === 'remove' || state.cart[index].quantity < 1) state.cart.splice(index, 1);
			saveCart();
		};
	});
}

let timer;
input.addEventListener('input', () => {
	clearTimeout(timer);
	const query = input.value.trim();
	setUrl('q', query);

	if (query.length < 2) {
		results.innerHTML = '';
		status.textContent = 'Søk etter en vare for å sammenligne priser.';
		return;
	}

	timer = setTimeout(() => search(query), 300);
});

$('#search-form').onsubmit = (event) => {
	event.preventDefault();
	const query = input.value.trim();
	if (query.length >= 2) search(query);
};

$('#store-filter').onchange = render;
$('#sort-select').onchange = render;
$('#priced-only').onchange = render;
$('#dialog-close').onclick = () => $('#product-dialog').close();
$('#cart-toggle').onclick = () => $('#cart-panel').hidden = false;
$('#cart-close').onclick = () => $('#cart-panel').hidden = true;
$('#cart-clear').onclick = () => {
	state.cart = [];
	saveCart();
};

renderCart();

const q = new URL(location.href).searchParams.get('q');
if (q) {
	input.value = q;
	search(q);
}
