// Dialoge (natives <dialog>) und kurze Meldungen mit „Rückgängig“.
import { h, button } from './dom.js';
import { icon } from './icons.js';

/**
 * Öffnet einen modalen Dialog.
 * @param {object} o
 * @param {string} o.title
 * @param {Node|Node[]} o.body
 * @param {{label, variant?, icon?, onClick?: (close) => (boolean|void|Promise)}[]} [o.actions]
 *        onClick gibt false zurück, wenn der Dialog offen bleiben soll.
 * @param {() => void} [o.onClose]
 * @param {'normal'|'wide'|'full'} [o.size]
 */
export function openDialog({ title, body, actions = [], onClose, size = 'normal', className = '' }) {
  const titleId = `dlg-${Math.random().toString(36).slice(2, 8)}`;
  const dialog = h('dialog', { class: `modal modal-${size} ${className}`.trim(), 'aria-labelledby': titleId });
  const opener = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    dialog.close();
    dialog.remove();
    onClose?.();
    // Fokus zurück zum Auslöser, sofern er noch da ist und nichts anderes ihn übernommen hat
    if (opener instanceof HTMLElement && opener.isConnected && (document.activeElement === document.body || !document.activeElement)) {
      opener.focus({ preventScroll: true });
    }
  };

  const footer = actions.length
    ? h('footer', { class: 'modal-actions' }, actions.map((a) => button(a.label, {
      variant: a.variant, icon: a.icon, disabled: a.disabled,
      onClick: async () => { if ((await a.onClick?.(close)) !== false) close(); },
    })))
    : null;

  dialog.append(
    h('header', { class: 'modal-head' },
      h('h2', { id: titleId }, title),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Schließen', onClick: close }, icon('close', { size: 22 }))),
    h('div', { class: 'modal-body' }, body),
  );
  if (footer) dialog.append(footer);
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  document.body.append(dialog);
  dialog.showModal();
  const autofocus = dialog.querySelector('[autofocus]');
  if (autofocus) autofocus.focus();
  return { close, dialog };
}

export function confirmDialog({ title, text, confirmLabel = 'OK', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    openDialog({
      title,
      body: h('p', {}, text),
      actions: [
        { label: 'Abbrechen', variant: 'quiet' },
        { label: confirmLabel, variant: danger ? 'danger' : 'primary', onClick: () => { result = true; } },
      ],
      onClose: () => resolve(result),
    });
  });
}

export function promptDialog({ title, label, value = '', confirmLabel = 'Speichern', validate = () => null, maxLength = 60 }) {
  return new Promise((resolve) => {
    let result = null;
    const error = h('p', { class: 'field-error', role: 'alert' });
    const input = h('input', { class: 'input', type: 'text', name: 'eingabe', value, maxlength: maxLength, autofocus: true, autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'done' });
    const submit = () => {
      const msg = validate(input.value);
      if (msg) { error.textContent = msg; input.focus(); return false; }
      result = input.value.trim();
      return true;
    };
    const { close } = openDialog({
      title,
      body: h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input, error),
      actions: [{ label: 'Abbrechen', variant: 'quiet' }, { label: confirmLabel, variant: 'primary', onClick: submit }],
      onClose: () => resolve(result),
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && submit()) close(); });
    input.select();
  });
}

// ---------- Meldungen ----------
let toastHost = null;

/** Kurze Meldung unten; optional mit Aktion (z. B. „Rückgängig“). */
export function toast(message, { action, duration = 5000, tone = '' } = {}) {
  if (!toastHost) {
    toastHost = h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastHost);
  }
  const el = h('div', { class: `toast ${tone ? `toast-${tone}` : ''}`.trim() },
    h('span', { class: 'toast-text' }, message),
    action ? h('button', { type: 'button', class: 'toast-action', onClick: () => { action.onClick(); remove(); } }, action.label) : null,
  );
  let timer = setTimeout(remove, duration);
  function remove() {
    clearTimeout(timer);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  }
  el.addEventListener('pointerenter', () => clearTimeout(timer));
  el.addEventListener('pointerleave', () => { timer = setTimeout(remove, 2500); });
  toastHost.append(el);
  return remove;
}
