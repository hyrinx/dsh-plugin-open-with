import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * "Open in VS Code" button for the conversation session header.
 *
 * On click, calls the host-side RPC to spawn `code` at the workspace
 * directory. Shows a brief loading state and toast feedback on
 * success or failure.
 */
import { useCallback, useState } from 'react';
/** Inline VS Code icon (16px, monochrome). */
function VscodeIcon({ size = 16 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M17.5 2.5L9.5 10.5L5.5 7.5L3.5 8.5V15.5L5.5 16.5L9.5 13.5L17.5 21.5L21 19.5V4.5L17.5 2.5Z", fill: "currentColor", fillOpacity: "0.9" }), _jsx("path", { d: "M17.5 2.5L9.5 10.5L17.5 18.5V2.5Z", fill: "currentColor", fillOpacity: "0.6" })] }));
}
/**
 * Render the Open in VS Code button.
 * @param props - composed slot props.
 * @returns the button element.
 */
export function OpenVscodeButton({ sessionId, useSessions, useWorkspaces, launch, t, }) {
    const [state, setState] = useState('idle');
    const handleClick = useCallback(async () => {
        setState('loading');
        try {
            // Resolve the workspace directory from the current session.
            const session = useSessions.getState().byId[sessionId];
            const workspaceId = session?.workspace;
            const workspaces = useWorkspaces?.getState();
            const cwd = workspaceId && workspaces
                ? workspaces.byId[workspaceId]?.path ?? process.cwd?.() ?? '.'
                : '.';
            const result = await launch(cwd);
            setState(result.ok ? 'done' : 'error');
        }
        catch {
            setState('error');
        }
        // Reset to idle after 2s for visual feedback.
        setTimeout(() => setState('idle'), 2000);
    }, [sessionId, useSessions, useWorkspaces, launch]);
    const label = t(state === 'loading' ? 'launching' : state === 'done' ? 'opened' : state === 'error' ? 'failed' : 'label');
    const title = t('tooltip');
    return (_jsxs("button", { type: "button", onClick: handleClick, disabled: state === 'loading', title: title, style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            border: 'none',
            borderRadius: '6px',
            background: 'transparent',
            color: 'inherit',
            cursor: state === 'loading' ? 'wait' : 'pointer',
            fontSize: '13px',
            opacity: state === 'loading' ? 0.6 : 1,
            transition: 'opacity 0.15s, background 0.15s',
        }, onMouseEnter: (e) => { if (state !== 'loading')
            e.currentTarget.style.background = 'var(--dsw-hover, rgba(0,0,0,0.05))'; }, onMouseLeave: (e) => { e.currentTarget.style.background = 'transparent'; }, children: [_jsx(VscodeIcon, { size: 14 }), label] }));
}
//# sourceMappingURL=OpenVscodeButton.js.map