/** i18n keys for the Open-with capsule split-button. */
export interface OpenWithKey {
    /** Primary button label for the currently chosen target. */
    label: string;
    /** Hover tooltip on the action half of the split button. */
    tooltip: string;
    /** Dropdown label: open VS Code. */
    'target.code': string;
    /** Dropdown label: open terminal/cmd. */
    'target.cmd': string;
    /** Dropdown label: open file explorer/folder. */
    'target.explorer': string;
    /** Dropdown label: open PowerShell. */
    'target.powershell': string;
    /** Aria-label for the chevron picker. */
    'picker.aria': string;
    /** Aria-label for the picker menu. */
    'menu.aria': string;
    /** Empty menu placeholder shown when every item is hidden. */
    'menu.empty': string;
    /** 设置页 - 注入位置标题 */
    'settings.placement.title': string;
    /** 设置页 - 注入到会话标题旁 */
    'settings.placement.actions': string;
    /** 设置页 - 注入到右侧工具区 */
    'settings.placement.utilities': string;
    /** 设置页 - 当前项标题 */
    'settings.current.title': string;
    /** 设置页 - 自定义添加标题 */
    'settings.custom.title': string;
    /** 设置页 - 名称输入框占位 */
    'settings.custom.namePlaceholder': string;
    /** 设置页 - 路径输入框占位 */
    'settings.custom.pathPlaceholder': string;
    /** 设置页 - 添加按钮 */
    'settings.custom.add': string;
    /** 设置页 - 预设项标题 */
    'settings.preset.title': string;
    /** 设置页 - 删除按钮 */
    'settings.delete': string;
    /** 设置页 - 无自定义项 */
    'settings.noCustom': string;
    /** 设置页 - 取消按钮 */
    'settings.cancel': string;
    /** 设置页 - 在胶囊中隐藏/显示 */
    'settings.hide': string;
    'settings.show': string;
    /** 拖拽提示 */
    'settings.dragTip': string;
    /** 设置页 - 编辑按钮 */
    'settings.edit': string;
    /** 设置页 - 保存按钮 */
    'settings.save': string;
    /** 设置页 - 按钮顺序标题 */
    'settings.order.title': string;
    /** 设置页 - 同槽位组件标题 */
    'settings.peers.title': string;
    /** 设置页 - 该槽位暂无组件 */
    'settings.peers.empty': string;
    /** 设置页 - 刷新同槽位组件 */
    'settings.peers.refresh': string;
    /** 设置页 - 本插件标记 */
    'settings.peers.self': string;
    /** 设置页 - 内置插件标题 */
    'settings.builtins.title': string;
    /** 设置页 - 内置插件说明 */
    'settings.builtins.hint': string;
    /** 设置页 - 内置插件读取中 */
    'settings.builtins.loading': string;
    /** 设置页 - 无插件管理器 */
    'settings.builtins.unavailable': string;
    /** 设置页 - 宿主半尚未重载 */
    'settings.builtins.stale': string;
    /** 设置页 - 该半边未加载 */
    'settings.builtins.missing': string;
    /** 设置页 - 该条目受插件管理器保护 */
    'settings.builtins.readOnlyManagement': string;
    /** 设置页 - 该条目在 patch 中无法寻址 */
    'settings.builtins.readOnlyUnaddressable': string;
    /** 设置页 - 已启用 */
    'settings.builtins.on': string;
    /** 设置页 - 已禁用 */
    'settings.builtins.off': string;
}
/** English dictionary. */
export declare const en: OpenWithKey;
/** Chinese dictionary. */
export declare const zh: OpenWithKey;
