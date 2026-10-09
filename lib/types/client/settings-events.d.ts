/**
 * 设置变更的进程内广播。
 *
 * 胶囊按钮与设置页跑在同一个页面进程里，却分处两个槽位、没有父子关系：
 * 设置页保存后，按钮无从得知文档变了，只能等用户点开菜单再发一次读请求
 * —— 这正是"改了设置界面却不跟着动"的来源。
 *
 * 所以保存方把 **host 归一化后的文档**直接推给订阅者。推归一化后的结果
 * 而不是保存时的输入，是因为 host 会校正 id、收敛顺序、解析可执行路径；
 * 推输入会让两侧显示不一致。
 *
 * `latest` 还兼作新挂载按钮的初始值：切换注入位置会重建槽位注册，按钮随之
 * 重新挂载，用它渲染可以避免先闪一帧空菜单。
 */
import type { OpenWithSettings } from '../shared.ts';
/** 订阅者收到的是 host 归一化后的文档。 */
export type SettingsListener = (settings: OpenWithSettings) => void;
/**
 * 订阅设置变更。
 * @param listener - 每次发布调用一次，参数为 host 归一化后的文档。
 * @returns 取消订阅的函数。
 */
export declare function subscribeSettings(listener: SettingsListener): () => void;
/**
 * 发布一份新文档。
 *
 * 先复制订阅者列表再遍历：订阅者在自己回调里退订是合法写法，直接遍历原始
 * 集合会让那次删除改变本次分发的剩余项。
 * @param settings - host 归一化后的文档。
 */
export declare function publishSettings(settings: OpenWithSettings): void;
/**
 * 最近一次发布的文档。
 * @returns 文档，或从未发布过时的 null。
 */
export declare function latestSettings(): OpenWithSettings | null;
/**
 * 图标 URL 的缓存破除标记。
 *
 * 图标路由按 id 寻址，而 id 在编辑路径时并不改变，于是 `<img>` 的 src 保持
 * 原样、浏览器也乐得沿用上一次的字节。把它拼进查询串，每次发布都换一个 URL，
 * 图标才会跟着新路径重新取。
 * @returns 单调递增的发布计数。
 */
export declare function settingsRevision(): number;
