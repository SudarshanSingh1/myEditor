import fs from "fs";
import path from "path";
import url from "url";
import express from "express";
import compression from "compression";
import morgan from "morgan";
import sourceMapSupport from "source-map-support";
import { createRequestHandler } from "@react-router/express";

sourceMapSupport.install({
  retrieveSourceMap: function (source) {
    let match = source.startsWith("file://");
    if (match) {
      let filePath = url.fileURLToPath(source);
      let sourceMapPath = `${filePath}.map`;
      if (fs.existsSync(sourceMapPath)) {
        return {
          url: source,
          map: fs.readFileSync(sourceMapPath, "utf8"),
        };
      }
    }
    return null;
  },
});

async function run() {
  const buildPath = path.resolve("build/server/index.js");
  const buildModule = await import(url.pathToFileURL(buildPath).href);
  const build = buildModule;

  const app = express();
  app.disable("x-powered-by");
  app.use(compression());

  // Serve static assets from build/client
  app.use(
    path.posix.join(build.publicPath, "assets"),
    express.static(path.join(build.assetsBuildDirectory, "assets"), {
      immutable: true,
      maxAge: "1y",
    })
  );
  app.use(build.publicPath, express.static(build.assetsBuildDirectory));
  app.use(express.static("public", { maxAge: "1h" }));
  app.use(morgan("tiny"));

  // CRITICAL: Any request for static assets under /assets/* or with static file extensions that was NOT found by express.static
  // MUST return 404 plain text and NEVER fall through to React Router SSR / SPA fallback!
  app.use(["/assets/*", "*.*"], (req, res) => {
    res.status(404).type("text/plain").send("Not Found");
  });

  app.all(
    "*",
    createRequestHandler({
      build: buildModule,
      mode: process.env.NODE_ENV || "production",
    })
  );

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST;

  const onListen = () => {
    console.log(`[production server] listening on port ${port}`);
  };

  const server = host ? app.listen(port, host, onListen) : app.listen(port, onListen);

  ["SIGTERM", "SIGINT"].forEach((signal) => {
    process.once(signal, () => server?.close(console.error));
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
