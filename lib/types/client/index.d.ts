/**
 * Browser-side plugin.
 *
 * 功能：
 * - 胶囊拆分按钮：左半直接启动当前项，右侧下拉菜单切换启动器；
 *   注入位置可配置（会话标题旁 / 右侧工具区），改设置后立即迁移槽位。
 * - 注册中英文词典，并把设置页注入 DSH 设置面板。
 *
 * 所有数据都走 host 的 webServer 路由（`./controller.ts`），浏览器侧不缓存，
 * 因此菜单与设置页展示的永远是 host 实际持有的文档。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type OpenWithKey } from './locales.ts';
export type { OpenWithButtonProps, OpenWithInjected } from './OpenWithButton.tsx';
export type { OpenWithSettingsProps } from './OpenWithSettings.tsx';
export type { OpenWithKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Open-with split-button copy. */
        openWith: OpenWithKey;
    }
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
