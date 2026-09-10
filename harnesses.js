"use strict";

const { CODEX_PROMPTS, OPENCODE_PROMPTS } = require("./prompts.js");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9_-]{3,511}$/;
const SESSION = /^[^\u0000-\u001f\u007f]{1,4096}$/;
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SESSION_KINDS = new Set(["id", "path"]);
const GENERIC_PROMPTS = OPENCODE_PROMPTS;
const DEFAULT_QUIT = { keys: ["ctrl+c", "ctrl+c"] };

// Harnesses with a stable Herdr session source. Kinds without an integration
// (for example gemini, cline, kiro, amp, maki) are intentionally absent: Herdr
// reports no agent_session for them, so cleanup could not verify ownership.
const DEFINITIONS = [
  { kind: "codex", label: "Codex", source: "herdr:codex", prompts: CODEX_PROMPTS, quit: { prompt: "/quit" },
    archiveArgs: (sessionId) => ["archive", sessionId], supportsAutoAccount: true, envBin: "CODEX_BIN_PATH",
    sessionValue: (value) => UUID.test(value) },
  { kind: "opencode", label: "opencode", source: "herdr:opencode", prompts: OPENCODE_PROMPTS,
    quit: { prompt: "/exit", keys: ["ctrl+c"] }, archiveArgs: (sessionId) => ["session", "delete", sessionId],
    supportsModel: true, modelArgs: (model) => ["--model", model], defaultModel: "opencode-go/deepseek-flash",
    models: ["opencode-go/deepseek-flash", "opencode-go/glm-5.3-flash"], envBin: "OPENCODE_BIN_PATH",
    sessionValue: (value) => OPAQUE.test(value) },
  { kind: "claude", label: "Claude", source: "herdr:claude" },
  { kind: "cursor", label: "Cursor", source: "herdr:cursor" },
  { kind: "copilot", label: "Copilot", source: "herdr:copilot" },
  { kind: "devin", label: "Devin", source: "herdr:devin" },
  { kind: "droid", label: "Droid", source: "herdr:droid" },
  { kind: "kimi", label: "Kimi", source: "herdr:kimi" },
  { kind: "kilo", label: "Kilo", source: "herdr:kilo" },
  { kind: "mastracode", label: "Mastracode", source: "herdr:mastracode" },
  { kind: "pi", label: "Pi", source: "herdr:pi" },
  { kind: "omp", label: "OMP", source: "herdr:omp" },
  { kind: "qwen", label: "Qwen", source: "herdr:qwen" },
  { kind: "qodercli", label: "Qoder", source: "herdr:qodercli" },
  { kind: "grok", label: "Grok", source: "herdr:grok" },
  { kind: "hermes", label: "Hermes", source: "herdr:hermes" },
  { kind: "agy", label: "Antigravity", source: "herdr:antigravity_cli", integration: "antigravity-cli", binary: "agy" },
];

function buildHarness(definition) {
  return {
    kind: definition.kind,
    label: definition.label,
    source: definition.source,
    integration: definition.integration || definition.kind,
    binary: definition.binary || definition.kind,
    envBin: definition.envBin || null,
    supportsModel: false,
    models: [],
    defaultModel: "",
    supportsAutoAccount: false,
    sessionValue: (value) => typeof value === "string" && SESSION.test(value),
    startArgs(name, pane, options = {}) {
      const args = ["agent", "start", name, "--kind", definition.kind, "--pane", pane];
      const extra = [];
      if (options.model && definition.modelArgs) extra.push(...definition.modelArgs(options.model));
      if (options.autoAccount) extra.push("--auto-account");
      return extra.length ? [...args, "--", ...extra] : args;
    },
    quit: DEFAULT_QUIT,
    archiveArgs: null,
    prompts: GENERIC_PROMPTS,
    ...definition,
  };
}

const HARNESSES = Object.fromEntries(DEFINITIONS.map((definition) => [definition.kind, buildHarness(definition)]));
const DEFAULT_HARNESS = "codex";

function normalizeHarness(value) {
  const kind = String(value || DEFAULT_HARNESS).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(HARNESSES, kind) ? kind : null;
}

function getHarness(value) {
  const kind = normalizeHarness(value);
  return kind ? HARNESSES[kind] : null;
}

function harnessList(configured = {}, installed = null) {
  return Object.values(HARNESSES)
    .filter((harness) => !installed || installed.has(harness.integration))
    .map((harness) => {
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
    && SESSION_KINDS.has(session?.kind) && harness.sessionValue(session.value);
}

function modelValid(model) {
  return model === "" || model === undefined || model === null ? true : MODEL.test(model);
}

module.exports = { DEFAULT_HARNESS, getHarness, harnessList, modelValid, normalizeHarness, sessionMatches };
