<!--
 Copyright(c) 2026 The Rainway AI Gateway (壬远AI网关) Authors.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http: //www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 Copyright (c) 2021 The BFE Authors.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->
<!--
This changelog should always be read on `master` branch. Its contents on other branches
does not necessarily reflect the changes.
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [v0.11.0] - 2026-10-23

### Added

- AI cache rules module: collection-level rule table in view/edit dual mode (enter/exit edit, apply changes), per-rule semantic-cache toggle, and a global semantic settings tab (`top_k` / `threshold` / `threshold_relation`)
- Traffic mirror rules module: rule table with condition, mirror cluster, sample ratio, header strip and path rewrite, plus KV / body / header-injection drawers and the same view/edit dual mode
- Intent config module: global confidence threshold and question table (choice / score types, options 1–10) with a publish flow
- AI context compression module: single page with "compression rules" and "global settings" tabs, both in view/edit dual mode
- Batch tasks module (`/batches`): filter bar, primary-key cursor pagination, 6-column list, 70% detail drawer (basic info / status and counts / usage and billing / files and time / batch files) and cancel with confirmation; `batch` / `batch_file` operation-log resource types
- Key re-encryption module (`/security`): trigger area (`mode` / `scope` / `dry_run`), running-task banner with polling, history list with `created_by`, and a detail drawer
- Read-only system administrator role: `role` enum replaces `is_admin`, role switching via `PATCH /auth/users/{user_name}/role`, key masking on read endpoints, and write-action hiding across all pages
- EPP runtime parameters (`epp_runtime.check` / `timeout`) in the cluster EPP section, summarized on the review page
- Report: cache-hit / mirror-hit / intent metric cards, `cache_tokens` series, `ai_intent_answer` / `ai_cache_status` / `mirror_hit` dimensions, 3 detail columns, 5 filters and 9 detail fields, plus chart dimension drill-down
- Entity organization "level" column with level filter and numeric sorting
- Batch limits on API Key / Entity, model price batch discount (`batch_discount`, `mode=batch`), cluster upstream-error normalization, and user reserved names / password strength rules
- Runtime branding directory (`branding.json` + `favicon.ico`): `title` / `titleEn` / `favicon` configurable after deploy without rebuilding
- Rule modules: drag-and-drop row ordering, unsaved-change leave guard and row copy; route-table list defaults to the "enabled" filter
- Description length validation counts UTF-8 bytes instead of characters across certificates, clusters, Entities and Entity types (Entity type limit tightened from 1024 to 255 bytes), with control characters rejected and a permanent hint under the field
- AI cache rules: the expression (condition) must be unique within the rule set, checked on local save and again before applying, with messages aligned to the backend 422 response
- Generic `CursorPager` component for primary-key cursor APIs: first / previous / next, a "page N · M rows" indicator, and a disabled state while a request is in flight
- User manual: new AI cache, traffic mirror, intent config, AI context, batch tasks and key re-encryption chapters (20 chapters in total)

### Changed

