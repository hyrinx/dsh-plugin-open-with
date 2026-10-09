/**
 * DSH 主题 token 的唯一入口。
 *
 * 只登记 ui-theme 的 `design-platform.css` / `base.css` 里真实存在的变量。
 * 此前设置页和胶囊按钮各自硬编码了一份字符串，设置页那份有六个名字是编造的
 * （`--dsw-border-strong` / `--dsw-hover` / `--dsw-fg` / `--dsw-alias-danger` /
 * `--dsw-specific-input` / `--dsw-alias-brand-primary-alpha`）：浏览器取不到就
 * 回落到写死的 `rgba(0, 0, 0, 0.12)`，于是深色主题下边框发闷、且和胶囊对不上。
 * 集中在这里就不会再分叉。
 *
 * 取用层级照抄官方组件，不自行发明：
 * - 输入控件、抬起卡片  0.5px + border-l4（ui-primitives/Input.module.css）
 * - 中性描边按钮        0.5px + border-l3（ui-primitives/Button.module.css 的 .outline）
 * - 行分隔线、轻描边    0.5px + border-l2（ui-settings-general/DeveloperToolsRow）
 * - 圆角一律走 --dsw-radius-*，不写裸 px
 *
 * 兜底值只允许是另一个真实 token（官方的惯例，见 SegmentedControl / Button），
 * 绝不写死颜色 —— 写死就必然有一端主题是错的。明暗两套值由 ui-theme 提供：
 * border-l1 .04/.06、l2 .10/.12、l3 .12/.16、l4 .16/.20。
 */

/** 线宽。官方 UI 的描边一律 0.5px，不是 1px。 */
export const LINE = '0.5px'

// ── 描边颜色 ─────────────────────────────────────────────────────────────────

/** 输入控件与抬起卡片的描边。 */
export const BORDER_INPUT = 'var(--dsw-alias-border-l4, var(--dsw-alias-border-l3))'
/** 中性描边按钮。 */
export const BORDER_BUTTON = 'var(--dsw-alias-border-l3, var(--dsw-alias-border-l2))'
/** 行分隔线与最轻的装饰描边。 */
export const BORDER_LINE = 'var(--dsw-alias-border-l2, var(--dsw-alias-border-l1))'
/** 控件获得焦点时的描边（官方 Input 的 :focus-within 同款）。 */
export const BORDER_FOCUS = 'var(--dsw-alias-state-business-primary)'

// ── 常用完整边框 ─────────────────────────────────────────────────────────────

/** 输入类控件的边框。 */
export const OUTLINE_INPUT = `${LINE} solid ${BORDER_INPUT}`
/** 中性描边按钮的边框。 */
export const OUTLINE_BUTTON = `${LINE} solid ${BORDER_BUTTON}`
/** 分隔线级别的完整边框（会话头部胶囊、分隔竖线）。 */
export const OUTLINE_LINE = `${LINE} solid ${BORDER_LINE}`

// ── 圆角（base.css：xs 4 / sm 8 / md 12）─────────────────────────────────────

/** 4px，用于最紧凑的行内控件。 */
export const RADIUS_XS = 'var(--dsw-radius-xs)'
/** 8px，用于 28px 高的紧凑控件。 */
export const RADIUS_SM = 'var(--dsw-radius-sm)'
/** 12px，用于常规控件与卡片。 */
export const RADIUS_MD = 'var(--dsw-radius-md)'

// ── 文字 ─────────────────────────────────────────────────────────────────────

/** 正文与标题。 */
export const TEXT = 'var(--dsw-alias-label-primary)'
/** 次级说明文字。 */
export const TEXT_SECONDARY = 'var(--dsw-alias-label-secondary)'
/** 三级提示、路径等弱化文字。 */
export const TEXT_TERTIARY = 'var(--dsw-alias-label-tertiary)'
/** 铺在品牌色实心块上的前景色（官方 Button.primary 同款，不是 #fff）。 */
export const TEXT_ON_BRAND = 'var(--dsw-alias-label-primary-foreground)'

// ── 状态色 ───────────────────────────────────────────────────────────────────

/** 品牌主色。 */
export const BRAND = 'var(--dsw-alias-brand-primary)'
/** 主按钮填充（官方 Button.primary 同款）。 */
export const BRAND_FILL = 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary))'
/** 危险操作色。 */
export const DANGER = 'var(--dsw-alias-state-error-primary)'

// ── 底色 ─────────────────────────────────────────────────────────────────────

/** 输入控件的填充（官方 ConfigField 在设置页里用 layer-3）。 */
export const BG_INPUT = 'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-1))'
/** 抬起面（分段控件的游标）。 */
export const BG_RAISED = 'var(--dsw-alias-bg-layer-1)'
/** 悬停底色。 */
export const BG_HOVER = 'var(--dsw-alias-interactive-bg-hover)'
/** 选中项的品牌色淡底；官方用 color-mix 表达这类淡色层（见 ui-jobs、ui-dockkit）。 */
export const BG_BRAND_WASH = `color-mix(in srgb, ${BRAND} 8%, transparent)`

// ── 其他 ─────────────────────────────────────────────────────────────────────

/** 抬起面的柔和投影（官方 SegmentedControl 的游标同款）。 */
export const ELEVATION_SOFT = 'var(--dsw-elevation-soft)'
