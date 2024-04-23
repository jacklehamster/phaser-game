import Bao from "baojs";
import serveStatic from "serve-static-bun";
import fs from "fs";

const app = new Bao();

app.get("/config.json", async context => {
  const configText = fs.readFileSync('config.json', 'utf-8');
  const config = JSON.parse(configText);
  config.canEdit = true;

  return context.sendPrettyJson(config);
});

interface Payload {
  locked: boolean;
  jsonUrl: string;
  type: string;
  id: string;
  x: number; y: number;
  width: number; height: number;
  frame?: number;
}

app.get("/assets/*any", serveStatic("/", { middlewareMode: "bao" }));
app.get("/dist/*any", serveStatic("/", { middlewareMode: "bao" }));
app.get("/json/*any", serveStatic("/", { middlewareMode: "bao" }));
app.get("/", serveStatic("/", { middlewareMode: "bao" }));
app.post("/save", async context => {
  const payload: Payload = await context.req.json() as Payload;
  const mapText = fs.readFileSync(payload.jsonUrl, 'utf-8');
  const map = JSON.parse(mapText);

  map[payload.type] = map[payload.type] ?? {};
  // map[payload.type][payload.id] = [
  //   payload.x,
  //   payload.y,
  //   payload.width,
  //   payload.height,
  // ];
  map[payload.type][payload.id] = {
    x: payload.x,
    y: payload.y,
    width: payload.width,
    height: payload.height,
    frame: payload.frame,
  };

  fs.copyFileSync(payload.jsonUrl, payload.jsonUrl + ".bak");
  fs.writeFileSync(payload.jsonUrl, JSON.stringify(map, null, "\t"));

  return context.sendPrettyJson({
    success: true,
  });
})

const server = app.listen({ port: 3000 });
console.log(`Listening on http://localhost:${server.port}`);
