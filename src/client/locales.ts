/** i18n keys for the Open-with capsule split-button. */
export interface OpenWithKey {
  /** Primary button label for the currently chosen target. */
  label: string
  /** Hover tooltip on the action half of the split button. */
  tooltip: string
  /** Aria-label for the chevron picker. */
  'picker.aria': string
  /** Aria-label for the picker menu. */
  'menu.aria': string
  /** Empty menu placeholder shown when every item is hidden. */
  'menu.empty': string
  /** 设置页 - 注入位置标题 */
  'settings.placement.title': string
  /** 设置页 - 注入到会话标题旁 */
  'settings.placement.actions': string
  /** 设置页 - 注入到右侧工具区 */
  'settings.placement.utilities': string
  /** 设置页 - 当前项标题 */
  'settings.current.title': string
  /** 设置页 - 所有项标题 */
  'settings.items.title': string
  /** 设置页 - 恢复默认启动器列表 */
  'settings.items.restore': string
  /** 设置页 - 恢复默认的两步确认文案 */
  'settings.items.restoreConfirm': string
  /** 设置页 - 名称输入框占位 */
  'settings.edit.namePlaceholder': string
  /** 设置页 - 路径输入框占位 */
  'settings.edit.pathPlaceholder': string
  /** 设置页 - 添加按钮 */
  'settings.items.add': string
  /** 设置页 - 是否把会话目录作为参数传给启动器 */
  'settings.edit.passCwd': string
  /** 设置页 - 删除按钮 */
  'settings.delete': string
  /** 设置页 - 无自定义项 */
  'settings.noItems': string
  /** 设置页 - 取消按钮 */
  'settings.cancel': string
  /** 设置页 - 在胶囊中隐藏/显示 */
  'settings.hide': string
  'settings.show': string
  /** 拖拽提示 */
  'settings.dragTip': string
  /** 设置页 - 编辑按钮 */
  'settings.edit': string
  /** 设置页 - 保存按钮 */
  'settings.save': string
  /** 设置页 - 保存失败提示前缀 */
  'settings.save.failed': string
  /** 设置页 - 按钮顺序标题 */
  'settings.order.title': string
  /** 设置页 - 同槽位组件标题 */
  'settings.peers.title': string
  /** 设置页 - 该槽位暂无组件 */
  'settings.peers.empty': string
  /** 设置页 - 刷新同槽位组件 */
  'settings.peers.refresh': string
  /** 设置页 - 本插件标记 */
  'settings.peers.self': string
  /** 设置页 - 内置插件标题 */
  'settings.builtins.title': string
  /** 设置页 - 内置插件读取中 */
  'settings.builtins.loading': string
  /** 设置页 - 无插件管理器 */
  'settings.builtins.unavailable': string
  /** 设置页 - 宿主半尚未重载 */
  'settings.builtins.stale': string
  /** 设置页 - 该半边未加载 */
  'settings.builtins.missing': string
  /** 设置页 - 该条目受插件管理器保护 */
  'settings.builtins.readOnlyManagement': string
  /** 设置页 - 该条目在 patch 中无法寻址 */
  'settings.builtins.readOnlyUnaddressable': string
  /** 设置页 - 已启用 */
  'settings.builtins.on': string
  /** 设置页 - 已禁用 */
  'settings.builtins.off': string
}

/** English dictionary. */
export const en: OpenWithKey = {
  label: 'Open',
  tooltip: 'Open the workspace in VS Code, terminal, or file explorer',
  'picker.aria': 'Choose an application to open the workspace',
  'menu.aria': 'Open with',
  'menu.empty': 'No applications available',
  'settings.placement.title': 'Button position',
  'settings.placement.actions': 'Next to title',
  'settings.placement.utilities': 'Right utilities',
  'settings.current.title': 'Current',
  'settings.items.title': 'Items',
  'settings.items.restore': 'Restore defaults',
  'settings.items.restoreConfirm': 'Confirm restore?',
  'settings.edit.namePlaceholder': 'App name',
  'settings.edit.pathPlaceholder': 'Executable path (.exe)',
  'settings.items.add': 'Add',
  'settings.edit.passCwd': 'Pass session folder',
  'settings.delete': 'Delete',
  'settings.noItems': 'No items yet',
  'settings.cancel': 'Cancel',
  'settings.hide': 'Hide from capsule',
  'settings.show': 'Show in capsule',
  'settings.dragTip': 'Drag to reorder',
  'settings.edit': 'Edit',
  'settings.save': 'Save',
  'settings.save.failed': 'Could not save:',
  'settings.order.title': 'Button order',
  'settings.peers.title': 'Neighbouring components',
  'settings.peers.empty': 'No other components in this seat',
  'settings.peers.refresh': 'Refresh',
  'settings.peers.self': 'this plugin',
  'settings.builtins.title': 'Built-in plugins',
  'settings.builtins.loading': 'Reading\u2026',
  'settings.builtins.unavailable': 'This profile exposes no plugin manager, so nothing can be toggled here.',
  'settings.builtins.stale': 'The host half has not picked up this route yet; restart DSH to toggle these.',
  'settings.builtins.missing': 'not loaded',
  'settings.builtins.readOnlyManagement': 'protected by the plugin manager',
  'settings.builtins.readOnlyUnaddressable': 'no addressable patch row',
  'settings.builtins.on': 'enabled',
  'settings.builtins.off': 'disabled',
}

/** Chinese dictionary. */
export const zh: OpenWithKey = {
  label: '打开',
  tooltip: '在 VS Code、终端或文件管理器中打开工作区',
  'picker.aria': '选择要用来打开工作区的应用',
  'menu.aria': '打开方式',
  'menu.empty': '暂无可用的打开方式',
  'settings.placement.title': '按钮位置',
  'settings.placement.actions': '会话标题旁',
  'settings.placement.utilities': '右侧工具区',
  'settings.current.title': '当前项',
  'settings.items.title': '启动项',
  'settings.items.restore': '恢复默认',
  'settings.items.restoreConfirm': '确认恢复？',
  'settings.edit.namePlaceholder': '应用名称',
  'settings.edit.pathPlaceholder': '可执行文件路径 (.exe)',
  'settings.items.add': '添加',
  'settings.edit.passCwd': '传递会话目录',
  'settings.delete': '删除',
  'settings.noItems': '暂无启动项',
  'settings.cancel': '取消',
  'settings.hide': '在胶囊中隐藏',
  'settings.show': '在胶囊中显示',
  'settings.dragTip': '拖动以调整排序',
  'settings.edit': '编辑',
  'settings.save': '保存',
  'settings.save.failed': '保存失败：',
  'settings.order.title': '按钮顺序',
  'settings.peers.title': '同槽位组件',
  'settings.peers.empty': '该槽位暂无其他组件',
  'settings.peers.refresh': '刷新',
  'settings.peers.self': '本插件',
  'settings.builtins.title': '内置插件',
  'settings.builtins.loading': '读取中…',
  'settings.builtins.unavailable': '当前 profile 未暴露插件管理器，无法在此切换。',
  'settings.builtins.stale': '宿主端尚未加载这条路由，重启 DSH 后即可切换。',
  'settings.builtins.missing': '未加载',
  'settings.builtins.readOnlyManagement': '受插件管理器保护，无法切换',
  'settings.builtins.readOnlyUnaddressable': 'patch 中无可寻址条目，无法切换',
  'settings.builtins.on': '已启用',
  'settings.builtins.off': '已禁用',
}