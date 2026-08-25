/** i18n keys for the Open-with capsule split-button. */
export interface OpenWithKey {
  /** Primary button label for the currently chosen target. */
  label: string
  /** Hover tooltip on the action half of the split button. */
  tooltip: string
  /** Launching state text (reserved, UI will adopt in a future update). */
  launching: string
  /** Success state text (reserved). */
  opened: string
  /** Error state text (reserved). */
  failed: string
  /** Dropdown label: open VS Code. */
  'target.code': string
  /** Dropdown label: open terminal/cmd. */
  'target.cmd': string
  /** Dropdown label: open file explorer/folder. */
  'target.explorer': string
  /** Dropdown label: open PowerShell. */
  'target.powershell': string
  /** Aria-label for the chevron picker. */
  'picker.aria': string
  /** Aria-label for the picker menu. */
  'menu.aria': string
  /** 设置页 - 当前项标题 */
  'settings.current.title': string
  /** 设置页 - 自定义添加标题 */
  'settings.custom.title': string
  /** 设置页 - 名称输入框占位 */
  'settings.custom.namePlaceholder': string
  /** 设置页 - 路径输入框占位 */
  'settings.custom.pathPlaceholder': string
  /** 设置页 - 添加按钮 */
  'settings.custom.add': string
  /** 设置页 - 预设项标题 */
  'settings.preset.title': string
  /** 设置页 - 删除按钮 */
  'settings.delete': string
  /** 设置页 - 设为当前项 */
  'settings.setActive': string
  /** 设置页 - 无自定义项 */
  'settings.noCustom': string
  /** 设置页 - 提取图标中 */
  'settings.extracting': string
  /** 设置页 - 路径无效 */
  'settings.invalidPath': string
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
}

/** English dictionary. */
export const en: OpenWithKey = {
  label: 'Open',
  tooltip: 'Open the workspace in VS Code, terminal, or file explorer',
  launching: 'Opening…',
  opened: 'Opened',
  failed: 'Failed',
  'target.code': 'Open VS Code',
  'target.cmd': 'Open Terminal',
  'target.explorer': 'Open Folder',
  'target.powershell': 'Open PowerShell',
  'picker.aria': 'Choose an application to open the workspace',
  'menu.aria': 'Open with',
  'settings.current.title': 'Current',
  'settings.custom.title': 'Custom',
  'settings.custom.namePlaceholder': 'App name',
  'settings.custom.pathPlaceholder': 'Executable path (.exe)',
  'settings.custom.add': 'Add',
  'settings.preset.title': 'Presets',
  'settings.delete': 'Delete',
  'settings.setActive': 'Set as current',
  'settings.noCustom': 'No custom items yet',
  'settings.extracting': 'Extracting icon…',
  'settings.invalidPath': 'Invalid path',
  'settings.cancel': 'Cancel',
  'settings.hide': 'Hide from capsule',
  'settings.show': 'Show in capsule',
  'settings.dragTip': 'Drag to reorder',
  'settings.edit': 'Edit',
  'settings.save': 'Save',
}

/** Chinese dictionary. */
export const zh: OpenWithKey = {
  label: '打开',
  tooltip: '在 VS Code、终端或文件管理器中打开工作区',
  launching: '正在打开…',
  opened: '已打开',
  failed: '打开失败',
  'target.code': '打开 VS Code',
  'target.cmd': '打开 终端',
  'target.explorer': '打开 文件夹',
  'target.powershell': '打开 PowerShell',
  'picker.aria': '选择要用来打开工作区的应用',
  'menu.aria': '打开方式',
  'settings.current.title': '当前项',
  'settings.custom.title': '自定义',
  'settings.custom.namePlaceholder': '应用名称',
  'settings.custom.pathPlaceholder': '可执行文件路径 (.exe)',
  'settings.custom.add': '添加',
  'settings.preset.title': '预设项',
  'settings.delete': '删除',
  'settings.setActive': '设为当前',
  'settings.noCustom': '暂无自定义项',
  'settings.extracting': '正在提取图标…',
  'settings.invalidPath': '路径无效',
  'settings.cancel': '取消',
  'settings.hide': '在胶囊中隐藏',
  'settings.show': '在胶囊中显示',
  'settings.dragTip': '拖动以调整排序',
  'settings.edit': '编辑',
  'settings.save': '保存',
}