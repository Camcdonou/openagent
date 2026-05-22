/**
 * OpenAgent Configuration
 *
 * Types, defaults, and persistence for the OpenRouter subagent extension.
 * Config is stored in ~/.pi/agent/settings.json under the "openagent" key.
 *
 * No slot scheduler, no packs — OpenRouter doesn't enforce per-model
 * concurrency limits. Just models, costs, and a configurable max concurrency cap.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelTier = "power" | "fast";

export interface ModelConfig {
	cost: number;          // cost multiplier relative to 1.0 (for budget estimation)
	tier: ModelTier;       // capability tier (informational, not used for scheduling)
}

export interface OpenAgentConfig {
	models: Record<string, ModelConfig>;
	weeklyBudget: number;        // weekly budget in USD
	defaultModel: string;        // fallback when agent doesn't specify one
	maxConcurrency: number;      // max parallel subagent processes (practical limit)
}

// ---------------------------------------------------------------------------
// Default Model Map (OpenRouter)
// ---------------------------------------------------------------------------

export const DEFAULT_MODELS: Record<string, ModelConfig> = {
	"deepseek/deepseek-v4-flash": {
		cost: 0.15,
		tier: "power",
	},
};

export const DEFAULT_CONFIG: OpenAgentConfig = {
	models: { ...DEFAULT_MODELS },
	weeklyBudget: 24,
	defaultModel: "deepseek/deepseek-v4-flash",
	maxConcurrency: 8,
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const SETTINGS_DIR = path.join(os.homedir(), ".pi", "agent");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

function readSettingsJson(): Record<string, any> {
	try {
		const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
		return JSON.parse(content);
	} catch {
		return {};
	}
}

function writeSettingsJson(data: Record<string, any>): void {
	fs.mkdirSync(SETTINGS_DIR, { recursive: true });
	fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/**
 * Load openagent config from settings.json, falling back to defaults.
 */
export function loadConfig(): OpenAgentConfig {
	const settings = readSettingsJson();
	const raw = settings.openagent;
	if (!raw || typeof raw !== "object") {
		return { ...DEFAULT_CONFIG, models: { ...DEFAULT_MODELS } };
	}

	const config: OpenAgentConfig = {
		models: { ...DEFAULT_MODELS },
		weeklyBudget: typeof raw.weeklyBudget === "number" ? raw.weeklyBudget : DEFAULT_CONFIG.weeklyBudget,
		defaultModel: typeof raw.defaultModel === "string" ? raw.defaultModel : DEFAULT_CONFIG.defaultModel,
		maxConcurrency: typeof raw.maxConcurrency === "number" ? raw.maxConcurrency : DEFAULT_CONFIG.maxConcurrency,
	};

	// Override models if user has custom config
	if (raw.models && typeof raw.models === "object") {
		config.models = {};
		for (const [modelId, modelRaw] of Object.entries(raw.models as Record<string, any>)) {
			if (modelRaw && typeof modelRaw === "object") {
				config.models[modelId] = {
					cost: typeof modelRaw.cost === "number" ? modelRaw.cost : 1.0,
					tier: modelRaw.tier === "power" || modelRaw.tier === "fast" ? modelRaw.tier : "fast",
				};
			}
		}
	}

	return config;
}

/**
 * Save openagent config to settings.json.
 */
export function saveConfig(config: OpenAgentConfig): void {
	const settings = readSettingsJson();
	settings.openagent = {
		models: config.models,
		weeklyBudget: config.weeklyBudget,
		defaultModel: config.defaultModel,
		maxConcurrency: config.maxConcurrency,
	};
	writeSettingsJson(settings);
}

/**
 * Check if config has been set up (exists in settings.json).
 */
export function hasConfig(): boolean {
	const settings = readSettingsJson();
	return settings.openagent !== undefined && settings.openagent !== null;
}

/**
 * Resolve a model ID for pi's CLI.
 * OpenRouter models use the "openrouter/" prefix in pi.
 * E.g. "deepseek/deepseek-v4-flash" → "openrouter/deepseek/deepseek-v4-flash"
 */
export function resolveModelForCli(modelId: string): string {
	if (modelId.startsWith("openrouter/")) return modelId;
	return `openrouter/${modelId}`;
}

/**
 * Format a model ID for display (strip provider prefix).
 */
export function displayModel(modelId: string): string {
	// Strip "openrouter/" prefix if present
	const stripped = modelId.replace(/^openrouter\//, "");
	// Shorten common long names
	const parts = stripped.split("/");
	return parts[parts.length - 1];
}

/**
 * Format model summary for display.
 */
export function formatModelSummary(config: OpenAgentConfig): string {
	const lines: string[] = [];
	for (const [modelId, mc] of Object.entries(config.models)) {
		lines.push(
			`  ${displayModel(modelId)} — cost ${mc.cost} [${mc.tier}]`,
		);
	}
	return lines.join("\n");
}