/** i18n keys for the Open-with capsule split-button. */
export interface OpenWithKey {
    /** Primary button label for the currently chosen target. */
    label: string;
    /** Hover tooltip on the action half of the split button. */
    tooltip: string;
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
    /** 设置页 - 所有项标题 */
    'settings.items.title': string;
    /** 设置页 - 恢复默认启动器列表 */
    'settings.items.restore': string;
    /** 设置页 - 恢复默认的两步确认文案 */
    'settings.items.restoreConfirm': string;
    /** 设置页 - 名称输入框占位 */
    'settings.edit.namePlaceholder': string;
    /** 设置页 - 路径输入框占位 */
    'settings.edit.pathPlaceholder': string;
    /** 设置页 - 添加按钮 */
    'settings.items.add': string;
    /** 设置页 - 是否把会话目录作为参数传给启动器 */
    'settings.edit.passCwd': string;
    /** 设置页 - 删除按钮 */
    'settings.delete': string;
    /** 设置页 - 无自定义项 */
    'settings.noItems': string;
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
    /** 设置页 - 保存失败提示前缀 */
    'settings.save.failed': string;
    /** 设置页 - 按钮顺序标题 */
    'settings.order.title': string;
}
/** English dictionary. */
export declare const en: OpenWithKey;
/** Chinese dictionary. */
export declare const zh: OpenWithKey;
