import { defineEventHandler, getMethod, setHeader } from "h3";

export default defineEventHandler((event) => {
  const { public: publicConfig } = useRuntimeConfig();
  const origin = publicConfig.corsOrigin || "*";

  setHeader(event, "access-control-allow-origin", origin);
  setHeader(
    event,
    "access-control-allow-methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  setHeader(
    event,
    "access-control-allow-headers",
    "content-type, authorization"
  );

  if (getMethod(event) === "OPTIONS") {
    event.node.res.statusCode = 204;
    return "";
  }
});
