import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { type OpenWithBuiltinsPayload, type OpenWithPeer, type OpenWithSettings as OpenWithSettingsDoc, type OpenWithSettingsPayload } from '../shared.ts';
export interface OpenWithSettingsInjected {
    /** 读取 host 端归一化后的设置文档与预设启动器实际路径。 */
    load: () => Promise<OpenWithSettingsPayload>;
    /** 覆盖 host 端设置文档；返回 host 归一化后的结果。 */
    save: (settings: OpenWithSettingsDoc) => Promise<OpenWithSettingsDoc>;
    /** 某一项图标的文档相对 URL。 */
    iconUrl: (id: string) => string;
    /** 两个会话头部槽位里当前已注册的条目（含本插件自己）。 */
    peers: () => readonly OpenWithPeer[];
    /** 读取 DSH 内置 open-in-app 这一对的启用状态。 */
    loadBuiltins: () => Promise<OpenWithBuiltinsPayload>;
    /** 一起切换两半；返回 host 刷新后的状态。 */
    setBuiltin: (enabled: boolean) => Promise<OpenWithBuiltinsPayload>;
}
export type OpenWithSettingsProps = PropsLocale<'openWith'> & OpenWithSettingsInjected;
/** 表单提交时携带的草稿值。 */
export interface ItemFormValue {
    readonly name: string;
    readonly path: string;
    readonly passCwd: boolean;
}
export declare function OpenWithSettings({ load, save, iconUrl, peers, loadBuiltins, setBuiltin, t }: OpenWithSettingsProps): JSX.Element;