- Provider instance source: manual instance pool vs K8s pool (`k8s_pool_name`); K8s mode only accepts a pool name, and the mirrored pool is read-only in the detail view
- EPP allocation collapsed to instance groups with exactly one instance each: the assignment list shows "N / 1" and drops the primary / backup / degraded columns and the override selector
- Batch task list trimmed from 12 to 6 columns (provider, API Key ID, Entity ID, usage, reserved and settled amounts moved into the detail drawer); the request-count help icon is now a real tooltip and the detail drawer no longer shows field-level "?" icons
- Batch task paging: page size raised from 20 to 50, requests use the last applied filter snapshot, out-of-order responses are ignored, and an empty page after the last one falls back to the previous page
- Expression condition primitives aligned with BFE v1.8.9-dev (`time_weekday_in`, `req_ai_intent_in`) and grouped by stage
- Cluster EPP parameters reworked: `load_profile` / `affinity` renames, waiting / running request limits, `fallback_on_empty` and metrics staleness; flow-control eviction locked to disabled
- Report overview drops three never-wired filters; report detail content completed; route-table type column maps `api_key` to "API-Key"
- Report: the "模型" filter is renamed "目标模型"; options come from the models each cluster actually serves (`llm_config.models`) instead of request aliases, and the ranking chart label follows (#129)
- Route rules: target and fallback lists are deduplicated independently, so the same cluster + model combination may appear in both (#128)
- Rule tables: rows show a grab / grabbing cursor while drag-to-reorder is available
- User manual reordered and expanded to 20 chapters, screenshots refreshed, design docs and modification records synced

### Fixed

- Provider edit drawer did not show the previously configured instance source (#125)
- Provider "Discover models" button stayed permanently disabled because it read an undefined instance-pool source
- Read-only mode leaked write buttons after list filtering; table rows kept `draggable="true"` after leaving edit mode; re-encryption dry-run reset still sent `dry_run=false`; enum filters compared rendered labels; route-table detail fell back to the raw `api_key` enum
- API Key / Entity batch limits could not be saved when they were the only rate-limit rule
- Intent config navigation was missing the unsaved-change guard
- Batch task status and settlement-status tags used `type` where `Tag` expects `color`, which raised Vue prop warnings

## [v0.0.10] - 2026-09-23

### Added

- Data Report module: new `/report` resource with a shared global filter bar (time range, model, API key, provider, host, streaming, status code, plus quick ranges) and two tabs — **Overview** (5 metric cards and 6 ECharts charts) and **Detail** (server-side paginated log table with expandable rows and its own request-model / errors-only / error-keyword filters)
- `Echarts` wrapper component backing the Data Report charts; charts resize with the window and are destroyed and rebuilt on tab switch
- Model Provider protocol path mapping (`protocol_paths`): key/value table in the create/edit drawer (protocol + upstream base path) with per-row add/remove and validation (protocol must be one of the provider's model protocols; path must start with `/`, must not end with `/`, and must not contain `?`, `$`, `#` or `..`), plus a read-only mapping card in the provider detail view
- Model Provider model list is now required; empty lists and duplicate model names are rejected on submit
- Entity organization `description`: searchable and sortable list column, optional create/edit field (max 255 characters, control characters rejected), and a row in the detail view
- EPP scheduling: at most 2 instances per group (primary + backup); instance rows expand on click to show key details
- User manual (zh-cn): new Data Report chapter; provider protocol path mapping rules rewritten; Entity description documented

### Changed

- Model Prices list defaults to 50 rows per page, with page size options 20/50/100/200/500/1000
- `pageTable` keeps the filter row table and the data table horizontally in sync while scrolling
- Cluster gateway config: session-affinity header simplified to a single column (no visual change)
- User manual chapters renumbered after the AI gateway instance pool chapter was removed (now 03–14); navigation tree, overview and `develop.md` synced
- Refreshed provider screenshots (list, upsert, detail, pricing tiers) for protocol path mapping and the required model list
- Expanded i18n for `report`, protocol path mapping, Entity description and EPP pool limits (en/zh)

### Removed

- AI gateway instance pool module: `AIInstancePool` page, `instance-pool-ai` route, sidebar icons, prototype page and design docs
- User manual: AI gateway instance pool chapter and certificate management chapter (the certificate module itself is unchanged)

### Dependencies

- Upgraded `axios` ^1.6.0 → ^1.20.0, `lodash` ^4.17.21 → ^4.18.1 and `uuid` ^8.2.0 → ^11.1.1
- Added `echarts` ^5.6.0 for the Data Report charts
- Regenerated `package-lock.json`

## [v0.0.9] - 2026-09-10

### Added

- Certificate management: list, create drawer (PEM upload + expiry preview), default selector, and delete guard
- Operation logs module: time-range filter, pagination, column search, and detail drawer with before/after JSON diff
- EPP scheduling module: instance pool management (group CRUD, full-replace) and assignment view (statistics, allocation table, manual override)
- Cluster wizard step 4: balance mode config (WRR / EPP) with instance-pool group binding and flow-control settings
- Gemini protocol support: `x-goog-api-key` auth header, default model-list URI `/v1beta/models`
- Model pricing: 10 new price keys (1h cache, 256k/272k/512k long-context tiers, image/audio token costs)
- User manual (zh-cn): new chapter 06 (EPP scheduling) with screenshots; chapters renumbered (05A→06, 06–14→07–15); chapters 04/05/07 updated

### Changed

- Certificate create form aligned with OpenAPI; default switch uses `PATCH`; validation aligned with API rules
- Model price inputs accept scientific notation; merge preserves previously-saved keys
- Cluster review/detail display balance mode and EPP settings
- Manual reading guide, navigation tree, and `develop.md` synced to renumbered chapters
- Expanded i18n for `cert`, `operationLogs`, `eppSchedule`, balance mode, gemini, and price keys (en/zh)

## [v0.0.8] - 2026-08-30

### Added

- Model Provider module: new `/providers` resource with list, create/edit/view drawers, instance pool, model protocols, model discovery endpoint, auth keys, and model list; clusters reference providers via `llm_config.provider` instead of maintaining instance pools locally
- Provider model discovery: stateless `POST /providers/tools/discover-models` replaces legacy `tools/get-models-from-provider`; models are fetched from the current form and persisted only on submit
- Provider pricing tiers: independent drawer for peak busy-hour schedules (`time_zone` + weekday/time ranges) via `PUT /providers/{name}/pricing-tiers`, with IANA timezone validation
- Provider list shortcuts: **Query model prices** navigates to Model Prices filtered by `provider` and auto-opens the first matching record
- Model pricing tier prices: create/edit/detail views now support required default `prices` plus optional `tier_prices.peak` for time-based rates aligned with provider pricing tiers
- Cluster Key affinity: `key_affinity` (enable, idle TTL, penalty, Redis prefix) in LLM config for session-bound key routing
- Route expression primitives: `req_body_json_prefix_in` for JSON body field prefix matching; `req_body_larger_than` / `req_body_less_than` for Content-Length based matching
- User manual v0.0.8: new Model Provider chapter, updated AI Business Cluster (5-step wizard), model pricing tier docs, and refreshed screenshots for chapters 04–11

### Changed

- Cluster wizard simplified from 6 steps to 5: removed the instance-pool step; instance pools are owned by Model Provider; cluster create/update payloads no longer include `instance_pool`
- Cluster LLM config refactor: select **provider** to load forward models and key names; keys table stores `name` + `weight` only (no key plaintext); removed `provider_type` and embedded `model_endpoint`
- `InstancePool.vue` reused by Model Provider; duplicate `addr:port` rows are highlighted and blocked on submit
- API Key rate-limit rules: TPM/RPM rule names follow `RateLimitRuleNameRegCheck`; persisted rule names are read-only in the form
- Model Prices list accepts `provider` and `autoView` query params for deep-linking from the provider list
- Expanded i18n coverage for providers, pricing tiers, tier prices, key affinity, and route body expressions (en/zh)

### Fixed

- Instance pool duplicate address/port validation and visual feedback (#85)

### Removed

- Legacy model-provider-types module and `tools/get-models-from-provider` consumption path

## [v0.0.7] - 2026-08-19

### Added

- Model pricing module: new `ModelPrices` module with list (server-side pagination and filters), detail, create/edit, YAML import, routing, menu icon, and i18n coverage
- Route rule fallbacks: forms, detail views, and submissions now persist `fallbacks`; added cross `targets` / `fallbacks` duplicate validation for `(cluster_name, model)` combinations
- Route expression primitive `req_body_json_prefix_in` for matching JSON body field prefixes (e.g. OpenRouter `openrouter/` model prefix)
- Cluster LLM multi-key weighted routing: `llm_config` supports `keys` (name/key/weight) and `key_policy` (strategy/max_retries/retry_backoff)
- Cluster LLM price-table binding and prefix handling: `provider` for pricing lookup; `match_prefix` / `strip_prefix` for aggregated providers (e.g. OpenRouter); review and detail views display these fields
- API-Key / Entity RMB quota: `quota_plan.unit` supports `RMB`; cap 90,000,000.00 with 4-decimal display; reset quota dialog respects unit and cap
- `pageTable` server-side pagination: `server-pagination` with `total`/`currentPage`/`pageSize` and `on-page-change`/`on-search-change`; used by route tables and model pricing

### Changed

- Route rule field naming aligned to OpenAPI snake_case: `Cond`/`ClusterName`/`Model`/`Weight` → `cond`/`cluster_name`/`model`/`weight`

### Fixed

- Cluster instance ports now sync with the http/https schema when fetching models and submitting cluster config
- Model pricing duplicate-combination validation no longer false-positives when the backend returns an empty object or empty list
- Model pricing upsert now rejects negative `limits` (must be non-negative integers) and negative `prices`

## [v0.0.6] - 2026-08-06

### Added

- Route Table module: unified route table management with Global/Entity/API-Key table types, list and detail views, enable/disable toggle, and inline edit mode for route rules
- Weighted routing and fallback: multi-target clusters with weight allocation (weights must sum to 100), fallback cluster and model configuration, and transparent model transmission
- Design documentation: added `design-docs` covering prototype pages, system design (architecture, modules, routing, state, i18n, components, OpenAPI mapping, build & deployment) and per-module detail documents
- Stricter input validation: tightened cluster name, username, password, and token name rules (length limits, leading/trailing characters, reserved names) and added hostname validation utility
- Expanded i18n coverage: added English and Chinese translations for route table, weighted routing, and validation hints

### Changed

- Route management refactor: aligned with the new OpenAPI; replaced legacy Default Route Rule and Advance Route Rule modules with the Route Table module, and updated router paths (`router`/`ai-rule` replaced by `route-tables`)
- Cluster wizard alignment: unified default values and API payload formatting for basic config, timeout, and passive health check; health check host now defaults to the first instance in the instance pool when left blank
- Instance pool restructure: instance entries now use address/port/weight with inline editing; weight range adjusted to 0-100; provider domain also accepts IP addresses; at least one instance must have a weight greater than 0
- Session persistence simplified from instance/sub-cluster levels to a single session sticky toggle
- `pageTable` sorting enhanced to support nested (dot-notation) field keys with immutable sorting
- API Key form: entity selector is now clearable

### Fixed

- Fixed validation and interaction issues in route table rule forms (duplicate rule names, duplicated target/fallback cluster-model combinations)
- Fixed interaction and formatting issues in cluster basic config and gateway config forms
- Fixed sorting behavior in `pageTable` for nested field data

## [v0.0.5] - 2026-07-24

### Added

- Reduced module scope: removed legacy modules including GSLB, Domains, SubClusters, AIClusters, and the old Instance Pool to streamline the product around AI gateway core workflows
- List filtering: added filtering capabilities to key list views for easier data discovery
- IPv6 CIDR support: enhanced utility functions to support IPv6 CIDR parsing, expansion, and comparison
- Consumer management enhancements: improved Entity create/edit/view flows and hierarchical organization support
- API Key enhancements: refined API Key list, detail, and upsert components with better quota and rate-limit handling
- Expanded i18n coverage: updated English and Chinese translations for consumer, cluster, and route management

### Changed

- Navigation/sidebar reorganization: simplified sidebar navigation to focus on Resource, Route, Consumer, User, and AI Gateway Instance Pool
- Router path updates: updated router paths; removed deprecated routes and set the default landing page to product.home
- Component consolidation: merged and simplified cluster-related components (GatewayConfig, InstancePool, Review, Scheduler, etc.)
- UI refresh: updated theme styles and sidebar layout
- Code cleanup: removed deprecated modules and related assets

### Fixed

- Fixed multiple interaction issues in gateway configuration and route rule forms
- Fixed request-layer error handling and response processing
- Addressed UI rendering issues in pageTable and sidebar navigation
- Fixed login and authorization edge cases

## [v0.0.4] - 2026-07-15

### Added

- **Certificate management** module
- Grouped model selector (Entity & API Key)
- LLM models display in cluster review
- Instance pool and domain validation
- Certificate user guide and expanded i18n (en/zh)

### Fixed

- Route rules empty filter submission
- `pageTable` search compatibility
- Gateway config model list when editing
- Certificate sidebar nav icon
- Entity parent selector clear behavior

### Changed

- Entity & API Key: grouped model selectors, description limit 1024
- Entity type list column and validation tweaks
- Quota and rate limit validation (INT64 bounds, field-level checks)
- AI business cluster list action button order
- Minor UI and docs updates

## [v0.0.3] - 2026-07-08

### Added

- Consumer management: **Entity** module with Entity type management and Entity organization management (hierarchical parent/child, model allow/block lists, quota plan, rate limit policy)
- API Key management enhancements: detail view, quota plan configuration, rate limit policy (TPM/RPM/max concurrency), Entity mounting, and manual quota reset
- Expanded i18n coverage for consumer management, navigation labels, and form validation messages (en/zh)
- User guide restructure: consumer management, resource management, route management, and user management docs with updated screenshots

### Fixed

- Request layer error handling and response parsing improvements
- Gateway config and route rules interaction issues

### Changed

- Navigation/sidebar reorganized around resource, route, consumer, and user management
- Router paths updated for AI gateway instance pool (`instance-pool-ai`) and AI gateway cluster (`ai-clusters`)
- `pageTable` component enhanced (search, sort, rendering)
- Theme styles (`public.less`) and login page UI refreshed
- README and development docs updated to reflect current module layout

### Dependencies

- Updated `package-lock.json` with toolchain and transitive dependency bumps

## [v0.0.2] - 2026-05-08

AI Gateway Web v0.0.2 — Instance pool & build refresh. Focuses on EPP instance pool details, clearer error handling, a Webpack/Babel toolchain upgrade (NoahV removed), and dependency/security updates, plus UI/i18n tweaks.

### Added

- Instance pool detail view with EPP domain and endpoint (IP) lists
- Related routing updates

### Fixed

- Error / response handling in AI route rules and gateway config
- Code scanning issue (inefficient regex)

### Changed

- Build: NoahV removed; Webpack & Babel config modernized; docs/scripts updated
- Request layer, theme (Less), i18n (en/zh), and copyright header order adjusted

### Dependencies

- Bumped toolchain and transitive deps (e.g. webpack-related packages, url-parse, qs, express, less, and others)

## [v0.0.1] - 2026-02-10

### Added

- Initial released version
- Resource management: gateway domains, instance pools, clusters; LLM resources (instance pool/sub-cluster/cluster)
- Routing management: URL/Path/Header match, model name based routing, default rule
- Consumer management: API Key lifecycle with model allowlist, token quota, expiry, IP whitelist
- User & access: system/tenant views, user management, token management

[v0.11.0]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.11.0
[v0.0.10]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.10
[v0.0.9]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.9
[v0.0.8]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.8
[v0.0.7]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.7
[v0.0.6]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.6
[v0.0.5]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.5
[v0.0.4]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.4
[v0.0.3]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.3
[v0.0.2]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.2
[v0.0.1]: https://github.com/rainway-ai-gateway/ai-gateway-web/releases/tag/v0.0.1
