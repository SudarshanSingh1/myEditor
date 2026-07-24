import { type RouteConfig, index, route } from "@react-router/dev/routes";

const ROUTES = [
  "online-cpp-compiler",
  "online-python-compiler",
  "online-java-compiler",
  "online-c-compiler",
  "online-javascript-editor",
  "online-typescript-playground",
  "online-go-compiler",
  "online-rust-compiler",
  "online-php-compiler",
  "online-kotlin-compiler",
  "online-swift-compiler",
  "cloud-ide",
  "browser-ide",
  "online-code-editor"
];

export default [
  ...ROUTES.map(r => route(r, "routes/_marketing.$lang.tsx", { id: r })),

  // catch-all fallback for existing SPA routes (login, app, admin)
  route("*?", "routes/index.tsx"),
] satisfies RouteConfig;
