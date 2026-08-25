window.__ModuleLoader__.load({ id: "dsh-plugin-open-with", factory: (require) => {
"use strict";
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
const react = __toESM(require("react"));
const __deepseek_ai_dsh_client_ui_primitives = __toESM(require("@deepseek-ai/dsh-client-ui-primitives"));
const react_jsx_runtime = __toESM(require("react/jsx-runtime"));

//#region src/client/OpenVscodeButton.tsx
/** 默认图标（DSH logo），用于图标提取完成前的回退。 */
const fallbackIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKDSURBVFhH7ZZJyI1xFMZ/yJQpMmRhDkkplCglWSAiUaadDSVDlI2FhZAyFAsbCSkiYqGQDBEbU4ayMC1E5qnMUw/nvY7j3O/e78PuPnW63TM9533P//zPCzXU8H/QEhgXlQ1FE6At0ML+K/kMYB9wF7gCdAoxc4A7Ftsg9Ac2AteA98AX4DPwBHgFfHMyJgYD28y2C+gajYbewLSoVMVrjcyT1CUjYxJgj7O/AcaavjMwHJgF3Ad2+yCR708IKsljYKJPBKwOPjeB9cCnoF/ug1YmyasVtWixyzUs8YmiGLX6BwYAHxOn+shXYJkrYnvi42WD8y0dmr8VFbHAcjYHdiQ+asMaPyFN3cl+av16lgRWKypihRGMcPpbwDygx6/n/onB5nAKaGw6/fa1vl5PSCKh7oJY9AXgiPt/OPCWMMUczkSDQcXo4nmQkEtuA4PssqprirbExAWmm8NDoFE0OnQEjieJP9iB0+2ndp5NfCRzY8IC451Tz2gMaAYcSJLr7Swyn35lJmpgyFWCZrFwWhiNCbQTziUE6rnekt7CxWBTm8pCPS4O0NUKbSjQDXieFPEWeJHoNRV1YqdznhyNZTA7IcrkdbIt/4AWShGgeW0VHRLoTR1KCKMsjYHl4GdWW6q4EwpofS4B2jldF5ueSFrI0fp8E/QJu36rHagCQ0wvQt+mUTaKkfwG0N75VYVJYWWeBno5+wnT6/bbbGMpzExW7TFgdJWH+jcomX+id8BBu8leBpLzwFAjmVBmAi4B3SNJJehQ3kuSlZNHtjP0CbbOCtM3oRbbXqBDJKgGbYBVyVNnogLmJwf3n6C1LSO14CRw2W46Tc0mYKr7Yq6hhnrjO8xVal7nQeXKAAAAAElFTkSuQmCC";
/** Renders a data-URL PNG icon at a given size. */
function PngIcon({ src, size = 14 }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
		src: src || fallbackIcon,
		alt: "",
		"aria-hidden": "true",
		width: size,
		height: size,
		style: {
			display: "block",
			width: size,
			height: size,
			imageRendering: "-webkit-optimize-contrast",
			imageRendering: "-moz-crisp-edges"
		}
	});
}
function useLaunchFlow(target, sessionId, launch, getCwd, log) {
	const run = (0, react.useCallback)(async () => {
		try {
			const cwd = getCwd(sessionId);
			if (cwd === void 0 || cwd.length === 0) {
				log("warn", "cwd not found for session", { sessionId });
				return;
			}
			log("info", "button clicked", {
				sessionId,
				target,
				cwd
			});
			const result = await launch(cwd, target);
			if (result.ok) log("info", "RPC result", result);
			else log("warn", "RPC returned error", result);
		} catch (err) {
			log("error", "button click failed", err);
		}
	}, [
		target,
		sessionId,
		launch,
		getCwd,
		log
	]);
	return { run };
}
function OpenWithButton({ sessionId, launch, getCwd, log, readHiddenIds, readCapsuleItems, t }) {
	const [target, setTarget] = (0, react.useState)("code");
	const [open, setOpen] = (0, react.useState)(false);
	const [hiddenIds, setHiddenIds] = (0, react.useState)([]);
	const [capsuleItems, setCapsuleItems] = (0, react.useState)([]);
	const rootRef = (0, react.useRef)(null);
	const pickerRef = (0, react.useRef)(null);
	(0, __deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, setOpen);
	(0, react.useEffect)(() => {
		readCapsuleItems().then((items) => {
			setCapsuleItems(items);
			if (items.length > 0 && !items.find((it) => it.id === target)) setTarget(items[0].id);
		}).catch(() => {});
		readHiddenIds().then(setHiddenIds).catch(() => {});
	}, [readHiddenIds, readCapsuleItems]);
	const { run } = useLaunchFlow(target, sessionId, launch, getCwd, log);
	const currentItem = capsuleItems.find((it) => it.id === target);
	const label = currentItem?.name ?? t("target.code");
	const title = t("tooltip");
	const currentIcon = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PngIcon, {
		src: currentItem?.icon ?? "",
		size: 14
	});
	const onRootKeyDown = (event) => {
		if (event.key === "Escape" && open) {
			event.preventDefault();
			setOpen(false);
			pickerRef.current?.focus();
		}
	};
	const onActionClick = (_ev) => {
		if (open) setOpen(false);
		run();
	};
	const onPickerClick = (_ev) => {
		const willOpen = !open;
		setOpen(willOpen);
		if (willOpen) {
			readCapsuleItems().then((items) => {
				setCapsuleItems(items);
			}).catch(() => {});
			readHiddenIds().then(setHiddenIds).catch(() => {});
		}
	};
	const selectTarget = (next) => {
		setTarget(next);
		setOpen(false);
		const cwd = getCwd(sessionId);
		if (cwd === void 0 || cwd.length === 0) {
			log("warn", "cwd not found for session", { sessionId });
			return;
		}
		log("info", "picker selected launch", {
			sessionId,
			target: next,
			cwd
		});
		launch(cwd, next).then((result) => {
			if (result.ok) log("info", "RPC result", result);
			else log("warn", "RPC returned error", result);
		}).catch((err) => {
			log("error", "picker launch failed", err);
		});
	};
	const visibleItems = capsuleItems.filter((it) => !hiddenIds.includes(it.id));
	const hoverVar = "var(--dsw-hover, rgba(0,0,0,0.05))";
	const borderVar = "var(--dsw-border-strong, rgba(0,0,0,0.12))";
	const textVar = "var(--dsw-fg, inherit)";
	const menuBgVar = "var(--dsw-specific-menu, transparent)";
	const menuBorderVar = "var(--dsw-alias-border-l2, rgba(0,0,0,0.08))";
	const menuShadowVar = "var(--dsw-shadow-lv3, 0 8px 24px rgba(0,0,0,0.08))";
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: rootRef,
		onKeyDown: onRootKeyDown,
		style: {
			position: "relative",
			display: "inline-flex",
			alignItems: "stretch",
			height: "28px",
			padding: 0,
			borderRadius: "6px",
			border: `1px solid ${borderVar}`,
			background: "transparent",
			color: textVar,
			fontSize: "13px",
			overflow: "visible"
		},
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onActionClick,
				title,
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
					height: "100%",
					padding: "0 8px",
					border: "none",
					background: "transparent",
					color: "inherit",
					cursor: "pointer",
					borderRadius: "6px 0 0 6px",
					transition: "background 0.15s"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.background = hoverVar;
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "transparent";
				},
				children: [currentIcon, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: { whiteSpace: "nowrap" },
					children: label
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": "true",
				style: {
					width: "1px",
					height: "100%",
					background: borderVar,
					flex: "0 0 auto"
				}
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				ref: pickerRef,
				type: "button",
				onClick: onPickerClick,
				"aria-label": t("picker.aria"),
				"aria-haspopup": "menu",
				"aria-expanded": open,
				style: {
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
					padding: "0 6px",
					border: "none",
					background: "transparent",
					color: "inherit",
					cursor: "pointer",
					borderRadius: "0 6px 6px 0",
					transition: "background 0.15s"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.background = hoverVar;
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "transparent";
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					"aria-hidden": "true",
					style: {
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						transition: "transform 0.15s",
						transform: open ? "rotate(90deg)" : "rotate(0deg)"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 })
				})
			}),
			open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "menu",
				"aria-label": t("menu.aria"),
				style: {
					position: "absolute",
					top: "calc(100% + 5px)",
					right: 0,
					minWidth: "168px",
					maxWidth: "min(320px, calc(100vw - 32px))",
					background: menuBgVar,
					backdropFilter: "saturate(180%) blur(20px)",
					WebkitBackdropFilter: "saturate(180%) blur(20px)",
					border: `1px solid ${menuBorderVar}`,
					borderRadius: "6px",
					boxShadow: menuShadowVar,
					padding: "4px",
					zIndex: 100
				},
				children: visibleItems.map((item) => {
					const icon = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PngIcon, {
						src: item.icon ?? "",
						size: 14
					});
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						role: "menuitem",
						type: "button",
						onClick: () => selectTarget(item.id),
						style: {
							display: "flex",
							alignItems: "center",
							gap: "8px",
							width: "100%",
							padding: "6px 10px",
							border: "none",
							background: "transparent",
							color: "inherit",
							cursor: "pointer",
							fontSize: "13px",
							borderRadius: "6px",
							fontWeight: target === item.id ? 600 : 400
						},
						onMouseEnter: (e) => {
							e.currentTarget.style.background = hoverVar;
						},
						onMouseLeave: (e) => {
							e.currentTarget.style.background = "transparent";
						},
						children: [icon, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: item.name })]
					}, item.id);
				})
			})
		]
	});
}

