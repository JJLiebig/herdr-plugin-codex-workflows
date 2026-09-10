"use strict";

const { CODEX_PROMPTS, OPENCODE_PROMPTS } = require("./prompts.js");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_SESSION = /^[A-Za-z0-9][A-Za-z0-9_-]{3,511}$/;
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SESSION_KIND_ID = "id";

const HARNESSES = {
  codex: {
    kind: "codex",
    label: "Codex",
    source: "herdr:codex",
    binary: "codex",
    envBin: "CODEX_BIN_PATH",
    defaultModel: "",
    models: [],
    supportsModel: false,
    supportsAutoAccount: true,
    sessionValue: (value) => UUID.test(value),
    startArgs(name, pane, options = {}) {
      const args = ["agent", "start", name, "--kind", "codex", "--pane", pane];
      return options.autoAccount ? [...args, "--", "--auto-account"] : args;
    },
    quit: { prompt: "/quit" },
    archiveArgs: (sessionId) => ["archive", sessionId],
    prompts: CODEX_PROMPTS,
  },
  opencode: {
    kind: "opencode",
    label: "opencode",
    source: "herdr:opencode",
    binary: "opencode",
    envBin: "OPENCODE_BIN_PATH",
    defaultModel: "opencode-go/deepseek-flash",
    models: ["opencode-go/deepseek-flash", "opencode-go/glm-5.3-flash"],
    supportsModel: true,
    supportsAutoAccount: false,
    sessionValue: (value) => OPAQUE_SESSION.test(value),
    startArgs(name, pane, options = {}) {
      const args = ["agent", "start", name, "--kind", "opencode", "--pane", pane];
      return options.model ? [...args, "--", "--model", options.model] : args;
    },
    quit: { prompt: "/exit", keys: ["ctrl+c"] },
    archiveArgs: (sessionId) => ["session", "delete", sessionId],
    prompts: OPENCODE_PROMPTS,
  },
};

const DEFAULT_HARNESS = "codex";

function normalizeHarness(value) {
  const kind = String(value || DEFAULT_HARNESS).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(HARNESSES, kind) ? kind : null;
}

function getHarness(value) {
  const kind = normalizeHarness(value);
  return kind ? HARNESSES[kind] : null;
}

function harnessList(configured = {}) {
  return Object.values(HARNESSES).map((harness) => {
    const configuredModels = configured[harness.kind]?.models;
    const models = !harness.supportsModel ? []
      : Array.isArray(configuredModels) && configuredModels.length
        ? configuredModels.filter((model) => MODEL.test(model))
        : [...harness.models];
    const defaultModel = configured[harness.kind]?.["default-model"] || configured[harness.kind]?.defaultModel || harness.defaultModel;
    return {
      kind: harness.kind,
      label: harness.label,
      models,
      defaultModel: models.includes(defaultModel) ? defaultModel : models[0] || "",
    };
  });
}

function sessionMatches(harness, session) {
  return harness.source === session?.source
    && session?.kind === SESSION_KIND_ID && harness.sessionValue(session.value);
}

function modelValid(model) {
  return model === "" || model === undefined || model === null ? true : MODEL.test(model);
}

module.exports = { DEFAULT_HARNESS, getHarness, harnessList, modelValid, normalizeHarness, sessionMatches };
