import { PassThrough } from "stream";

import type { EntryContext } from "react-router-dom";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router-dom";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";

export const streamTimeout = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: any
) {
  return new Promise((resolve, reject) => {
    let _shellRendered = false;
    let userAgent = request.headers.get("user-agent");

    let readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          _shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          console.error("SSR onShellError:", error);
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          console.error("SSR onError:", error);
        },
      }
    );

    setTimeout(abort, streamTimeout + 1000);
  });
}