//#endregion
//#region src/client/OpenWithSettings.tsx
/** 默认应用图标（DSH logo），用于图标提取完成前的回退。 */
const appDefaultPngDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKDSURBVFhH7ZZJyI1xFMZ/yJQpMmRhDkkplCglWSAiUaadDSVDlI2FhZAyFAsbCSkiYqGQDBEbU4ayMC1E5qnMUw/nvY7j3O/e78PuPnW63TM9533P//zPCzXU8H/QEhgXlQ1FE6At0ML+K/kMYB9wF7gCdAoxc4A7Ftsg9Ac2AteA98AX4DPwBHgFfHMyJgYD28y2C+gajYbewLSoVMVrjcyT1CUjYxJgj7O/AcaavjMwHJgF3Ad2+yCR708IKsljYKJPBKwOPjeB9cCnoF/ug1YmyasVtWixyzUs8YmiGLX6BwYAHxOn+shXYJkrYnvi42WD8y0dmr8VFbHAcjYHdiQ+asMaPyFN3cl+av16lgRWKypihRGMcPpbwDygx6/n/onB5nAKaGw6/fa1vl5PSCKh7oJY9AXgiPt/OPCWMMUczkSDQcXo4nmQkEtuA4PssqprirbExAWmm8NDoFE0OnQEjieJP9iB0+2ndp5NfCRzY8IC451Tz2gMaAYcSJLr7Swyn35lJmpgyFWCZrFwWhiNCbQTziUE6rnekt7CxWBTm8pCPS4O0NUKbSjQDXieFPEWeJHoNRV1YqdznhyNZTA7IcrkdbIt/4AWShGgeW0VHRLoTR1KCKMsjYHl4GdWW6q4EwpofS4B2jldF5ueSFrI0fp8E/QJu36rHagCQ0wvQt+mUTaKkfwG0N75VYVJYWWeBno5+wnT6/bbbGMpzExW7TFgdJWH+jcomX+id8BBu8leBpLzwFAjmVBmAi4B3SNJJehQ3kuSlZNHtjP0CbbOCtM3oRbbXqBDJKgGbYBVyVNnogLmJwf3n6C1LSO14CRw2W46Tc0mYKr7Yq6hhnrjO8xVal7nQeXKAAAAAElFTkSuQmCC";
const PRESET_ITEMS = [
	{
		id: "code",
		name: "VS Code",
		path: "code",
		icon: "",
		preset: true,
		target: "code"
	},
	{
		id: "cmd",
		name: "Command Prompt",
		path: "cmd",
		icon: "",
		preset: true,
		target: "cmd"
	},
	{
		id: "powershell",
		name: "PowerShell",
		path: "powershell",
		icon: "",
		preset: true,
		target: "powershell"
	},
	{
		id: "explorer",
		name: "File Explorer",
		path: "explorer",
		icon: "",
		preset: true,
		target: "explorer"
	}
];
function defaultSettings() {
	return {
		currentId: "code",
		items: [...PRESET_ITEMS],
		hiddenIds: []
	};
}
function ItemIcon({ src, size = 20 }) {
	const iconSrc = src || appDefaultPngDataUrl;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
		src: iconSrc,
		alt: "",
		width: size,
		height: size,
		style: {
			display: "block",
			width: size,
			height: size,
			imageRendering: "-webkit-optimize-contrast"
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
function OpenWithSettings({ extractIcon, resolvePresetPath, readSettings, writeSettings, t }) {
	const [settings, setSettings] = (0, react.useState)(defaultSettings);
	const [resolvedPaths, setResolvedPaths] = (0, react.useState)({});
	const [formItemId, setFormItemId] = (0, react.useState)(null);
	const [formName, setFormName] = (0, react.useState)("");
	const [formPath, setFormPath] = (0, react.useState)("");
	const [formError, setFormError] = (0, react.useState)("");
	const [dragState, setDragState] = (0, react.useState)(null);
	const [dragOverIndex, setDragOverIndex] = (0, react.useState)(null);
	const settingsRef = (0, react.useRef)(settings);
	settingsRef.current = settings;
	const extractedPresets = (0, react.useRef)(new Set());
	(0, react.useEffect)(() => {
		const targets = [
			"code",
			"cmd",
			"powershell",
			"explorer"
		];
		for (const target of targets) resolvePresetPath(target).then((presetPath) => {
			if (presetPath) setResolvedPaths((prev) => ({
				...prev,
				[target]: presetPath
			}));
		});
	}, [resolvePresetPath]);
	(0, react.useEffect)(() => {
		readSettings().then((loaded) => {
			if (loaded && loaded.currentId && loaded.items) {
				const items = [...loaded.items];
				for (const preset of PRESET_ITEMS) if (!items.find((it) => it.id === preset.id)) items.push(preset);
				setSettings({
					currentId: loaded.currentId,
					items,
					hiddenIds: loaded.hiddenIds ?? []
				});
			}
		});
	}, [readSettings]);
	const persist = (0, react.useCallback)((next) => {
		setSettings(next);
		writeSettings(next).catch(() => {});
	}, [writeSettings]);
	(0, react.useEffect)(() => {
		const presets = settingsRef.current.items.filter((it) => it.preset && it.target && !it.icon);
		for (const p of presets) {
			if (extractedPresets.current.has(p.id)) continue;
			const exePath = resolvedPaths[p.target];
			if (!exePath) continue;
			extractedPresets.current.add(p.id);
			extractIcon(exePath).then((icon) => {
				if (!icon) return;
				const cur = settingsRef.current;
				const nextItems = cur.items.map((it) => it.id === p.id ? {
					...it,
					icon
				} : it);
				const next = {
					...cur,
					items: nextItems
				};
				setSettings(next);
				writeSettings(next).catch(() => {});
			});
		}
	}, [
		resolvedPaths,
		settings.items,
		extractIcon,
		writeSettings
	]);
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
	const onDragStart = (e, itemId, group) => {
		setDragState({
			itemId,
			group
		});
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", itemId);
	};
	const onDragEnd = () => {
		setDragState(null);
		setDragOverIndex(null);
	};
	/** 容器级 onDragOver：根据鼠标 Y 坐标计算插入位置 */
	const onGroupDragOver = (e, group) => {
		if (!dragState || dragState.group !== group) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		const container = e.currentTarget;
		const children = Array.from(container.querySelectorAll("[data-drag-item]"));
		if (children.length === 0) return;
		const mouseY = e.clientY;
		let insertIndex = children.length;
		for (let i = 0; i < children.length; i++) {
			const rect = children[i].getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			if (mouseY < midY) {
				insertIndex = i;
				break;
			}
		}
		setDragOverIndex(insertIndex);
	};
	/** 容器级 onDrop：根据 dragOverIndex 执行重排 */
	const onGroupDrop = (e, group) => {
		e.preventDefault();
		if (!dragState || dragState.group !== group) return;
		const fromId = dragState.itemId;
		const targetIdx = dragOverIndex;
		setDragState(null);
		setDragOverIndex(null);
		if (targetIdx === null) return;
		const allItems = settings.items;
		const fromIndex = allItems.findIndex((it) => it.id === fromId);
		if (fromIndex === -1) return;
		const groupBaseIndex = group === "preset" ? 0 : allItems.findIndex((it) => !it.preset);
		let toIndex = groupBaseIndex + targetIdx;
		if (fromIndex < toIndex) toIndex -= 1;
		if (fromIndex === toIndex) return;
		moveItem(fromIndex, toIndex);
	};
	const openForm = (0, react.useCallback)((item) => {
		if (item) {
			setFormItemId(item.id);
			setFormName(item.name);
			setFormPath(item.path);
		} else {
			setFormItemId("__add__");
			setFormName("");
			setFormPath("");
		}
		setFormError("");
	}, []);
	const closeForm = (0, react.useCallback)(() => {
		setFormItemId(null);
		setFormName("");
		setFormPath("");
		setFormError("");
	}, []);
	const submitForm = (0, react.useCallback)(async () => {
		if (formItemId === null) return;
		const name = formName.trim();
		let path = formPath.trim();
		if (path.startsWith("\"") && path.endsWith("\"") || path.startsWith("'") && path.endsWith("'")) path = path.slice(1, -1);
		if (!name) {
			setFormError(t("settings.custom.namePlaceholder"));
			return;
		}
		if (!path) {
			setFormError(t("settings.custom.pathPlaceholder"));
			return;
		}
		setFormError("");
		if (formItemId === "__add__") {
			const newId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const newItem = {
				id: newId,
				name,
				path,
				icon: "",
				preset: false
			};
			persist({
				currentId: settings.currentId,
				items: [...settings.items, newItem],
				hiddenIds: settings.hiddenIds
			});
			closeForm();
			extractIcon(path).then((icon) => {
				if (!icon) return;
				const cur = settingsRef.current;
				const nextItems = cur.items.map((it) => it.id === newId ? {
					...it,
					icon
				} : it);
				persist({
					...cur,
					items: nextItems
				});
			}).catch(() => {});
		} else {
			const oldItem = settings.items.find((it) => it.id === formItemId);
			const pathChanged = !!(oldItem && path !== oldItem.path);
			const icon = pathChanged ? "" : oldItem?.icon ?? "";
			const nextItems = settings.items.map((it) => it.id === formItemId ? {
				...it,
				name,
				path,
				icon
			} : it);
			persist({
				currentId: settings.currentId,
				items: nextItems,
				hiddenIds: settings.hiddenIds
			});
			closeForm();
			if (pathChanged) {
				const editId = formItemId;
				extractIcon(path).then((icon$1) => {
					if (!icon$1) return;
					const cur = settingsRef.current;
					const nextItems$1 = cur.items.map((it) => it.id === editId ? {
						...it,
						icon: icon$1
					} : it);
					persist({
						...cur,
						items: nextItems$1
					});
				}).catch(() => {});
			}
		}
	}, [
		formItemId,
		formName,
		formPath,
		settings,
		persist,
		extractIcon,
		closeForm,
		t
	]);
	const onFormKeyDown = (e) => {
		if (e.key === "Escape") closeForm();
		if (e.key === "Enter") {
			e.preventDefault();
			submitForm();
		}
	};
	const hoverVar = "var(--dsw-hover, rgba(0,0,0,0.05))";
	const borderVar = "var(--dsw-border-strong, rgba(0,0,0,0.12))";
	const textVar = "var(--dsw-fg, inherit)";
	const dangerColor = "var(--dsw-alias-danger, #e53e3e)";
	const secondaryColor = "var(--dsw-alias-label-secondary, #666)";
	const tertiaryColor = "var(--dsw-alias-label-tertiary, #999)";
	const brandColor = "var(--dsw-alias-brand-primary, #4f8cff)";
	const brandAlpha = "var(--dsw-alias-brand-primary-alpha, rgba(79, 140, 255, 0.06))";
	const inputBg = "var(--dsw-specific-input, transparent)";
	const presetItems = settings.items.filter((it) => it.preset);
	const customItems = settings.items.filter((it) => !it.preset);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			gap: "20px"
		},
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: "2px"
			},
			onDragOver: (e) => onGroupDragOver(e, "preset"),
			onDrop: (e) => onGroupDrop(e, "preset"),
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					style: {
						fontSize: "12px",
						fontWeight: 500,
						color: secondaryColor,
						marginBottom: "6px"
					},
					children: t("settings.preset.title")
				}),
				presetItems.map((item, itemIndex) => {
					const isActive = item.id === settings.currentId;
					const isDragging = dragState?.itemId === item.id;
					const showInsertBefore = dragState?.group === "preset" && dragOverIndex === itemIndex;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [showInsertBefore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InsertionLine, { color: brandColor }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"data-drag-item": true,
						role: "button",
						tabIndex: 0,
						draggable: true,
						onClick: () => selectCurrent(item),
						onDragStart: (e) => onDragStart(e, item.id, "preset"),
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
								src: item.icon,
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
									children: resolvedPaths[item.id] || item.path
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: (e) => {
									e.stopPropagation();
									toggleHidden(item.id);
								},
								title: settings.hiddenIds.includes(item.id) ? t("settings.show") : t("settings.hide"),
								style: {
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: "28px",
									height: "24px",
									padding: 0,
									border: "none",
									borderRadius: "4px",
									background: "transparent",
									color: settings.hiddenIds.includes(item.id) ? dangerColor : secondaryColor,
									cursor: "pointer",
									fontSize: "13px",
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
								children: settings.hiddenIds.includes(item.id) ? "👁‍🗨" : "👁"
							})
						]
					})] }, item.id);
				}),
				dragState?.group === "preset" && dragOverIndex === presetItems.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InsertionLine, { color: brandColor })
			]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: "2px"
			},
			onDragOver: (e) => onGroupDragOver(e, "custom"),
			onDrop: (e) => onGroupDrop(e, "custom"),
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					style: {
						fontSize: "12px",
						fontWeight: 500,
						color: secondaryColor,
						marginBottom: "6px"
					},
					children: t("settings.custom.title")
				}),
				customItems.length === 0 && formItemId !== "__add__" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: "12px",
						color: tertiaryColor,
						padding: "4px 0"
					},
					children: t("settings.noCustom")
				}),
				customItems.map((item, itemIndex) => {
					const isActive = item.id === settings.currentId;
					const isEditing = item.id === formItemId;
					const isDragging = dragState?.itemId === item.id;
					const showInsertBefore = dragState?.group === "custom" && dragOverIndex === itemIndex;
					if (isEditing) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						onKeyDown: onFormKeyDown,
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
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
										children: t("settings.custom.namePlaceholder")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										value: formName,
										onChange: (e) => {
											setFormName(e.target.value);
											setFormError("");
										},
										autoFocus: true,
										style: {
											height: "30px",
											padding: "0 8px",
											border: `1px solid ${borderVar}`,
											borderRadius: "4px",
											background: inputBg,
											color: textVar,
											fontSize: "13px",
											outline: "none"
										}
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										flex: 2,
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
										children: t("settings.custom.pathPlaceholder")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										value: formPath,
										onChange: (e) => {
											setFormPath(e.target.value);
											setFormError("");
										},
										style: {
											height: "30px",
											padding: "0 8px",
											border: `1px solid ${borderVar}`,
											borderRadius: "4px",
											background: inputBg,
											color: textVar,
											fontSize: "13px",
											outline: "none"
										}
									})]
								})]
							}),
							formError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: "11px",
									color: dangerColor
								},
								children: formError
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									justifyContent: "flex-end",
									gap: "8px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: closeForm,
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
									onClick: submitForm,
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
									children: t("settings.save")
								})]
							})
						]
					}, item.id);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [showInsertBefore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InsertionLine, { color: brandColor }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"data-drag-item": true,
						role: "button",
						tabIndex: 0,
						draggable: true,
						onClick: () => selectCurrent(item),
						onDragStart: (e) => onDragStart(e, item.id, "custom"),
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
								src: item.icon,
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: (e) => {
									e.stopPropagation();
									toggleHidden(item.id);
								},
								title: settings.hiddenIds.includes(item.id) ? t("settings.show") : t("settings.hide"),
								style: {
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: "28px",
									height: "24px",
									padding: 0,
									border: "none",
									borderRadius: "4px",
									background: "transparent",
									color: settings.hiddenIds.includes(item.id) ? dangerColor : secondaryColor,
									cursor: "pointer",
									fontSize: "13px",
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
								children: settings.hiddenIds.includes(item.id) ? "👁‍🗨" : "👁"
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
				dragState?.group === "custom" && dragOverIndex === customItems.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InsertionLine, { color: brandColor }),
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
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("settings.custom.add") })]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					onKeyDown: onFormKeyDown,
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
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
									children: t("settings.custom.namePlaceholder")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "text",
									value: formName,
									onChange: (e) => {
										setFormName(e.target.value);
										setFormError("");
									},
									placeholder: t("settings.custom.namePlaceholder"),
									autoFocus: true,
									style: {
										height: "30px",
										padding: "0 8px",
										border: `1px solid ${borderVar}`,
										borderRadius: "4px",
										background: inputBg,
										color: textVar,
										fontSize: "13px",
										outline: "none"
									}
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 2,
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
									children: t("settings.custom.pathPlaceholder")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "text",
									value: formPath,
									onChange: (e) => {
										setFormPath(e.target.value);
										setFormError("");
									},
									placeholder: t("settings.custom.pathPlaceholder"),
									style: {
										height: "30px",
										padding: "0 8px",
										border: `1px solid ${borderVar}`,
										borderRadius: "4px",
										background: inputBg,
										color: textVar,
										fontSize: "13px",
										outline: "none"
									}
								})]
							})]
						}),
						formError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: "11px",
								color: dangerColor
							},
							children: formError
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "flex-end",
								gap: "8px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: closeForm,
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
								onClick: submitForm,
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
								children: t("settings.custom.add")
							})]
						})
					]
				})
			]
		})]
	});
}

