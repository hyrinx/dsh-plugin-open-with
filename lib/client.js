window.__ModuleLoader__.load({
	id: "dsh-plugin-open-with",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		/** Browser-relative form of {@link OPEN_WITH_SETTINGS_PATH}. */
		const OPEN_WITH_SETTINGS_ROUTE = "/open-with/settings".slice(1);
		/** Browser-relative form of {@link OPEN_WITH_ICON_PREFIX_PATH}. */
		const OPEN_WITH_ICON_PREFIX_ROUTE = "/open-with/icon".slice(1);
		/** Browser-relative form of {@link OPEN_WITH_OPEN_PATH}. */
		const OPEN_WITH_OPEN_ROUTE = "/open-with/open".slice(1);
		/** Browser-relative form of {@link OPEN_WITH_LOG_PATH}. */
		const OPEN_WITH_LOG_ROUTE = "/open-with/log".slice(1);
		/** Browser-relative form of {@link OPEN_WITH_BUILTINS_PATH}. */
		const OPEN_WITH_BUILTINS_ROUTE = "/open-with/builtins".slice(1);
		/** Default placement: the right-hand utilities cluster, beside DSH's own controls. */
		const DEFAULT_PLACEMENT = "utilities";
		/** Inclusive lower bound accepted for a persisted slot order. */
		const ORDER_MIN = -100;
		/**
		* The seed menu entries, in default order.
		*
		* These carry no privileges. Their `path` is a bare command name only as a
		* starting point: the host resolves it into an absolute executable path the
		* first time it writes a document, and from then on every entry is an ordinary
		* item the settings page can rename, re-target, hide, and remove.
		*/
		const DEFAULT_ITEMS = [
			{
				id: "explorer",
				name: "Explorer",
				path: "explorer"
			},
			{
				id: "cmd",
				name: "Command",
				path: "cmd",
				passCwd: false
			},
			{
				id: "powershell",
				name: "PowerShell",
				path: "powershell",
				passCwd: false
			},
			{
				id: "code",
				name: "VS Code",
				path: "code"
			}
		];
		/** The settings document used before one has ever been written. */
		function defaultSettings() {
			return {
				currentId: DEFAULT_ITEMS[0].id,
				items: DEFAULT_ITEMS.map((item) => ({ ...item })),
				hiddenIds: [],
				placement: DEFAULT_PLACEMENT,
				order: 0
			};
		}
		/**
		* Narrow one persisted placement value.
		* @param value - any value read from the settings file.
		* @returns the value when legal, else null.
		*/
		function normalizePlacement(value) {
			return value === "actions" || value === "utilities" ? value : null;
		}
		/**
		* Coerce one persisted slot order into the accepted range.
		* @param value - any value read from the settings file.
		* @returns a rounded, clamped integer, or null when the value is unusable.
		*/
		function normalizeOrder(value) {
			if (typeof value !== "number" || !Number.isFinite(value)) return null;
			return Math.min(100, Math.max(ORDER_MIN, Math.round(value)));
		}
		/** Narrow one persisted item value into a complete {@link OpenWithItem}. */
		function normalizeItem(raw) {
			if (raw === null || typeof raw !== "object") return null;
			const source = raw;
			if (typeof source.id !== "string" || source.id.length === 0) return null;
			if (typeof source.name !== "string") return null;
			return {
				id: source.id,
				name: source.name,
				path: typeof source.path === "string" ? source.path : "",
				...source.passCwd === false ? { passCwd: false } : {}
			};
		}
		/**
		* Coerce any persisted value into a complete settings document.
		*
		* The file may come from an older version, be hand-edited, or be truncated, so
		* every field is validated independently: a malformed item is dropped, a stale
		* `currentId` falls back to the first item, an unknown `placement` falls back to
		* the default, and an out-of-range `order` is clamped (a missing one takes
		* {@link DEFAULT_ORDER}).
		*
		* Missing items are never restored: every entry is a plain item, so removing
		* one has to survive the next read. Only a document that does not exist at all
		* falls back to {@link defaultSettings}, which the host seeds.
		* @param raw - the settings file parsed as JSON, or null when it does not exist.
		* @returns a document that is safe to persist and render.
		*/
		function normalizeSettings(raw) {
			if (raw === null || typeof raw !== "object") return defaultSettings();
			const source = raw;
			const items = Array.isArray(source.items) ? source.items.map(normalizeItem).filter((item) => item !== null) : [];
			return {
				currentId: typeof source.currentId === "string" && items.some((item) => item.id === source.currentId) ? source.currentId : items[0]?.id ?? "",
				items,
				hiddenIds: Array.isArray(source.hiddenIds) ? source.hiddenIds.filter((id) => typeof id === "string") : [],
				placement: normalizePlacement(source.placement) ?? "utilities",
				order: normalizeOrder(source.order) ?? 0
			};
		}
		//#endregion
		//#region src/client/controller.ts
		/**
		* Browser-side HTTP carrier for the capsule button and the settings page.
		*
		* Every read, write, and launch is one request against the host routes; there
		* is no client-side cache, so the menu and the settings page always show the
		* document the host actually holds.
		*/
		/** Render an arbitrary log payload value as JSON-safe data. */
		function serialize(extra) {
			if (extra instanceof Error) return {
				name: extra.name,
				message: extra.message,
				stack: extra.stack
			};
			return extra;
		}
		/** Narrow the builtins route payload into rows the page can render. */
		function readBuiltins(raw) {
			const source = raw !== null && typeof raw === "object" ? raw : {};
			const reason = source.readOnlyReason;
			return {
				available: source.available === true,
				present: source.present === true,
				enabled: source.enabled === true,
				readOnly: source.readOnly === true,
				...reason === "management-required" || reason === "unaddressable" ? { readOnlyReason: reason } : {}
			};
		}
		/** The answer a 404 stands for: the host half predates this route, so a reload is due. */
		const STALE_BUILTINS = {
			available: false,
			stale: true,
			present: false,
			enabled: false,
			readOnly: false
		};
		var OpenWithController = class {
			fetcher;
			/**
			* @param fetcher - HTTP carrier; injectable so tests can drive it directly.
			*/
			constructor(fetcher = (input, init) => fetch(input, init)) {
				this.fetcher = fetcher;
			}
			/**
			* Read the settings document.
			* @returns the host's normalized document.
			*/
			async load() {
				const response = await this.fetcher(OPEN_WITH_SETTINGS_ROUTE, { headers: { accept: "application/json" } });
				if (!response.ok) throw new Error(`settings read failed: HTTP ${String(response.status)}`);
				return { settings: normalizeSettings((await response.json()).settings) };
			}
			/**
			* Replace the settings document.
			* @param settings - the document to persist.
			* @returns the host's normalized document.
			*/
			async save(settings) {
				const response = await this.fetcher(OPEN_WITH_SETTINGS_ROUTE, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ settings })
				});
				if (!response.ok) throw new Error(`settings write failed: HTTP ${String(response.status)}`);
				return normalizeSettings((await response.json()).settings);
			}
			/**
			* Launch one item on one workspace directory.
			* @param target - item id from the settings document.
			* @param path - the session's absolute workspace directory.
			* @returns after the host accepted the launch; rejects on any failure.
			*/
			async launch(target, path) {
				const body = {
					target,
					path
				};
				const response = await this.fetcher(OPEN_WITH_OPEN_ROUTE, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				});
				if (response.ok) return;
				let detail = "";
				try {
					detail = ` ${JSON.stringify(await response.json())}`;
				} catch {}
				throw new Error(`launch failed: HTTP ${String(response.status)}${detail}`);
			}
			/**
			* Read the enablement of DSH's own open-in-app pair.
			* @returns the merged state, or `available: false` when this profile exposes no plugin manager.
			*/
			async loadBuiltins() {
				const response = await this.fetcher(OPEN_WITH_BUILTINS_ROUTE, { headers: { accept: "application/json" } });
				if (response.status === 404) return STALE_BUILTINS;
				if (!response.ok) throw new Error(`builtin read failed: HTTP ${String(response.status)}`);
				return readBuiltins(await response.json());
			}
			/**
			* Switch both built-in halves on or off together.
			* @param enabled - whether the pair should run.
			* @returns the host's refreshed state.
			*/
			async setBuiltin(enabled) {
				const body = { enabled };
				const response = await this.fetcher(OPEN_WITH_BUILTINS_ROUTE, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				});
				if (response.status === 404) return STALE_BUILTINS;
				if (!response.ok) {
					let detail = "";
					try {
						detail = ` ${JSON.stringify(await response.json())}`;
					} catch {}
					throw new Error(`builtin toggle failed: HTTP ${String(response.status)}${detail}`);
				}
				return readBuiltins(await response.json());
			}
			/**
			* Mirror one line into the browser console and the host log file.
			* @param level - log level.
			* @param message - the line.
			* @param extra - optional structured detail.
			*/
			log(level, message, extra) {
				const detail = serialize(extra);
				const consoleLine = `[open-with] ${message}`;
				if (level === "error") console.error(consoleLine, detail);
				else if (level === "warn") console.warn(consoleLine, detail);
				else console.log(consoleLine, detail);
				const body = {
					level,
					message,
					...detail === void 0 ? {} : { extra: detail }
				};
				this.fetcher(OPEN_WITH_LOG_ROUTE, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				}).catch(() => {});
			}
		};
		//#endregion
		//#region src/client/settings-events.ts
		const listeners = /* @__PURE__ */ new Set();
		/** 最近一次发布的文档；从未发布过时为 null。 */
		let latest = null;
		/** 发布次数；图标 URL 用它破除缓存。 */
		let revision = 0;
		/**
		* 订阅设置变更。
		* @param listener - 每次发布调用一次，参数为 host 归一化后的文档。
		* @returns 取消订阅的函数。
		*/
		function subscribeSettings(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		/**
		* 发布一份新文档。
		*
		* 先复制订阅者列表再遍历：订阅者在自己回调里退订是合法写法，直接遍历原始
		* 集合会让那次删除改变本次分发的剩余项。
		* @param settings - host 归一化后的文档。
		*/
		function publishSettings(settings) {
			latest = settings;
			revision += 1;
			for (const listener of [...listeners]) listener(settings);
		}
		/**
		* 最近一次发布的文档。
		* @returns 文档，或从未发布过时的 null。
		*/
		function latestSettings() {
			return latest;
		}
		/**
		* 图标 URL 的缓存破除标记。
		*
		* 图标路由按 id 寻址，而 id 在编辑路径时并不改变，于是 `<img>` 的 src 保持
		* 原样、浏览器也乐得沿用上一次的字节。把它拼进查询串，每次发布都换一个 URL，
		* 图标才会跟着新路径重新取。
		* @returns 单调递增的发布计数。
		*/
		function settingsRevision() {
			return revision;
		}
		//#endregion
		//#region src/client/fallback-icon.ts
		/** Shared fallback asset for an item whose icon the host cannot serve. */
		const FALLBACK_ICON_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKDSURBVFhH7ZZJyI1xFMZ/yJQpMmRhDkkplCglWSAiUaadDSVDlI2FhZAyFAsbCSkiYqGQDBEbU4ayMC1E5qnMUw/nvY7j3O/e78PuPnW63TM9533P//zPCzXU8H/QEhgXlQ1FE6At0ML+K/kMYB9wF7gCdAoxc4A7Ftsg9Ac2AteA98AX4DPwBHgFfHMyJgYD28y2C+gajYbewLSoVMVrjcyT1CUjYxJgj7O/AcaavjMwHJgF3Ad2+yCR708IKsljYKJPBKwOPjeB9cCnoF/ug1YmyasVtWixyzUs8YmiGLX6BwYAHxOn+shXYJkrYnvi42WD8y0dmr8VFbHAcjYHdiQ+asMaPyFN3cl+av16lgRWKypihRGMcPpbwDygx6/n/onB5nAKaGw6/fa1vl5PSCKh7oJY9AXgiPt/OPCWMMUczkSDQcXo4nmQkEtuA4PssqprirbExAWmm8NDoFE0OnQEjieJP9iB0+2ndp5NfCRzY8IC451Tz2gMaAYcSJLr7Swyn35lJmpgyFWCZrFwWhiNCbQTziUE6rnekt7CxWBTm8pCPS4O0NUKbSjQDXieFPEWeJHoNRV1YqdznhyNZTA7IcrkdbIt/4AWShGgeW0VHRLoTR1KCKMsjYHl4GdWW6q4EwpofS4B2jldF5ueSFrI0fp8E/QJu36rHagCQ0wvQt+mUTaKkfwG0N75VYVJYWWeBno5+wnT6/bbbGMpzExW7TFgdJWH+jcomX+id8BBu8leBpLzwFAjmVBmAi4B3SNJJehQ3kuSlZNHtjP0CbbOCtM3oRbbXqBDJKgGbYBVyVNnogLmJwf3n6C1LSO14CRw2W46Tc0mYKr7Yq6hhnrjO8xVal7nQeXKAAAAAElFTkSuQmCC";
		//#endregion
		//#region src/client/OpenWithButton.tsx
		/**
		* Capsule split button: the left half launches the current item, the right
		* half opens a picker menu.
		*
		* The menu is DSH's `Menu` primitive with `portal` enabled, so the list mounts
		* on `document.body` and is positioned from the anchor rect — the session
		* header's `container-type` and stacking context would otherwise clip it.
		*
		* 文档来源有两条，分工明确：
		* - 挂载时向 host 读一次，取当前落盘的文档；
		* - 之后订阅 {@link subscribeSettings}，设置页每保存一次就收到 host 归一化
		*   后的文档，立刻重渲染 —— 不等用户点开菜单。
		* 展开菜单时仍会补读一次，纯粹是兜底：host 侧的文档也可能被本插件之外的
		* 原因改动（例如直接编辑 settings.json）。
		*/
		/** Chevron drawn inline, so the control carries no icon-package dependency. */
		function Chevron({ size = 12, open }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				style: {
					display: "block",
					transition: "transform 0.15s",
					transform: open ? "rotate(180deg)" : "rotate(0deg)"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3.5 6 8 10.5 12.5 6",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		/** One item's icon, falling back to the bundled glyph when nothing loads. */
		function ItemIcon$1({ src, size = 14 }) {
			const [failed, setFailed] = (0, react.useState)(false);
			const source = src.length > 0 && !failed ? src : FALLBACK_ICON_DATA_URL;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
				src: source,
				alt: "",
				"aria-hidden": "true",
				width: size,
				height: size,
				draggable: false,
				onError: () => {
					setFailed(true);
				},
				style: {
					display: "block",
					width: size,
					height: size,
					objectFit: "contain"
				}
			});
		}
		/**
		* Render the split button.
		* @param props - session identity, localized copy, and the injected host face.
		* @returns the control, or null while the first settings read is in flight.
		*/
		function OpenWithButton({ sessionId, getSettings, launch, getCwd, log, iconUrl, t }) {
			const [settings, setSettings] = (0, react.useState)(() => latestSettings());
			const [override, setOverride] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const getSettingsRef = (0, react.useRef)(getSettings);
			getSettingsRef.current = getSettings;
			const logRef = (0, react.useRef)(log);
			logRef.current = log;
			const reload = (0, react.useCallback)(() => {
				getSettingsRef.current().then((payload) => {
					setSettings(payload.settings);
				}).catch((err) => {
					logRef.current("warn", "settings read failed", err);
				});
			}, []);
			(0, react.useEffect)(() => {
				reload();
			}, [reload]);
			(0, react.useEffect)(() => subscribeSettings((next) => {
				setOverride(null);
				setSettings(next);
			}), []);
			/** Localized label: all items use the same pattern. */
			const labelOf = (item) => `${t("label")} ${item.name}`;
			const visibleItems = settings === null ? [] : settings.items.filter((item) => !settings.hiddenIds.includes(item.id));
			const preferred = override ?? settings?.currentId;
			const current = visibleItems.find((item) => item.id === preferred) ?? visibleItems[0];
			const run = (0, react.useCallback)((target) => {
				if (busy) return;
				const cwd = getCwd(sessionId);
				if (cwd === void 0 || cwd.length === 0) {
					log("warn", "workspace directory unavailable for session", { sessionId });
					return;
				}
				setBusy(true);
				log("info", "launch requested", {
					sessionId,
					target,
					cwd
				});
				launch(target, cwd).then(() => {
					log("info", "launch accepted", { target });
				}).catch((err) => {
					log("error", "launch failed", {
						target,
						err
					});
				}).finally(() => {
					setBusy(false);
				});
			}, [
				busy,
				getCwd,
				launch,
				log,
				sessionId
			]);
			const onPrimary = () => {
				setOpen(false);
				if (current !== void 0) run(current.id);
			};
			const onChevron = () => {
				if (!open) reload();
				setOpen((value) => !value);
			};
			const onSelect = (id) => {
				setOpen(false);
				setOverride(id);
				run(id);
			};
			const borderVar = "var(--dsw-alias-border-l2, rgba(0,0,0,0.12))";
			const hoverVar = "var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.05))";
			const textVar = "var(--dsw-alias-label-primary, inherit)";
			const halfStyle = {
				display: "inline-flex",
				alignItems: "center",
				height: "100%",
				border: "none",
				background: "transparent",
				color: "inherit",
				cursor: "pointer",
				font: "inherit"
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "inline-flex",
					alignItems: "center",
					height: "28px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open,
					portal: true,
					dense: true,
					autoFocus: true,
					align: "end",
					onClose: () => {
						setOpen(false);
					},
					selectedId: current?.id ?? "",
					items: visibleItems.length > 0 ? visibleItems.map((item) => ({
						id: item.id,
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemIcon$1, { src: iconUrl(item.id) }),
						label: labelOf(item)
					})) : [{
						id: "__empty__",
						label: t("menu.empty"),
						disabled: true
					}],
					onSelect,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "inline-flex",
							alignItems: "stretch",
							height: "28px",
							borderRadius: "6px",
							border: `1px solid ${borderVar}`,
							color: textVar,
							fontSize: "12px",
							overflow: "hidden"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: onPrimary,
								title: t("tooltip"),
								"aria-label": current === void 0 ? t("label") : labelOf(current),
								style: {
									...halfStyle,
									gap: "4px",
									padding: "0 8px",
									borderRadius: "6px 0 0 6px"
								},
								onMouseEnter: (e) => {
									e.currentTarget.style.background = hoverVar;
								},
								onMouseLeave: (e) => {
									e.currentTarget.style.background = "transparent";
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemIcon$1, { src: current === void 0 ? "" : iconUrl(current.id) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { whiteSpace: "nowrap" },
									children: current === void 0 ? t("label") : labelOf(current)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									width: "1px",
									background: borderVar,
									flex: "0 0 auto"
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: onChevron,
								"aria-label": t("picker.aria"),
								"aria-haspopup": "menu",
								"aria-expanded": open,
								style: {
									...halfStyle,
									justifyContent: "center",
									padding: "0 5px",
									borderRadius: "0 6px 6px 0"
								},
								onMouseEnter: (e) => {
									e.currentTarget.style.background = hoverVar;
								},
								onMouseLeave: (e) => {
									e.currentTarget.style.background = "transparent";
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Chevron, { open })
							})
						]
					})
				})
			});
		}
		//#endregion
		//#region src/client/OpenWithSettings.tsx
		/**
		* OpenWith 设置页组件：在 DSH 设置面板中插入"打开方式"配置区域。
		*
		* 只有一个启动器列表，每个条目能力完全相同：拖拽排序、隐藏/显示、编辑名称
		* 与路径、删除，以及选择是否把会话目录作为参数传给启动器。种子条目没有任何
		* 特权，删掉就是删掉。
		*
		* 胶囊菜单的顺序就是这个列表的顺序。
		* 图标不落在设置文档里：每一项的图标由 host 按当前路径现算（`iconUrl`）。
		*/
		/** 位置选项，顺序即设置页展示顺序。 */
		const PLACEMENT_OPTIONS = [{
			value: "actions",
			labelKey: "settings.placement.actions"
		}, {
			value: "utilities",
			labelKey: "settings.placement.utilities"
		}];
		/** 行内图标；路径缺失或加载失败时留出等宽空白，不用占位图。 */
		function ItemIcon({ src, size = 20 }) {
			const [failed, setFailed] = (0, react.useState)(false);
			if (src.length === 0 || failed) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
				display: "block",
				width: size,
				height: size,
				flexShrink: 0
			} });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
				src,
				alt: "",
				width: size,
				height: size,
				draggable: false,
				onError: () => {
					setFailed(true);
				},
				style: {
					display: "block",
					width: size,
					height: size,
					flexShrink: 0,
					imageRendering: "-webkit-optimize-contrast",
					userSelect: "none"
				}
			});
		}
		/** 拖拽插入位置指示线 */
		function InsertionLine({ color }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
				height: "2px",
				background: color,
				borderRadius: "1px",
				margin: "1px 0"
			} });
		}
		/**
		* 添加与编辑共用的启动器表单：自持草稿状态，两份表单不再各写一遍。
		*
		* `initial` 为 null 表示添加一个新项，否则编辑该项并以其当前值作为初始值。
		* 外部切换编辑目标时可用 `key` 强制重建，使草稿与初始值同步。
		*/
		function ItemForm({ initial, submitLabel, onCancel, onSubmit, t }) {
			const [name, setName] = (0, react.useState)(initial?.name ?? "");
			const [path, setPath] = (0, react.useState)(initial?.path ?? "");
			const [passCwd, setPassCwd] = (0, react.useState)(initial?.passCwd !== false);
			const [error, setError] = (0, react.useState)("");
			const borderVar = "var(--dsw-border-strong, rgba(0,0,0,0.12))";
			const textVar = "var(--dsw-fg, inherit)";
			const dangerColor = "var(--dsw-alias-danger, #e53e3e)";
			const secondaryColor = "var(--dsw-alias-label-secondary, #666)";
			const brandColor = "var(--dsw-alias-brand-primary, #4f8cff)";
			const brandAlpha = "var(--dsw-alias-brand-primary-alpha, rgba(79, 140, 255, 0.06))";
			const inputBg = "var(--dsw-specific-input, transparent)";
			/** 去掉用户偶发的包裹引号，再校验必填。 */
			const submit = () => {
				const trimmedName = name.trim();
				let trimmedPath = path.trim();
				if (trimmedPath.startsWith("\"") && trimmedPath.endsWith("\"") || trimmedPath.startsWith("'") && trimmedPath.endsWith("'")) trimmedPath = trimmedPath.slice(1, -1);
				if (!trimmedName) {
					setError(t("settings.edit.namePlaceholder"));
					return;
				}
				if (!trimmedPath) {
					setError(t("settings.edit.pathPlaceholder"));
					return;
				}
				setError("");
				onSubmit({
					name: trimmedName,
					path: trimmedPath,
					passCwd
				});
			};
			const onKeyDown = (e) => {
				if (e.key === "Escape") {
					e.preventDefault();
					onCancel();
				}
				if (e.key === "Enter") {
					e.preventDefault();
					submit();
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				onKeyDown,
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "8px",
					padding: "12px",
					border: `1px solid ${brandColor}`,
					borderRadius: "8px",
					background: brandAlpha
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: "8px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									display: "flex",
									flexDirection: "column",
									gap: "4px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: {
										fontSize: "11px",
										fontWeight: 500,
										color: secondaryColor
									},
									children: t("settings.edit.namePlaceholder")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "text",
									value: name,
									onChange: (e) => {
										setName(e.target.value);
										setError("");
									},
									placeholder: initial === null ? t("settings.edit.namePlaceholder") : void 0,
									autoFocus: true,
									style: {
										height: "30px",
										padding: "0 8px",
										width: "100%",
										boxSizing: "border-box",
										border: `1px solid ${borderVar}`,
										borderRadius: "4px",
										background: inputBg,
										color: textVar,
										fontSize: "13px",
										outline: "none"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "4px",
									flex: "1 1 auto",
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: {
										fontSize: "11px",
										fontWeight: 500,
										color: secondaryColor
									},
									children: t("settings.edit.pathPlaceholder")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "text",
									value: path,
									onChange: (e) => {
										setPath(e.target.value);
										setError("");
									},
									placeholder: initial === null ? t("settings.edit.pathPlaceholder") : void 0,
									style: {
										height: "30px",
										padding: "0 8px",
										border: `1px solid ${borderVar}`,
										borderRadius: "4px",
										background: inputBg,
										color: textVar,
										fontSize: "13px",
										outline: "none",
										width: "100%",
										boxSizing: "border-box"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "4px",
									alignSelf: "flex-end",
									flexShrink: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: "11px",
										fontWeight: 500,
										color: secondaryColor,
										whiteSpace: "nowrap"
									},
									children: t("settings.edit.passCwd")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										height: "30px"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
										checked: passCwd,
										onChange: setPassCwd,
										label: t("settings.edit.passCwd")
									})
								})]
							})
						]
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: "11px",
							color: dangerColor
						},
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							justifyContent: "flex-end",
							gap: "8px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onCancel,
							style: {
								height: "28px",
								padding: "0 12px",
								border: `1px solid ${borderVar}`,
								borderRadius: "4px",
								background: "transparent",
								color: textVar,
								cursor: "pointer",
								fontSize: "12px"
							},
							children: t("settings.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: submit,
							style: {
								height: "28px",
								padding: "0 12px",
								border: "none",
								borderRadius: "4px",
								background: brandColor,
								color: "#fff",
								cursor: "pointer",
								fontSize: "12px",
								fontWeight: 500
							},
							children: submitLabel
						})]
					})
				]
			});
		}
		function OpenWithSettings({ load, save, iconUrl, peers, loadBuiltins, setBuiltin, t }) {
			const [settings, setSettings] = (0, react.useState)(defaultSettings);
			const [formItemId, setFormItemId] = (0, react.useState)(null);
			const [dragState, setDragState] = (0, react.useState)(null);
			const [dragOverIndex, setDragOverIndex] = (0, react.useState)(null);
			const [orderText, setOrderText] = (0, react.useState)(String(0));
			const [peerList, setPeerList] = (0, react.useState)([]);
			const [builtins, setBuiltins] = (0, react.useState)(null);
			const [builtinBusy, setBuiltinBusy] = (0, react.useState)(false);
			const [builtinError, setBuiltinError] = (0, react.useState)("");
			const [saveError, setSaveError] = (0, react.useState)("");
			const saveSeq = (0, react.useRef)(0);
			const loadRef = (0, react.useRef)(load);
			loadRef.current = load;
			const saveRef = (0, react.useRef)(save);
			saveRef.current = save;
			const peersRef = (0, react.useRef)(peers);
			peersRef.current = peers;
			const loadBuiltinsRef = (0, react.useRef)(loadBuiltins);
			loadBuiltinsRef.current = loadBuiltins;
			const setBuiltinRef = (0, react.useRef)(setBuiltin);
			setBuiltinRef.current = setBuiltin;
			(0, react.useEffect)(() => {
				loadRef.current().then((payload) => {
					setSettings(payload.settings);
				}).catch(() => {});
			}, []);
			(0, react.useEffect)(() => {
				setPeerList(peersRef.current());
			}, []);
			const refreshBuiltins = (0, react.useCallback)(() => {
				setBuiltinError("");
				loadBuiltinsRef.current().then((payload) => {
					setBuiltins(payload);
				}).catch((err) => {
					setBuiltinError(err instanceof Error ? err.message : String(err));
				});
			}, []);
			(0, react.useEffect)(() => {
				refreshBuiltins();
			}, [refreshBuiltins]);
			(0, react.useEffect)(() => {
				setOrderText(String(settings.order));
			}, [settings.order]);
			/**
			* 落盘一份新文档，并让界面停在 host 真正持有的那份上。
			*
			* 先乐观更新，拖拽、开关这类操作才能即时可见；随后用 host 回传的归一化
			* 文档校正（host 会校正 id、收敛顺序）。
			*
			* 连续编辑会并发发出多个请求，而响应不保证按序返回，所以用序号守卫：
			* 只有最后一次发出的请求有权写回状态，否则一个慢响应会把更新的一次覆盖
			* 回去。失败时退回 host 实际持有的文档并亮出原因 —— 停在只存在于屏幕上
			* 的状态，等于让用户以为改动已经生效。
			*/
			const persist = (0, react.useCallback)((next) => {
				setSettings(next);
				const seq = ++saveSeq.current;
				setSaveError("");
				saveRef.current(next).then((saved) => {
					if (seq !== saveSeq.current) return;
					setSettings(saved);
				}).catch((err) => {
					if (seq !== saveSeq.current) return;
					setSaveError(err instanceof Error ? err.message : String(err));
					loadRef.current().then((payload) => {
						if (seq !== saveSeq.current) return;
						setSettings(payload.settings);
					}).catch(() => {});
				});
			}, []);
			const selectCurrent = (0, react.useCallback)((item) => {
				persist({
					...settings,
					currentId: item.id
				});
			}, [settings, persist]);
			const removeItem = (0, react.useCallback)((id) => {
				const nextItems = settings.items.filter((it) => it.id !== id);
				const nextCurrentId = settings.currentId === id ? nextItems[0]?.id ?? "code" : settings.currentId;
				const nextHiddenIds = settings.hiddenIds.filter((hid) => hid !== id);
				persist({
					...settings,
					currentId: nextCurrentId,
					items: nextItems,
					hiddenIds: nextHiddenIds
				});
			}, [settings, persist]);
			const toggleHidden = (0, react.useCallback)((id) => {
				const nextHiddenIds = settings.hiddenIds.includes(id) ? settings.hiddenIds.filter((hid) => hid !== id) : [...settings.hiddenIds, id];
				persist({
					...settings,
					hiddenIds: nextHiddenIds
				});
			}, [settings, persist]);
			/** 在同组内移动 item */
			const moveItem = (0, react.useCallback)((fromIndex, toIndex) => {
				const nextItems = [...settings.items];
				const [moved] = nextItems.splice(fromIndex, 1);
				nextItems.splice(toIndex, 0, moved);
				persist({
					...settings,
					items: nextItems
				});
			}, [settings, persist]);
			const onDragStart = (e, itemId) => {
				setDragState({ itemId });
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/plain", itemId);
			};
			const onDragEnd = () => {
				setDragState(null);
				setDragOverIndex(null);
			};
			/** 容器级 onDragOver：根据鼠标 Y 坐标计算插入位置 */
			const onGroupDragOver = (e) => {
				if (!dragState) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				const container = e.currentTarget;
				const children = Array.from(container.querySelectorAll("[data-drag-item]"));
				if (children.length === 0) return;
				const mouseY = e.clientY;
				let insertIndex = children.length;
				for (let i = 0; i < children.length; i++) {
					const rect = children[i].getBoundingClientRect();
					if (mouseY < rect.top + rect.height / 2) {
						insertIndex = i;
						break;
					}
				}
				setDragOverIndex(insertIndex);
			};
			/** 容器级 onDrop：根据 dragOverIndex 执行重排 */
			const onGroupDrop = (e) => {
				e.preventDefault();
				if (!dragState) return;
				const fromId = dragState.itemId;
				const targetIdx = dragOverIndex;
				setDragState(null);
				setDragOverIndex(null);
				if (targetIdx === null) return;
				const fromIndex = settings.items.findIndex((it) => it.id === fromId);
				if (fromIndex === -1) return;
				let toIndex = targetIdx;
				if (fromIndex < toIndex) toIndex -= 1;
				if (fromIndex === toIndex) return;
				moveItem(fromIndex, toIndex);
			};
			const openForm = (0, react.useCallback)((item) => {
				setFormItemId(item ? item.id : "__add__");
			}, []);
			const closeForm = (0, react.useCallback)(() => {
				setFormItemId(null);
			}, []);
			const submitForm = (0, react.useCallback)((value) => {
				if (formItemId === null) return;
				const { name, path, passCwd } = value;
				if (formItemId === "__add__") {
					const newItem = {
						id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
						name,
						path,
						...passCwd ? {} : { passCwd: false }
					};
					persist({
						...settings,
						items: [...settings.items, newItem]
					});
				} else {
					const nextItems = settings.items.map((it) => {
						if (it.id !== formItemId) return it;
						const merged = {
							...it,
							name,
							path
						};
						delete merged.passCwd;
						return passCwd ? merged : {
							...merged,
							passCwd: false
						};
					});
					persist({
						...settings,
						items: nextItems
					});
				}
				closeForm();
			}, [
				formItemId,
				settings,
				persist,
				closeForm
			]);
			const commitOrder = (0, react.useCallback)(() => {
				const raw = orderText.trim();
				const parsed = raw === "" ? null : normalizeOrder(Number(raw));
				if (parsed === null || parsed === settings.order) {
					setOrderText(String(settings.order));
					return;
				}
				persist({
					...settings,
					order: parsed
				});
			}, [
				orderText,
				settings,
				persist
			]);
			const toggleBuiltin = (0, react.useCallback)((enabled) => {
				setBuiltinBusy(true);
				setBuiltinError("");
				setBuiltinRef.current(enabled).then((payload) => {
					setBuiltins(payload);
				}).catch((err) => {
					setBuiltinError(err instanceof Error ? err.message : String(err));
				}).finally(() => {
					setBuiltinBusy(false);
				});
			}, []);
			const hoverVar = "var(--dsw-hover, rgba(0,0,0,0.05))";
			const borderVar = "var(--dsw-border-strong, rgba(0,0,0,0.12))";
			const textVar = "var(--dsw-fg, inherit)";
			const dangerColor = "var(--dsw-alias-danger, #e53e3e)";
			const secondaryColor = "var(--dsw-alias-label-secondary, #666)";
			const tertiaryColor = "var(--dsw-alias-label-tertiary, #999)";
			const brandColor = "var(--dsw-alias-brand-primary, #4f8cff)";
			const brandAlpha = "var(--dsw-alias-brand-primary-alpha, rgba(79, 140, 255, 0.06))";
			const inputBg = "var(--dsw-specific-input, transparent)";
			const allItems = settings.items;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "20px"
				},
				children: [
					saveError !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "alert",
						style: {
							padding: "8px 12px",
							borderRadius: "6px",
							fontSize: "12px",
							border: `1px solid ${dangerColor}`,
							color: dangerColor,
							background: "var(--dsw-alias-danger-alpha, rgba(229, 62, 62, 0.06))",
							wordBreak: "break-all"
						},
						children: [
							t("settings.save.failed"),
							" ",
							saveError
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							alignItems: "flex-start",
							gap: "24px 40px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "2px",
									flex: "0 1 auto",
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: {
										fontSize: "12px",
										fontWeight: 500,
										color: secondaryColor,
										marginBottom: "6px"
									},
									children: t("settings.placement.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "inline-flex",
										alignItems: "center",
										gap: "2px",
										alignSelf: "flex-start",
										padding: "2px",
										border: `1px solid ${borderVar}`,
										borderRadius: "6px"
									},
									children: PLACEMENT_OPTIONS.map((option) => {
										const active = settings.placement === option.value;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												persist({
													...settings,
													placement: option.value
												});
											},
											style: {
												height: "30px",
												padding: "0 8px",
												border: `1px solid ${borderVar}`,
												borderRadius: "6px",
												background: active ? brandColor : "transparent",
												color: active ? "#fff" : textVar,
												cursor: "pointer",
												fontSize: "12px",
												fontWeight: active ? 500 : 400,
												transition: "background 0.15s, color 0.15s"
											},
											children: t(option.labelKey)
										}, option.value);
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "2px",
									flex: "0 1 auto",
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: {
										fontSize: "12px",
										fontWeight: 500,
										color: secondaryColor,
										marginBottom: "6px"
									},
									children: t("settings.order.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									inputMode: "numeric",
									value: orderText,
									onChange: (e) => {
										setOrderText(e.target.value);
									},
									onBlur: commitOrder,
									onKeyDown: (e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											commitOrder();
										}
									},
									style: {
										width: "70px",
										height: "30px",
										padding: "0 8px",
										border: `1px solid ${borderVar}`,
										borderRadius: "6px",
										background: inputBg,
										color: textVar,
										fontSize: "12px"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									flex: "0 1 auto",
									minWidth: 0
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: {
											fontSize: "12px",
											fontWeight: 500,
											color: secondaryColor,
											marginBottom: "6px"
										},
										children: t("settings.builtins.title")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											display: "flex",
											alignItems: "center",
											gap: "12px",
											minHeight: "30px"
										},
										children: builtins === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: "11px",
												color: tertiaryColor
											},
											children: t("settings.builtins.loading")
										}) : !builtins.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: "11px",
												color: tertiaryColor
											},
											children: builtins.stale === true ? t("settings.builtins.stale") : t("settings.builtins.unavailable")
										}) : (() => {
											const note = !builtins.present ? t("settings.builtins.missing") : builtins.readOnlyReason === "management-required" ? t("settings.builtins.readOnlyManagement") : builtins.readOnlyReason === "unaddressable" ? t("settings.builtins.readOnlyUnaddressable") : "";
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													fontSize: "11px",
													color: tertiaryColor
												},
												children: (builtins.enabled ? t("settings.builtins.on") : t("settings.builtins.off")) + (note === "" ? "" : ` · ${note}`)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
												checked: builtins.enabled,
												disabled: !builtins.present || builtins.readOnly || builtinBusy,
												onChange: (next) => {
													toggleBuiltin(next);
												},
												label: t("settings.builtins.title")
											})] });
										})()
									}),
									builtinError !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: "11px",
											color: dangerColor,
											marginTop: "4px"
										},
										children: builtinError
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: "6px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: "8px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: {
									fontSize: "12px",
									fontWeight: 500,
									color: secondaryColor
								},
								children: t("settings.peers.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setPeerList(peersRef.current());
								},
								style: {
									height: "22px",
									padding: "0 8px",
									border: `1px solid ${borderVar}`,
									borderRadius: "4px",
									background: "transparent",
									color: secondaryColor,
									cursor: "pointer",
									fontSize: "11px"
								},
								children: t("settings.peers.refresh")
							})]
						}), PLACEMENT_OPTIONS.map((option) => {
							const rows = peerList.filter((peer) => peer.slot === option.value);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "2px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: "11px",
										color: tertiaryColor
									},
									children: t(option.labelKey)
								}), rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: "11px",
										color: tertiaryColor
									},
									children: t("settings.peers.empty")
								}) : rows.map((peer) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: "8px",
										padding: "3px 8px",
										borderRadius: "4px",
										background: peer.self ? brandAlpha : "transparent",
										border: `1px solid ${peer.self ? brandColor : "transparent"}`,
										fontSize: "11px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											color: peer.self ? brandColor : textVar,
											fontWeight: peer.self ? 500 : 400
										},
										children: peer.self ? `${peer.id} · ${t("settings.peers.self")}` : peer.id
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											marginLeft: "auto",
											color: secondaryColor,
											fontVariantNumeric: "tabular-nums"
										},
										children: `order ${String(peer.order)} · priority ${String(peer.priority)}`
									})]
								}, `${peer.slot}-${peer.id}`))]
							}, option.value);
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: "2px"
						},
						onDragOver: onGroupDragOver,
						onDrop: onGroupDrop,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: {
									fontSize: "12px",
									fontWeight: 500,
									color: secondaryColor,
									marginBottom: "6px"
								},
								children: t("settings.items.title")
							}),
							allItems.length === 0 && formItemId !== "__add__" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: "12px",
									color: tertiaryColor,
									padding: "4px 0"
								},
								children: t("settings.noItems")
							}),
							allItems.map((item, itemIndex) => {
								const isActive = item.id === settings.currentId;
								const isEditing = item.id === formItemId;
								const isDragging = dragState?.itemId === item.id;
								const showInsertBefore = dragState !== null && dragOverIndex === itemIndex;
								if (isEditing) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemForm, {
									initial: item,
									submitLabel: t("settings.save"),
									onCancel: closeForm,
									onSubmit: submitForm,
									t
								}, `edit-${item.id}`);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [showInsertBefore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InsertionLine, { color: brandColor }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-drag-item": true,
									role: "button",
									tabIndex: 0,
									draggable: true,
									onClick: () => selectCurrent(item),
									onDragStart: (e) => onDragStart(e, item.id),
									onDragEnd,
									onKeyDown: (e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											selectCurrent(item);
										}
									},
									style: {
										display: "flex",
										alignItems: "center",
										gap: "10px",
										padding: "8px 12px",
										border: `1px solid ${isActive ? brandColor : borderVar}`,
										borderRadius: "8px",
										background: isActive ? brandAlpha : "transparent",
										cursor: isDragging ? "grabbing" : "grab",
										opacity: isDragging ? .4 : 1,
										transition: "border-color 0.15s, background 0.15s, opacity 0.15s"
									},
									onMouseEnter: (e) => {
										if (!isActive) e.currentTarget.style.background = hoverVar;
									},
									onMouseLeave: (e) => {
										if (!isActive) e.currentTarget.style.background = "transparent";
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												display: "flex",
												alignItems: "center",
												color: tertiaryColor,
												fontSize: "13px",
												cursor: "grab",
												userSelect: "none",
												flexShrink: 0,
												lineHeight: 1
											},
											title: t("settings.dragTip"),
											children: "⋮⋮"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemIcon, {
											src: iconUrl(item.id),
											size: 20
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												flex: 1,
												minWidth: 0,
												display: "flex",
												flexDirection: "column",
												gap: "1px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													fontSize: "13px",
													fontWeight: 500,
													lineHeight: 1.3
												},
												children: [item.name, isActive && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														fontSize: "10px",
														color: brandColor,
														marginLeft: "6px",
														fontWeight: 600
													},
													children: ["✓ ", t("settings.current.title")]
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													fontSize: "11px",
													color: tertiaryColor,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: item.path
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											onClick: (e) => {
												e.stopPropagation();
											},
											style: {
												display: "flex",
												flexShrink: 0
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
												checked: !settings.hiddenIds.includes(item.id),
												onChange: () => {
													toggleHidden(item.id);
												},
												label: settings.hiddenIds.includes(item.id) ? t("settings.show") : t("settings.hide")
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: (e) => {
												e.stopPropagation();
												openForm(item);
											},
											title: t("settings.edit"),
											style: {
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
												width: "24px",
												height: "24px",
												padding: 0,
												border: "none",
												borderRadius: "4px",
												background: "transparent",
												color: secondaryColor,
												cursor: "pointer",
												fontSize: "14px",
												opacity: .6,
												transition: "opacity 0.15s, background 0.15s"
											},
											onMouseEnter: (e) => {
												e.currentTarget.style.opacity = "1";
												e.currentTarget.style.background = hoverVar;
											},
											onMouseLeave: (e) => {
												e.currentTarget.style.opacity = "0.6";
												e.currentTarget.style.background = "transparent";
											},
											children: "✎"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: (e) => {
												e.stopPropagation();
												removeItem(item.id);
											},
											title: t("settings.delete"),
											style: {
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
												width: "24px",
												height: "24px",
												padding: 0,
												border: "none",
												borderRadius: "4px",
												background: "transparent",
												color: dangerColor,
												cursor: "pointer",
												fontSize: "14px",
												opacity: .6,
												transition: "opacity 0.15s, background 0.15s"
											},
											onMouseEnter: (e) => {
												e.currentTarget.style.opacity = "1";
												e.currentTarget.style.background = hoverVar;
											},
											onMouseLeave: (e) => {
												e.currentTarget.style.opacity = "0.6";
												e.currentTarget.style.background = "transparent";
											},
											children: "✕"
										})
									]
								})] }, item.id);
							}),
							dragState !== null && dragOverIndex === allItems.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InsertionLine, { color: brandColor }),
							formItemId !== "__add__" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => openForm(),
								style: {
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									width: "100%",
									padding: "10px 0",
									border: `1px dashed ${borderVar}`,
									borderRadius: "8px",
									background: "transparent",
									color: secondaryColor,
									cursor: "pointer",
									fontSize: "13px",
									transition: "background 0.15s, border-color 0.15s"
								},
								onMouseEnter: (e) => {
									e.currentTarget.style.background = hoverVar;
									e.currentTarget.style.borderColor = brandColor;
								},
								onMouseLeave: (e) => {
									e.currentTarget.style.background = "transparent";
									e.currentTarget.style.borderColor = borderVar;
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: "16px",
										lineHeight: 1
									},
									children: "+"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("settings.items.add") })]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemForm, {
								initial: null,
								submitLabel: t("settings.items.add"),
								onCancel: closeForm,
								onSubmit: submitForm,
								t
							}, "add")
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** English dictionary. */
		const en = {
			label: "Open",
			tooltip: "Open the workspace in VS Code, terminal, or file explorer",
			"picker.aria": "Choose an application to open the workspace",
			"menu.aria": "Open with",
			"menu.empty": "No applications available",
			"settings.placement.title": "Button position",
			"settings.placement.actions": "Next to title",
			"settings.placement.utilities": "Right utilities",
			"settings.current.title": "Current",
			"settings.items.title": "Items",
			"settings.edit.namePlaceholder": "App name",
			"settings.edit.pathPlaceholder": "Executable path (.exe)",
			"settings.items.add": "Add",
			"settings.edit.passCwd": "Pass session folder",
			"settings.delete": "Delete",
			"settings.noItems": "No items yet",
			"settings.cancel": "Cancel",
			"settings.hide": "Hide from capsule",
			"settings.show": "Show in capsule",
			"settings.dragTip": "Drag to reorder",
			"settings.edit": "Edit",
			"settings.save": "Save",
			"settings.save.failed": "Could not save:",
			"settings.order.title": "Button order",
			"settings.peers.title": "Neighbouring components",
			"settings.peers.empty": "No other components in this seat",
			"settings.peers.refresh": "Refresh",
			"settings.peers.self": "this plugin",
			"settings.builtins.title": "Built-in plugins",
			"settings.builtins.loading": "Reading…",
			"settings.builtins.unavailable": "This profile exposes no plugin manager, so nothing can be toggled here.",
			"settings.builtins.stale": "The host half has not picked up this route yet; restart DSH to toggle these.",
			"settings.builtins.missing": "not loaded",
			"settings.builtins.readOnlyManagement": "protected by the plugin manager",
			"settings.builtins.readOnlyUnaddressable": "no addressable patch row",
			"settings.builtins.on": "enabled",
			"settings.builtins.off": "disabled"
		};
		/** Chinese dictionary. */
		const zh = {
			label: "打开",
			tooltip: "在 VS Code、终端或文件管理器中打开工作区",
			"picker.aria": "选择要用来打开工作区的应用",
			"menu.aria": "打开方式",
			"menu.empty": "暂无可用的打开方式",
			"settings.placement.title": "按钮位置",
			"settings.placement.actions": "会话标题旁",
			"settings.placement.utilities": "右侧工具区",
			"settings.current.title": "当前项",
			"settings.items.title": "启动项",
			"settings.edit.namePlaceholder": "应用名称",
			"settings.edit.pathPlaceholder": "可执行文件路径 (.exe)",
			"settings.items.add": "添加",
			"settings.edit.passCwd": "传递会话目录",
			"settings.delete": "删除",
			"settings.noItems": "暂无启动项",
			"settings.cancel": "取消",
			"settings.hide": "在胶囊中隐藏",
			"settings.show": "在胶囊中显示",
			"settings.dragTip": "拖动以调整排序",
			"settings.edit": "编辑",
			"settings.save": "保存",
			"settings.save.failed": "保存失败：",
			"settings.order.title": "按钮顺序",
			"settings.peers.title": "同槽位组件",
			"settings.peers.empty": "该槽位暂无其他组件",
			"settings.peers.refresh": "刷新",
			"settings.peers.self": "本插件",
			"settings.builtins.title": "内置插件",
			"settings.builtins.loading": "读取中…",
			"settings.builtins.unavailable": "当前 profile 未暴露插件管理器，无法在此切换。",
			"settings.builtins.stale": "宿主端尚未加载这条路由，重启 DSH 后即可切换。",
			"settings.builtins.missing": "未加载",
			"settings.builtins.readOnlyManagement": "受插件管理器保护，无法切换",
			"settings.builtins.readOnlyUnaddressable": "patch 中无可寻址条目，无法切换",
			"settings.builtins.on": "已启用",
			"settings.builtins.off": "已禁用"
		};
		//#endregion
		//#region src/client/index.ts
		const NS = "openWith";
		/** placement 选项到会话头部槽位的映射。 */
		const PLACEMENT_SLOT = {
			actions: "conversation.session.header.actions",
			utilities: "conversation.session.header.utilities"
		};
		const inject = [
			"slots",
			"locale",
			"sessions"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "open-with: dictionaries");
			const controller = new OpenWithController();
			/**
			* 某一项图标的文档相对 URL。
			*
			* 末尾拼上广播版本号：图标路由按 id 寻址，id 在改路径时并不改变，若不换
			* URL，`<img>` 会一直显示改动前的字节。
			*/
			const iconUrl = (id) => `${OPEN_WITH_ICON_PREFIX_ROUTE}/${encodeURIComponent(id)}?v=${String(settingsRevision())}`;
			/** 取会话工作区目录；会话未知时返回 undefined。 */
			const getCwd = (sessionId) => {
				try {
					return ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
				} catch (err) {
					controller.log("warn", "session lookup failed", err);
					return;
				}
			};
			/**
			* 快照两个会话头部槽位里已注册的条目，供设置页展示本插件按钮的相邻组件。
			* 条目按渲染顺序返回（先 priority 升序，再 order 升序）。
			*/
			const listPeers = () => {
				const peers = [];
				for (const placement of Object.keys(PLACEMENT_SLOT)) {
					const slot = PLACEMENT_SLOT[placement];
					let entries = [];
					try {
						entries = ctx.slots.entries(slot);
					} catch (err) {
						controller.log("warn", "slot ledger read failed", {
							slot,
							err
						});
						continue;
					}
					for (const entry of entries) {
						const id = entry.options?.id;
						if (typeof id !== "string" || id.length === 0) continue;
						peers.push({
							slot: placement,
							id,
							order: typeof entry.options?.order === "number" ? entry.options.order : 0,
							priority: typeof entry.options?.priority === "number" ? entry.options.priority : 0,
							...typeof entry.registrant === "string" ? { registrant: entry.registrant } : {},
							self: id === "open-with"
						});
					}
				}
				return peers;
			};
			let mounted = null;
			/**
			* 把胶囊按钮挂到 placement 对应的槽位，并写入 order 控制同槽位内的前后位置；
			* 位置与顺序都没变时为空操作。
			* @param placement - 目标注入位置。
			* @param order - 同槽位内的排序值，越小越靠前。
			*/
			const mount = (placement, order) => {
				if (mounted?.placement === placement && mounted.order === order) return;
				mounted?.dispose();
				mounted = null;
				const slot = PLACEMENT_SLOT[placement];
				mounted = {
					placement,
					order,
					dispose: ctx.slots.inject(slot, () => ctx.slots.register({
						name: slot,
						id: "open-with",
						order,
						locale: NS,
						inject: () => ({
							getSettings: () => controller.load(),
							launch: (target, path) => controller.launch(target, path),
							getCwd,
							log: (level, message, extra) => {
								controller.log(level, message, extra);
							},
							iconUrl
						})
					}, OpenWithButton))
				};
			};
			mount(DEFAULT_PLACEMENT, 0);
			controller.load().then((payload) => {
				mount(payload.settings.placement, payload.settings.order);
			}).catch((err) => {
				controller.log("warn", "settings read failed during mount", err);
			});
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "open-with",
				order: 600,
				label: () => ctx.locale.bind(NS)("menu.aria"),
				locale: NS,
				inject: () => ({
					load: () => controller.load(),
					save: async (settings) => {
						const saved = await controller.save(settings);
						mount(saved.placement, saved.order);
						publishSettings(saved);
						return saved;
					},
					iconUrl,
					peers: listPeers,
					loadBuiltins: () => controller.loadBuiltins(),
					setBuiltin: (enabled) => controller.setBuiltin(enabled)
				})
			}, OpenWithSettings)), "open-with: settings section");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map