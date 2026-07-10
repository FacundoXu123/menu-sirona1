const express = require('express');
const session = require('express-session');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'demo1234';
const SESSION_SECRET = process.env.SESSION_SECRET || 'cambiar-este-secreto-en-produccion';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
const PUBLIC_DIR = path.join(__dirname, 'public');
const BUNDLED_DATA_FILE = path.join(__dirname, 'data', 'menu.json');
const STORAGE_DIR = String(process.env.STORAGE_DIR || '').trim();
const DATA_FILE = STORAGE_DIR
  ? path.join(STORAGE_DIR, 'menu.json')
  : BUNDLED_DATA_FILE;
const UPLOAD_DIR = STORAGE_DIR
  ? path.join(STORAGE_DIR, 'uploads')
  : path.join(PUBLIC_DIR, 'uploads');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DEFAULT_MENU = {
  "business": {
    "name": "Café Demo",
    "subtitle": "Café de especialidad · Pastelería · Brunch",
    "currency": "$",
    "instagram": "@cafedemo",
    "whatsapp": "+54 11 0000-0000",
    "address": "Dirección no disponible",
    "hours": "Lunes a domingo · 08:00 a 20:00",
    "slug": "cafedemo",
    "publicUrl": "",
    "heroImage": ""
  },
  "categories": [
    {
      "id": "cafe",
      "name": "Cafetería",
      "description": "Preparado al momento",
      "order": 1
    },
    {
      "id": "te",
      "name": "Tés e infusiones",
      "description": "Opciones clásicas y especiales",
      "order": 2
    },
    {
      "id": "pasteleria",
      "name": "Pastelería",
      "description": "Productos de muestra",
      "order": 3
    },
    {
      "id": "salados",
      "name": "Salados",
      "description": "Opciones para cualquier momento",
      "order": 4
    }
  ],
  "products": [
    {
      "id": "espresso",
      "categoryId": "cafe",
      "name": "Espresso",
      "description": "Café intenso y equilibrado.",
      "price": 2500,
      "available": true,
      "featured": false,
      "image": ""
    },
    {
      "id": "latte",
      "categoryId": "cafe",
      "name": "Latte",
      "description": "Espresso con leche vaporizada.",
      "price": 3500,
      "available": true,
      "featured": true,
      "image": ""
    },
    {
      "id": "matcha",
      "categoryId": "te",
      "name": "Matcha latte",
      "description": "Matcha suave con leche a elección.",
      "price": 3900,
      "available": true,
      "featured": true,
      "image": ""
    },
    {
      "id": "te-hebras",
      "categoryId": "te",
      "name": "Té en hebras",
      "description": "Variedad sujeta a disponibilidad.",
      "price": 3000,
      "available": true,
      "featured": false,
      "image": ""
    },
    {
      "id": "croissant",
      "categoryId": "pasteleria",
      "name": "Croissant",
      "description": "Mantecoso y recién horneado.",
      "price": 2800,
      "available": true,
      "featured": false,
      "image": ""
    },
    {
      "id": "torta",
      "categoryId": "pasteleria",
      "name": "Porción de torta",
      "description": "Sabor del día.",
      "price": 4200,
      "available": false,
      "featured": false,
      "image": ""
    },
    {
      "id": "tostado",
      "categoryId": "salados",
      "name": "Tostado",
      "description": "Pan artesanal con relleno a elección.",
      "price": 5200,
      "available": true,
      "featured": true,
      "image": ""
    }
  ]
};

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function cloneDefaultMenu() {
  return JSON.parse(JSON.stringify(DEFAULT_MENU));
}

