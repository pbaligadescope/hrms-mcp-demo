import { promises as fs } from "fs";
import path from "path";
import { seedData, type Db } from "./seed";

// A tiny JSON-file "database" so the portal and the MCP servers share the same data.
const DB_PATH = path.join(process.cwd(), "data", "db.json");

export async function readDb(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf8")) as Db;
  } catch {
    const fresh = seedData();
    await writeDb(fresh);
    return fresh;
  }
}

export async function writeDb(db: Db): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export async function resetDb(): Promise<void> {
  await writeDb(seedData());
}
