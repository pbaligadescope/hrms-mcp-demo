// Deletes the demo database so it is re-seeded on the next request.
import { rm } from "fs/promises";
await rm(new URL("../data/db.json", import.meta.url), { force: true });
console.log("Demo data reset. It will be re-seeded on the next request.");