function ensureDataFile() {
  if (fs.existsSync(DATA_FILE)) return;

  let initialMenu = cloneDefaultMenu();
  if (DATA_FILE !== BUNDLED_DATA_FILE && fs.existsSync(BUNDLED_DATA_FILE)) {
    try {
      initialMenu = JSON.parse(fs.readFileSync(BUNDLED_DATA_FILE, 'utf8'));
    } catch (error) {
      console.warn('No se pudo leer el menú incluido; se usará el menú de ejemplo interno:', error.message);
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(initialMenu, null, 2), 'utf8');
  console.log(`Archivo de menú creado en ${DATA_FILE}`);
}

ensureDataFile();

app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

function readMenu() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeMenu(menu) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(menu, null, 2), 'utf8');
  fs.renameSync(tempFile, DATA_FILE);
}

function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

function slugify(value) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || crypto.randomUUID();
}

function uniqueId(items, desired) {
  const existing = new Set(items.map((item) => item.id));
  let candidate = desired;
  let suffix = 2;
  while (existing.has(candidate)) {
    candidate = `${desired}-${suffix++}`;
  }
  return candidate;
}

function normalizePublicUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('La URL pública debe empezar con http:// o https://');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('La URL pública debe empezar con http:// o https://');
  }
  return trimmed.replace(/\/+$/, '');
}

function isLocalUpload(imagePath) {
  return typeof imagePath === 'string' && imagePath.startsWith('/uploads/');
}

function deleteLocalUpload(imagePath) {
  if (!isLocalUpload(imagePath)) return;
  const filename = path.basename(imagePath);
  const target = path.join(UPLOAD_DIR, filename);
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (error) {
    console.warn(`No se pudo borrar ${target}:`, error.message);
  }
}

