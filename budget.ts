/**
 * Budget Tracker — session-scoped cost tracking.
 *
 * Same pattern as the Synthetic subagent extension's budget.ts.
 * Tracks cumulative spend and warns at 80%/95%/100% of weekly budget.
 */

import { type OpenAgentConfig, displayModel } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetEntryData {
	sessionCost: number;
	requestCount: number;
	modelCosts: Record<string, number>;
}

export interface BudgetCheckResult {
	ok: boolean;
	warning?: string;
	percentUsed: number;
	sessionCost: number;
}

// ---------------------------------------------------------------------------
// BudgetTracker
// ---------------------------------------------------------------------------

export class BudgetTracker {
	private config: OpenAgentConfig;
	sessionCost: number = 0;
	requestCount: number = 0;
	modelCosts: Record<string, number> = {};

	constructor(config: OpenAgentConfig) {
		this.config = config;
	}

	recordCost(cost: number, modelId: string): void {
		this.sessionCost += cost;
		this.requestCount++;
		if (!this.modelCosts[modelId]) this.modelCosts[modelId] = 0;
		this.modelCosts[modelId] += cost;
	}

	check(estimatedCost: number): BudgetCheckResult {
		const projectedTotal = this.sessionCost + estimatedCost;
		const percentUsed = (projectedTotal / this.config.weeklyBudget) * 100;

		let warning: string | undefined;
		if (percentUsed >= 100) {
			warning = `Budget exceeded: $${projectedTotal.toFixed(2)} of $${this.config.weeklyBudget}/week (${percentUsed.toFixed(0)}%). This session has used $${this.sessionCost.toFixed(2)} across ${this.requestCount} requests.`;
		} else if (percentUsed >= 95) {
			warning = `Budget nearly exhausted: $${projectedTotal.toFixed(2)} of $${this.config.weeklyBudget}/week (${percentUsed.toFixed(0)}%).`;
		} else if (percentUsed >= 80) {
			warning = `Budget approaching limit: $${projectedTotal.toFixed(2)} of $${this.config.weeklyBudget}/week (${percentUsed.toFixed(0)}%).`;
		}

		return { ok: percentUsed < 100, warning, percentUsed, sessionCost: this.sessionCost };
	}

	toEntryData(): BudgetEntryData {
		return { sessionCost: this.sessionCost, requestCount: this.requestCount, modelCosts: { ...this.modelCosts } };
	}

	restoreFromEntry(data: any): void {
		if (!data || typeof data !== "object") return;
		this.sessionCost = typeof data.sessionCost === "number" ? data.sessionCost : 0;
		this.requestCount = typeof data.requestCount === "number" ? data.requestCount : 0;
		if (data.modelCosts && typeof data.modelCosts === "object") {
			this.modelCosts = { ...data.modelCosts };
		}
	}
}