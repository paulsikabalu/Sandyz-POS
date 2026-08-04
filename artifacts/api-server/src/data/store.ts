import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// process.cwd() is the package dir (artifacts/api-server/) when run via pnpm
const DATA_DIR = join(process.cwd(), 'data');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export type UserRole = 'admin' | 'cashier' | 'manager';

export type User = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  section: string;   // Bakery | Fast Food | Snacks & Pastries | Drinks
  category: string;  // Bread | Shawarma | Samosa | Dondos | Soft Drinks | Water | Juices | Energy Drinks
  image: string;
  stock: number;
  unit: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  timestamp: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  tableId: string;
  serviceType: string;
};

export type AppSettings = {
  id: string;
  key: string;
  value: string;
  updatedAt: number;
};

export type Category = {
  id: string;
  section: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

const SEED_PRODUCTS: Product[] = [
  // ── Bakery › Bread ──────────────────────────────────────────────────────────
  { id: 'br1', section: 'Bakery', category: 'Bread', name: 'White Bread',  price: 15, stock: 50,  unit: 'loaves', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop&auto=format' },
  { id: 'br2', section: 'Bakery', category: 'Bread', name: 'Brown Bread',  price: 18, stock: 30,  unit: 'loaves', image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7e?w=400&h=300&fit=crop&auto=format' },
  { id: 'br3', section: 'Bakery', category: 'Bread', name: 'Bread Roll',   price:  5, stock: 100, unit: 'pieces', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&h=300&fit=crop&auto=format' },
  { id: 'br4', section: 'Bakery', category: 'Bread', name: 'Garlic Bread', price: 25, stock: 20,  unit: 'pieces', image: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400&h=300&fit=crop&auto=format' },

  // ── Fast Food › Shawarma ─────────────────────────────────────────────────────
  { id: 'sh1', section: 'Fast Food', category: 'Shawarma', name: 'Chicken Shawarma', price: 45, stock: 40, unit: 'pieces', image: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400&h=300&fit=crop&auto=format' },
  { id: 'sh2', section: 'Fast Food', category: 'Shawarma', name: 'Beef Shawarma',    price: 55, stock: 35, unit: 'pieces', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=300&fit=crop&auto=format' },
  { id: 'sh3', section: 'Fast Food', category: 'Shawarma', name: 'Mixed Shawarma',   price: 60, stock: 25, unit: 'pieces', image: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=400&h=300&fit=crop&auto=format' },
  { id: 'sh4', section: 'Fast Food', category: 'Shawarma', name: 'Veggie Shawarma',  price: 35, stock: 20, unit: 'pieces', image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=300&fit=crop&auto=format' },

  // ── Snacks & Pastries › Samosa ───────────────────────────────────────────────
  { id: 'sa1', section: 'Snacks & Pastries', category: 'Samosa', name: 'Beef Samosa',    price: 10, stock: 80, unit: 'pieces', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop&auto=format' },
  { id: 'sa2', section: 'Snacks & Pastries', category: 'Samosa', name: 'Chicken Samosa', price: 10, stock: 80, unit: 'pieces', image: 'https://images.unsplash.com/photo-1630409351241-e90e7e8a4d4e?w=400&h=300&fit=crop&auto=format' },
  { id: 'sa3', section: 'Snacks & Pastries', category: 'Samosa', name: 'Veggie Samosa',  price:  8, stock: 60, unit: 'pieces', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop&auto=format' },

  // ── Snacks & Pastries › Dondos ───────────────────────────────────────────────
  { id: 'do1', section: 'Snacks & Pastries', category: 'Dondos', name: 'Pork Dondos',    price: 30, stock: 50, unit: 'pieces', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop&auto=format' },
  { id: 'do3', section: 'Snacks & Pastries', category: 'Dondos', name: 'Chicken Dondos', price: 25, stock: 55, unit: 'pieces', image: 'https://images.unsplash.com/photo-1598515213692-f7b2e7e5b29b?w=400&h=300&fit=crop&auto=format' },

  // ── Drinks › Soft Drinks ─────────────────────────────────────────────────────
  { id: 'dr1', section: 'Drinks', category: 'Soft Drinks', name: 'Coca Cola', price: 15, stock: 100, unit: 'cans', image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop&auto=format' },
  { id: 'dr2', section: 'Drinks', category: 'Soft Drinks', name: 'Fanta',     price: 15, stock: 100, unit: 'cans', image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=300&fit=crop&auto=format' },

  // ── Drinks › Water ───────────────────────────────────────────────────────────
  { id: 'dr3', section: 'Drinks', category: 'Water', name: 'Water', price: 8, stock: 200, unit: 'bottles', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop&auto=format' },

  // ── Drinks › Juices ──────────────────────────────────────────────────────────
  { id: 'dr4', section: 'Drinks', category: 'Juices', name: 'Fresh Juice', price: 20, stock: 50, unit: 'cups', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop&auto=format' },

  // ── Drinks › Energy Drinks ───────────────────────────────────────────────────
  { id: 'dr5', section: 'Drinks', category: 'Energy Drinks', name: 'Energy Drink', price: 25, stock: 60, unit: 'cans', image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400&h=300&fit=crop&auto=format' },
];

function readJson<T>(file: string, fallback: T): T {
  const filePath = join(DATA_DIR, file);
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  const filePath = join(DATA_DIR, file);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function initProducts(): Product[] {
  const existing = readJson<Product[] | null>('products.json', null);
  if (!existing) {
    writeJson('products.json', SEED_PRODUCTS);
    return SEED_PRODUCTS;
  }
  return existing;
}

initProducts();

function initUsers(): void {
  const existing = readJson<User[] | null>('users.json', null);
  if (!existing) {
    // No default users – first user must be created via setup
    writeJson('users.json', []);
  }
}

initUsers();

export const db = {
  getProducts(): Product[] {
    return readJson<Product[]>('products.json', SEED_PRODUCTS);
  },
  saveProducts(products: Product[]): void {
    writeJson('products.json', products);
  },
  getOrders(): Order[] {
    return readJson<Order[]>('orders.json', []);
  },
  saveOrders(orders: Order[]): void {
    writeJson('orders.json', orders);
  },

  // ─── Users ──────────────────────────────────────────────────────────────
  getUsers(): User[] {
    return readJson<User[]>('users.json', []);
  },
  saveUsers(users: User[]): void {
    writeJson('users.json', users);
  },
  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  },
  getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  // ─── Settings ────────────────────────────────────────────────────────────
  getSettings(): AppSettings[] {
    return readJson<AppSettings[]>('settings.json', []);
  },
  saveSettings(settings: AppSettings[]): void {
    writeJson('settings.json', settings);
  },
  getSetting(key: string): AppSettings | undefined {
    return this.getSettings().find(s => s.key === key);
  },
  upsertSetting(key: string, value: string): AppSettings {
    const settings = this.getSettings();
    const existing = settings.findIndex(s => s.key === key);
    const entry: AppSettings = {
      id: existing >= 0 ? settings[existing].id : `set_${Date.now()}`,
      key,
      value,
      updatedAt: Date.now(),
    };
    if (existing >= 0) {
      settings[existing] = entry;
    } else {
      settings.push(entry);
    }
    this.saveSettings(settings);
    return entry;
  },

  // ─── Categories ──────────────────────────────────────────────────────────
  getCategories(): Category[] {
    return readJson<Category[]>('categories.json', []);
  },
  saveCategories(categories: Category[]): void {
    writeJson('categories.json', categories);
  },
  getCategoryById(id: string): Category | undefined {
    return this.getCategories().find(c => c.id === id);
  },
};
