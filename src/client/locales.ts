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
  /** Aria-label for the chevron picker. */
  'picker.aria': string
  /** Aria-label for the picker menu. */
  'menu.aria': string
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
  'picker.aria': 'Choose an application to open the workspace',
  'menu.aria': 'Open with',
}

/** Chinese dictionary. */
export const zh: OpenWithKey = {
  label: 'Open',
  tooltip: '在 VS Code、终端或文件管理器中打开工作区',
  launching: '正在打开…',
  opened: '已打开',
  failed: '打开失败',
  'target.code': '打开 VS Code',
  'target.cmd': '打开终端',
  'target.explorer': '打开文件夹',
  'picker.aria': '选择要用来打开工作区的应用',
  'menu.aria': '打开方式',
}