function detectImageExtension(buffer, declaredType) {
  if (declaredType === 'jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (declaredType === 'png' && buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (declaredType === 'gif' && buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'gif';
  if (declaredType === 'webp' && buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

function saveDataUrlImage(dataUrl) {
  const match = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('Formato de imagen no permitido. Usá JPG, PNG, WEBP o GIF');

  const declaredType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) throw new Error('La imagen está vacía');
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('La imagen supera el máximo de 5 MB');

  const extension = detectImageExtension(buffer, declaredType);
  if (!extension) throw new Error('El archivo no parece ser una imagen válida');

  const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

app.get('/health', (_req, res) => res.status(200).send('ok'));

app.get('/api/menu', (req, res) => {
  try {
    const menu = readMenu();
    const publicMenu = {
      business: menu.business,
      categories: [...menu.categories].sort((a, b) => a.order - b.order),
      products: menu.products.filter((product) => product.available)
    };
    res.json(publicMenu);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cargar el menú' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session?.isAdmin) });
});

app.get('/api/admin/menu', requireAdmin, (req, res) => {
  res.json(readMenu());
});

app.post('/api/admin/uploads', requireAdmin, (req, res) => {
  try {
    const url = saveDataUrlImage(req.body.dataUrl);
    res.status(201).json({ url });
  } catch (error) {
    res.status(400).json({ error: error.message || 'No se pudo subir la imagen' });
  }
});

app.put('/api/admin/business', requireAdmin, (req, res) => {
  const menu = readMenu();
  const allowed = ['name', 'subtitle', 'currency', 'instagram', 'whatsapp', 'address', 'hours'];
  for (const key of allowed) {
    if (typeof req.body[key] === 'string') menu.business[key] = req.body[key].trim();
  }

  if (typeof req.body.slug === 'string') {
    menu.business.slug = slugify(req.body.slug || menu.business.name || 'menu');
  }

  if (typeof req.body.publicUrl === 'string') {
    try {
      menu.business.publicUrl = normalizePublicUrl(req.body.publicUrl);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  if (typeof req.body.heroImage === 'string') {
    const nextImage = req.body.heroImage.trim();
    const previousImage = menu.business.heroImage || '';
    menu.business.heroImage = nextImage;
    if (previousImage !== nextImage) deleteLocalUpload(previousImage);
  }

  writeMenu(menu);
  res.json(menu.business);
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const menu = readMenu();
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const id = uniqueId(menu.categories, slugify(name));
  const category = {
    id,
    name,
    description: String(req.body.description || '').trim(),
    order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : menu.categories.length + 1
  };
  menu.categories.push(category);
  writeMenu(menu);
  res.status(201).json(category);
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const menu = readMenu();
  const category = menu.categories.find((item) => item.id === req.params.id);
  if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });

  if (typeof req.body.name === 'string' && req.body.name.trim()) category.name = req.body.name.trim();
  if (typeof req.body.description === 'string') category.description = req.body.description.trim();
  if (Number.isFinite(Number(req.body.order))) category.order = Number(req.body.order);
  writeMenu(menu);
  res.json(category);
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const menu = readMenu();
  const hasProducts = menu.products.some((product) => product.categoryId === req.params.id);
  if (hasProducts) {
    return res.status(409).json({ error: 'Primero mové o eliminá los productos de esta categoría' });
  }
  menu.categories = menu.categories.filter((item) => item.id !== req.params.id);
  writeMenu(menu);
  res.json({ ok: true });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const menu = readMenu();
  const name = String(req.body.name || '').trim();
  const categoryId = String(req.body.categoryId || '');
  const price = Number(req.body.price);

  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!menu.categories.some((category) => category.id === categoryId)) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }
  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'Precio inválido' });
  }

  const product = {
    id: uniqueId(menu.products, slugify(name)),
    categoryId,
    name,
    description: String(req.body.description || '').trim(),
    price,
    available: req.body.available !== false,
    featured: Boolean(req.body.featured),
    image: String(req.body.image || '').trim()
  };
  menu.products.push(product);
  writeMenu(menu);
  res.status(201).json(product);
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const menu = readMenu();
  const product = menu.products.find((item) => item.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  if (typeof req.body.name === 'string' && req.body.name.trim()) product.name = req.body.name.trim();
  if (typeof req.body.description === 'string') product.description = req.body.description.trim();
  if (typeof req.body.image === 'string') {
    const nextImage = req.body.image.trim();
    const previousImage = product.image || '';
    product.image = nextImage;
    if (previousImage !== nextImage) deleteLocalUpload(previousImage);
  }
  if (typeof req.body.categoryId === 'string' && menu.categories.some((c) => c.id === req.body.categoryId)) {
    product.categoryId = req.body.categoryId;
  }
  if (Number.isFinite(Number(req.body.price)) && Number(req.body.price) >= 0) product.price = Number(req.body.price);
  if (typeof req.body.available === 'boolean') product.available = req.body.available;
  if (typeof req.body.featured === 'boolean') product.featured = req.body.featured;

  writeMenu(menu);
  res.json(product);
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const menu = readMenu();
  const product = menu.products.find((item) => item.id === req.params.id);
  if (product) deleteLocalUpload(product.image);
  menu.products = menu.products.filter((item) => item.id !== req.params.id);
  writeMenu(menu);
  res.json({ ok: true });
});

app.get('/api/admin/qr', requireAdmin, async (req, res) => {
  try {
    const menu = readMenu();
    const origin = `${req.protocol}://${req.get('host')}`;
    const slug = slugify(menu.business.slug || menu.business.name || 'menu');
    const baseUrl = PUBLIC_BASE_URL || menu.business.publicUrl || `${origin}/${slug}`;
    const dataUrl = await QRCode.toDataURL(baseUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H'
    });
    res.json({ url: baseUrl, dataUrl });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo generar el QR' });
  }
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/:slug/admin', (req, res, next) => {
  const menu = readMenu();
  const currentSlug = slugify(menu.business.slug || menu.business.name || 'menu');
  if (req.params.slug !== currentSlug) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/:slug', (req, res, next) => {
  const menu = readMenu();
  const currentSlug = slugify(menu.business.slug || menu.business.name || 'menu');
  if (req.params.slug !== currentSlug) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const menu = readMenu();
  const slug = slugify(menu.business.slug || menu.business.name || 'menu');
  console.log(`Menú público: http://localhost:${PORT}`);
  console.log(`Menú con nombre: http://localhost:${PORT}/${slug}`);
  console.log(`Panel privado: http://localhost:${PORT}/admin`);
});
