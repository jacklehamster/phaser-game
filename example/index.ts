import Bao from "baojs";
import serveStatic from "serve-static-bun";
import fs from "fs";
import storage from "node-persist";
import { MD5 } from "bun";

// const OPEN_AI_URL = "http://localhost:3001/comment/";
const OPEN_AI_URL = "https://open-ai-npc.onrender.com/comment/";
const app = new Bao();

app.get("/config.json", async (context: any) => {
  const configText = fs.readFileSync('config.json', 'utf-8');
  const config = JSON.parse(configText);
  config.canEdit = true;
  config.canCallAI = true;

  return context.sendPrettyJson(config);
});

interface Payload {
  locked: boolean;
  jsonUrl: string;
  type: string;
  id: string;
  deleted?: boolean;
  item: {
    x: number; y: number;
    width: number; height: number;
    frame?: number;
  };
}

app.get("/cursor/*any", serveStatic("/", { middlewareMode: "bao", handleErrors: true }));
app.get("/assets/*any", serveStatic("/", { middlewareMode: "bao", handleErrors: true }));
app.get("/dist/*any", serveStatic("/", { middlewareMode: "bao", handleErrors: true }));
app.get("/json/*any", serveStatic("/", { middlewareMode: "bao", handleErrors: true }));
app.get("/", serveStatic("/", { middlewareMode: "bao", handleErrors: true }));
app.get("/favicon.ico", serveStatic("/", { middlewareMode: "bao", handleErrors: true }));
app.post("/lock", async (context: any) => {
  const payload: { jsonUrl: string; locked: boolean; } = await context.req.json() as { jsonUrl: string; locked: boolean };
  const mapText = fs.readFileSync(payload.jsonUrl, 'utf-8');
  const map = JSON.parse(mapText);
  map.locked = !!payload.locked;

  fs.writeFileSync(payload.jsonUrl, JSON.stringify(map, null, "\t"));

  return context.sendPrettyJson({
    success: true,
  });
});
app.post("/save", async (context: any) => {
  const payload: Payload = await context.req.json() as Payload;
  const mapText = fs.readFileSync(payload.jsonUrl, 'utf-8');
  const map = JSON.parse(mapText);

  //  console.log(payload);

  map[payload.type] = map[payload.type] ?? {};
  // map[payload.type][payload.id] = [
  //   payload.x,
  //   payload.y,
  //   payload.width,
  //   payload.height,
  // ];
  if (payload.deleted) {
    delete map[payload.type][payload.id];
  } else {
    map[payload.type][payload.id] = {
      ...payload.item,
    };
  }

  //  fs.copyFileSync(payload.jsonUrl, payload.jsonUrl + ".bak");
  fs.writeFileSync(payload.jsonUrl, JSON.stringify(map, null, "\t"));

  return context.sendPrettyJson({
    success: true,
  });
});

storage.init().then(() => {
  console.log("initialized storage");
  app.get("/ai", async (context: any) => {
    const situation = context.query.get("situation");
    const seed = context.query.get("seed");
    const model = context.query.get("model");
    const md5 = new MD5();
    md5.update(model ?? "");
    md5.update(seed ?? "");
    md5.update(situation ?? "");
    const tag = md5.digest("base64");
    const stored = await storage.getItem(tag);
    if (stored) {
      return context.sendJson(stored);
    }
    const queryParams = new URLSearchParams();
    if (model) {
      queryParams.set("model", model);
    }
    if (situation) {
      queryParams.set("situation", situation);
    }
    if (seed) {
      queryParams.set("seed", seed);
    }
    console.log("querying", queryParams.toString());
    const url = `${OPEN_AI_URL}?${queryParams.toString()}`
    const response = await fetch(url);
    const result = await response.json() as Record<string, any>;
    await storage.setItem(tag, result);
    console.log(result);

    return context.sendJson(result);
  });
});

const server = app.listen({ port: 3000 });
console.log(`Listening on http://localhost:${server.port}`);
