/**
 * Dashboard Module - Public API
 * 
 * Provides the main dashboard page and context providers.
 * 
 * Architecture:
 * - Integration Layer: Orchestrates specialized modules (metrics, charts, activity, insights, assistant)
 * - Pure Composition: Top level page contains no logic, only layout and provider injection
 */

export { DashboardPage as default } from "./DashboardPage";
export { DashboardProviders } from "./core";
