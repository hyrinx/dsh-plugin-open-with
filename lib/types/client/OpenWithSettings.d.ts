import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { type OpenWithSettings as OpenWithSettingsDoc, type OpenWithSettingsPayload } from '../shared.ts';
export interface OpenWithSettingsInjected {
    /** 读取 host 端归一化后的设置文档与预设启动器实际路径。 */
    load: () => Promise<OpenWithSettingsPayload>;
    /** 覆盖 host 端设置文档；返回 host 归一化后的结果。 */
    save: (settings: OpenWithSettingsDoc) => Promise<OpenWithSettingsDoc>;
    /** 某一项图标的文档相对 URL。 */
    iconUrl: (id: string) => string;
}
export type OpenWithSettingsProps = PropsLocale<'openWith'> & OpenWithSettingsInjected;
/** 表单提交时携带的草稿值。 */
export interface ItemFormValue {
    readonly name: string;
    readonly path: string;
    readonly passCwd: boolean;
}
export declare function OpenWithSettings({ load, save, iconUrl, t }: OpenWithSettingsProps): JSX.Element;