//#endregion
//#region src/client/locales.ts
const en = {
	label: "Open",
	tooltip: "Open the workspace in VS Code, terminal, or file explorer",
	launching: "Opening…",
	opened: "Opened",
	failed: "Failed",
	"target.code": "Open VS Code",
	"target.cmd": "Open Terminal",
	"target.explorer": "Open Folder",
	"target.powershell": "Open PowerShell",
	"picker.aria": "Choose an application to open the workspace",
	"menu.aria": "Open with",
	"settings.current.title": "Current",
	"settings.custom.title": "Custom",
	"settings.custom.namePlaceholder": "App name",
	"settings.custom.pathPlaceholder": "Executable path (.exe)",
	"settings.custom.add": "Add",
	"settings.preset.title": "Presets",
	"settings.delete": "Delete",
	"settings.setActive": "Set as current",
	"settings.noCustom": "No custom items yet",
	"settings.extracting": "Extracting icon…",
	"settings.invalidPath": "Invalid path",
	"settings.cancel": "Cancel",
	"settings.hide": "Hide from capsule",
	"settings.show": "Show in capsule",
	"settings.dragTip": "Drag to reorder",
	"settings.edit": "Edit",
	"settings.save": "Save"
};
const zh = {
	label: "打开",
	tooltip: "在 VS Code、终端或文件管理器中打开工作区",
	launching: "正在打开…",
	opened: "已打开",
	failed: "打开失败",
	"target.code": "打开 VS Code",
	"target.cmd": "打开 终端",
	"target.explorer": "打开 文件夹",
	"target.powershell": "打开 PowerShell",
	"picker.aria": "选择要用来打开工作区的应用",
	"menu.aria": "打开方式",
	"settings.current.title": "当前项",
	"settings.custom.title": "自定义",
	"settings.custom.namePlaceholder": "应用名称",
	"settings.custom.pathPlaceholder": "可执行文件路径 (.exe)",
	"settings.custom.add": "添加",
	"settings.preset.title": "预设项",
	"settings.delete": "删除",
	"settings.setActive": "设为当前",
	"settings.noCustom": "暂无自定义项",
	"settings.extracting": "正在提取图标…",
	"settings.invalidPath": "路径无效",
	"settings.cancel": "取消",
	"settings.hide": "在胶囊中隐藏",
	"settings.show": "在胶囊中显示",
	"settings.dragTip": "拖动以调整排序",
	"settings.edit": "编辑",
	"settings.save": "保存"
};

