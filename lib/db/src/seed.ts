import { db } from "./index";
import { products, categories } from "./schema";

const seedProducts = [
  {
    id: "br1",
    name: "White Bread",
    section: "Bakery",
    category: "Bread",
    image: "",
    stock: 50,
    unit: "loaves",
    price: "15.00",
  },
  {
    id: "br2",
    name: "Brown Bread",
    section: "Bakery",
    category: "Bread",
    image: "",
    stock: 30,
    unit: "loaves",
    price: "18.00",
  }
  // add the rest of your products
];

const seedCategories = [
  {
    id: "cat_bakery",
    section: "Bakery",
    name: "Bread",
    description: "Freshly baked bread products",
    sortOrder: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "cat_fastfood",
    section: "Fast Food",
    name: "Shawarma",
    description: "Delicious shawarma varieties",
    sortOrder: 2,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "cat_snacks_samosa",
    section: "Snacks & Pastries",
    name: "Samosa",
    description: "Crispy samosas with various fillings",
    sortOrder: 3,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "cat_snacks_dondos",
    section: "Snacks & Pastries",
    name: "Dondos",
    description: "Tasty dondos",
    sortOrder: 4,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "cat_drinks_soft",
    section: "Drinks",
    name: "Soft Drinks",
    description: "Carbonated soft drinks",
    sortOrder: 5,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "cat_drinks_water",
    section: "Drinks",
    name: "Water",
    description: "Bottled water",
    sortOrder: 6,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "cat_drinks_juices",
    section: "Drinks",
    name: "Juices",
    description: "Fresh fruit juices",
    sortOrder: 7,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "cat_drinks_energy",
    section: "Drinks",
    name: "Energy Drinks",
    description: "Energy drinks",
    sortOrder: 8,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

await db.insert(products).values(seedProducts).onConflictDoNothing();
await db.insert(categories).values(seedCategories).onConflictDoNothing();

console.log("Seed complete");
process.exit(0);

