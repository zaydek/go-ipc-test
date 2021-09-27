var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var esbuild = __toModule(require("esbuild"));
var fs = __toModule(require("fs"));
var path = __toModule(require("path"));
const readline = (() => {
  async function* createReadlineGenerator() {
    const readlineImpl = require("readline").createInterface({ input: process.stdin });
    for await (const line of readlineImpl) {
      yield line;
    }
  }
  const generate = createReadlineGenerator();
  return async () => {
    return (await generate.next()).value;
  };
})();
function InternalError(returnType) {
  throw new Error("Internal Error");
  return returnType;
}
const NODE_ENV = process.env["NODE_ENV"] ?? InternalError("");
const RETRO_CMD = process.env["RETRO_CMD"] ?? InternalError("");
const RETRO_WWW_DIR = process.env["RETRO_WWW_DIR"] ?? InternalError("");
const RETRO_SRC_DIR = process.env["RETRO_SRC_DIR"] ?? InternalError("");
const RETRO_OUT_DIR = process.env["RETRO_OUT_DIR"] ?? InternalError("");
let vendorResult = null;
let clientResult = null;
const commonOptions = {
  bundle: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify(NODE_ENV),
    "process.env.RETRO_CMD": JSON.stringify(RETRO_CMD),
    "process.env.RETRO_WWW_DIR": JSON.stringify(RETRO_WWW_DIR),
    "process.env.RETRO_SRC_DIR": JSON.stringify(RETRO_SRC_DIR),
    "process.env.RETRO_OUT_DIR": JSON.stringify(RETRO_OUT_DIR)
  },
  entryNames: NODE_ENV !== "production" ? void 0 : "[dir]/[name]__[hash]",
  loader: { ".js": "jsx" },
  logLevel: "silent",
  metafile: true,
  minify: NODE_ENV === "production",
  outdir: RETRO_OUT_DIR,
  sourcemap: true
};
async function resolveRetroConfig() {
  try {
    await fs.promises.stat("retro.config.js");
  } catch {
    return {};
  }
  const retroConfigFilename = path.join(process.cwd(), "retro.config.js");
  return require(retroConfigFilename);
}
async function build() {
  const buildResult = {
    Metafile: {
      Vendor: null,
      Client: null
    },
    Warnings: [],
    Errors: []
  };
  const config = await resolveRetroConfig();
  try {
    vendorResult = await esbuild.build({
      ...commonOptions,
      entryPoints: {
        "vendor": path.join(__dirname, "scripts/vendor.js")
      }
    });
    buildResult.Metafile.Vendor = vendorResult.metafile;
    clientResult = await esbuild.build({
      ...commonOptions,
      ...config,
      define: {
        ...commonOptions.define,
        ...config.define
      },
      entryPoints: {
        "client": path.join(RETRO_SRC_DIR, "index.js")
      },
      external: [
        "react",
        "react-dom",
        "react-dom/server"
      ],
      incremental: NODE_ENV === "development",
      inject: [path.join(__dirname, "scripts/require.js")],
      loader: {
        ...commonOptions.loader,
        ...config.loader
      }
    });
    buildResult.Metafile.Client = clientResult.metafile;
    if (clientResult.warnings.length > 0) {
      buildResult.Warnings = clientResult.warnings;
    }
  } catch (caught) {
    if (caught.warnings.length > 0) {
      buildResult.Warnings = caught.warnings;
    }
    if (caught.errors.length > 0) {
      buildResult.Errors = caught.errors;
    }
  }
  return buildResult;
}
async function rebuild() {
  if (clientResult?.rebuild === void 0) {
    return await build();
  }
  const rebuildResult = {
    Metafile: {
      Vendor: null,
      Client: null
    },
    Warnings: [],
    Errors: []
  };
  try {
    const result2 = await clientResult.rebuild();
    if (result2.warnings.length > 0) {
      rebuildResult.Warnings = result2.warnings;
    }
  } catch (caught) {
    if (caught.warnings.length > 0) {
      rebuildResult.Warnings = caught.warnings;
    }
    if (caught.errors.length > 0) {
      rebuildResult.Errors = caught.errors;
    }
  }
  return rebuildResult;
}
async function main() {
  esbuild.initialize({});
  while (true) {
    const action = await readline();
    try {
      switch (action) {
        case "build":
          const buildResult = await build();
          console.log(JSON.stringify({
            Kind: "build-done",
            Data: buildResult
          }));
          break;
        case "rebuild":
          const rebuildResult = await rebuild();
          console.log(JSON.stringify({
            Kind: "rebuild-done",
            Data: rebuildResult
          }));
          break;
        default:
          throw new Error("Internal error");
      }
    } catch (error) {
      console.error(error.stack);
      process.exit(1);
    }
  }
}
main();
//# sourceMappingURL=backend.esbuild.js.map