//#endregion
//#region src/client/index.ts
const NS = "openWith";
const inject = [
	"slots",
	"locale",
	"connection",
	"sessions"
];
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "open-with: dictionaries");
	ctx.effect(() => ctx.slots.inject("conversation.session.header", () => ctx.slots.register({
		name: "conversation.session.header.actions",
		id: "open-with",
		order: 10,
		locale: NS,
		inject: () => {
			const log = (level, message, extra) => {
				const safeExtra = extra instanceof Error ? {
					name: extra.name,
					message: extra.message,
					stack: extra.stack,
					cause: extra.cause
				} : extra;
				const consoleLine = `[open-with] ${message}`;
				if (level === "error") console.error(consoleLine, safeExtra);
				else if (level === "warn") console.warn(consoleLine, safeExtra);
				else console.log(consoleLine, safeExtra);
				ctx.connection.rpc.call("/open-with", "log", {
					level,
					message,
					extra: safeExtra
				}).catch(() => {});
			};
			return {
				launch: async (cwd, target = "code") => {
					return ctx.connection.rpc.call("/open-with", "launch", {
						cwd,
						target
					});
				},
				getCwd: (sessionId) => {
					try {
						const state = ctx.sessions.list.getSnapshot();
						const summary = state.byId[sessionId];
						if (summary === void 0) {
							const allIds = Object.keys(state.byId);
							log("warn", "session not in list", {
								requested: sessionId,
								count: allIds.length,
								sample: allIds.slice(0, 3)
							});
						}
						return summary?.cwd;
					} catch (err) {
						console.error("[open-with] getCwd failed:", err);
						return void 0;
					}
				},
				log,
				readHiddenIds: async () => {
					try {
						const result = await ctx.connection.rpc.call("/open-with", "readSettings", {});
						if (result && typeof result === "object" && "ok" in result) {
							const settings = result.value?.settings;
							if (settings && Array.isArray(settings.hiddenIds)) return settings.hiddenIds.filter((id) => typeof id === "string");
						}
						return [];
					} catch {
						return [];
					}
				},
				readCapsuleItems: async () => {
					try {
						const result = await ctx.connection.rpc.call("/open-with", "readSettings", {});
						if (result && typeof result === "object" && "ok" in result) {
							const settings = result.value?.settings;
							if (settings && Array.isArray(settings.items)) return settings.items.filter((it) => {
								if (typeof it.id !== "string" || typeof it.name !== "string") return false;
								return true;
							});
						}
						return [];
					} catch {
						return [];
					}
				}
			};
		}
	}, OpenWithButton)), "open-with: button registration");
	ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "open-with",
		order: 600,
		label: "Open With",
		locale: NS,
		inject: () => ({
			extractIcon: async (exePath) => {
				try {
					console.log("[open-with] extractIcon RPC start", exePath);
					const result = await ctx.connection.rpc.call("/open-with", "extractIcon", { exePath });
					if (result && typeof result === "object" && "ok" in result) {
						const icon = result.ok ? result.value?.icon ?? "" : "";
						console.log("[open-with] extractIcon RPC result", {
							ok: result.ok,
							iconLen: icon.length
						});
						return icon;
					}
					console.warn("[open-with] extractIcon unexpected result", result);
					return "";
				} catch (err) {
					console.error("[open-with] extractIcon RPC error", err);
					return "";
				}
			},
			resolvePresetPath: async (target) => {
				try {
					const result = await ctx.connection.rpc.call("/open-with", "resolvePresetPath", { target });
					if (result && typeof result === "object" && "ok" in result) return result.value?.path ?? "";
					return "";
				} catch {
					return "";
				}
			},
			readSettings: async () => {
				try {
					const result = await ctx.connection.rpc.call("/open-with", "readSettings", {});
					if (result && typeof result === "object" && "ok" in result) return result.value?.settings ?? null;
					return null;
				} catch {
					return null;
				}
			},
			writeSettings: async (settings) => {
				await ctx.connection.rpc.call("/open-with", "writeSettings", { settings });
			}
		})
	}, OpenWithSettings)), "open-with: settings section");
}

//#endregion
exports.apply = apply
exports.inject = inject
return module.exports; } });
//# sourceMappingURL=client.js.map