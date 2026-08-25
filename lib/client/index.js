import { OpenVscodeButton } from './OpenVscodeButton.tsx';
import { en, zh } from './locales.ts';
/** Dictionary namespace owned by this plugin. */
const NS = 'openVscode';
/** Services required: slots for UI registration, locale for i18n, connection for RPC. */
export const inject = ['slots', 'locale', 'connection'];
/**
 * Register the i18n dictionaries and inject the button into the conversation
 * session header actions slot.
 * @param ctx - Client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'open-vscode: dictionaries');
    ctx.effect(() => ctx.slots.inject('conversation.session.header', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'open-vscode',
        order: 10,
        locale: NS,
        inject: () => ({
            launch: async (cwd) => {
                return ctx.connection.rpc.call('/open-vscode', 'launch', { cwd });
            },
        }),
    }, OpenVscodeButton)), 'open-vscode: button registration');
}
//# sourceMappingURL=index.js.map