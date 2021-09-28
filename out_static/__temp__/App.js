var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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

// src/App.js
__export(exports, {
  default: () => App
});

// scripts/require.js
if (typeof window === "undefined") {
} else {
  window.require = function resolveVendorDependenciesAtRuntime(moduleName) {
    switch (moduleName) {
      case "react":
        return window["React"];
      case "react-dom":
        return window["ReactDOM"];
      case "react-dom/server":
        return window["ReactDOMServer"];
      default:
        throw new Error("Internal error");
    }
  };
}

// src/App.js
var import_react = __toModule(require("react"));
function App() {
  const [state, setState] = import_react.default.useState(0);
  return /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("span", null, state), /* @__PURE__ */ import_react.default.createElement("button", {
    onClick: (e) => setState(state - 1)
  }, "-"), /* @__PURE__ */ import_react.default.createElement("button", {
    onClick: (e) => setState(state + 1)
  }, "+"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
