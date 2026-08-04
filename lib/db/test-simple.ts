import { db } from "./src/index";
import { sql } from "drizzle-orm";

const result = await db.execute(sql`select 1 as test`);
console.log(result.rows);
process.exit(0);