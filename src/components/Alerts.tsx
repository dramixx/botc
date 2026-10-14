// Special situations, impossible to miss: full screen until acknowledged, then pinned on the panel.
import { useEffect, useRef, useState } from 'preact/hooks';
import { type Alert, worstTone } from '../game/alerts';
import { T, loc } from '../i18n';

/** Full-screen alert. With `confirm`, it asks before an action (execute the Saint…); otherwise it only needs acknowledging. */
export function AlertScreen(props: {
  alerts: Alert[];
  onAck: () => void;
  confirm?: { label: string; danger?: boolean; onConfirm: () => void };
}) {
  const tone = worstTone(props.alerts);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onAck(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class={`alert-screen tone-${tone}`} role="alertdialog" aria-modal="true" aria-label={T('Situation particulière', 'Special situation')}>
      <div class="alert-box">
        <div class="alert-ico" aria-hidden="true">!</div>
        <div class="alert-eyebrow">{T('ATTENTION · SITUATION PARTICULIÈRE', 'WARNING · SPECIAL SITUATION')}</div>
        <div class="alert-list">
          {props.alerts.map((a) => (
            <div key={a.key} class={`alert-item tone-${a.tone}`}>
              <div class="alert-title">{loc(a.title)}</div>
              <div class="alert-text">{loc(a.text)}</div>
            </div>
          ))}
        </div>
        {props.confirm ? (
          <div class="grid-2">
            <button type="button" class="btn lg" onClick={props.onAck}>{T('Annuler', 'Cancel')}</button>
            <button type="button" class={`btn lg ${props.confirm.danger ? 'danger' : 'amber'}`} onClick={props.confirm.onConfirm}>{props.confirm.label}</button>
          </div>
        ) : (
          <button type="button" class="btn amber lg" onClick={props.onAck}>{T('J’ai compris', 'Got it')}</button>
        )}
      </div>
    </div>
  );
}

/** The step's alerts, kept in view once acknowledged. */
export function AlertPins(props: { alerts: Alert[] }) {
  if (!props.alerts.length) return null;
  return (
    <div class="alert-pins">
      {props.alerts.map((a) => (
        <div key={a.key} class={`alert-pin tone-${a.tone}`}><b class="mono">!</b><span><b>{loc(a.title)}</b> · {loc(a.text)}</span></div>
      ))}
    </div>
  );
}

/**
 * Shows new alerts full screen, once each: `seen` remembers the acknowledged ones (by key) across re-renders.
 * Returns the screen to render, or null.
 */
export function useAlertPopup(alerts: Alert[], seen: Set<string>, enabled = true) {
  const [, force] = useState(0);
  const fresh = enabled ? alerts.filter((a) => !seen.has(a.key)) : [];
  if (!fresh.length) return null;
  return <AlertScreen alerts={fresh} onAck={() => { for (const a of fresh) seen.add(a.key); force((n) => n + 1); }} />;
}

const HOLD_MS = 600;
/** A button that only acts after a long press (or Enter): a player passing by cannot trigger it by mistake. */
export function HoldButton(props: { class?: string; label: string; onHold: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number>();
  const start = () => { setHolding(true); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { setHolding(false); props.onHold(); }, HOLD_MS); };
  const stop = () => { window.clearTimeout(timer.current); setHolding(false); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button type="button" class={`hold-btn ${holding ? 'holding' : ''} ${props.class ?? ''}`}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onHold(); } }}>
      <span class="hold-fill" />
      <span class="hold-label">{props.label}</span>
    </button>
  );
}
