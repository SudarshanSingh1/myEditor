import type { Config } from "@react-router/dev/config";
import routes from "./app/routes";

export default {
  ssr: true,
  appDirectory: "app",
  routes() {
    return routes;
  }
} satisfies Config;
