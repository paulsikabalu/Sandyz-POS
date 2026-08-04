import { db } from "./src/index";
import { products } from "./src/schema";

async function main() {
  const result = await db.select().from(products);
  console.log(result.length);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });