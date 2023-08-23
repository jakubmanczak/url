import { Application, Router } from "https://deno.land/x/oak@v12.6.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

const app = new Application();
const r = new Router();
const dbpath = "./url.db";

const db = new DB(dbpath);
db.execute(`
  CREATE TABLE IF NOT EXISTS urls (
    id          TEXT NOT NULL UNIQUE,

    type        INTEGER DEFAULT 0,
    -- 0: 307 redirect
    -- 1: note
    
    content     TEXT
  );
`);
db.close();

app.addEventListener("listen", () => console.log("Running."));

r.get("/", async (ctx) => {
  await ctx.send({ root: Deno.cwd(), path: "./front/index.html" });
});
r.get("/style.css", async (ctx) => {
  await ctx.send({ root: Deno.cwd(), path: "./front/style.css" });
});

r.get("/:id", async (ctx) => {
  const db = new DB(dbpath);
  const query = db.prepareQuery(`SELECT * FROM urls WHERE id = :id`);
  const res = query.first({ id: ctx.params.id });
  query.finalize();
  db.close();
  if (!res) {
    ctx.response.status = 404;
    ctx.response.body = `No records found for id ${ctx.params.id}!`;
    return;
  }
  if ((res[1] as number) == 0 /* redirect */) {
    ctx.response.status = 307;
    ctx.response.redirect(res[2] as string);
  }
  if ((res[1] as number) == 1 /* note */) {
    await ctx.send({ root: Deno.cwd(), path: "./front/note.html" });
  }
});

r.get("/raw/:id", (ctx) => {
  const db = new DB(dbpath);
  const query = db.prepareQuery(`SELECT * FROM urls WHERE id = :id`);
  const res = query.first({ id: ctx.params.id });
  query.finalize();
  db.close();
  if (!res) {
    ctx.response.status = 404;
    ctx.response.body = `No records found for id ${ctx.params.id}!`;
    return;
  } else {
    ctx.response.body = res[2] as string;
  }
});

app.use(oakCors());
app.use(r.routes());
app.use(r.allowedMethods());
await app.listen({ port: 8080 });
