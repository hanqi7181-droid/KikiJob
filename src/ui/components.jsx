import React from 'react';

export function Button({ children, className = '', variant = 'primary', ...props }) {
  const variantClass =
    variant === 'secondary'
      ? 'secondary-action'
      : variant === 'danger'
        ? 'danger-action'
        : variant === 'text'
          ? 'ghost-action'
          : 'primary-action';
  return (
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, id, error, ...props }) {
  const inputId = id || `field-${String(label || props.name || 'input').replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `${inputId}-error`;
  return (
    <label className={error ? 'field-control has-error' : 'field-control'} htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} {...props} />
      {error && <small id={errorId}>{error}</small>}
    </label>
  );
}

export function Select({ children, label, id, error, ...props }) {
  const selectId = id || `field-${String(label || props.name || 'select').replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `${selectId}-error`;
  return (
    <label className={error ? 'field-control has-error' : 'field-control'} htmlFor={selectId}>
      <span>{label}</span>
      <select id={selectId} aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
      {error && <small id={errorId}>{error}</small>}
    </label>
  );
}

export function Chip({ children, selected = false, ...props }) {
  return (
    <button className={selected ? 'ui-chip selected' : 'ui-chip'} aria-pressed={selected} {...props}>
      <span aria-hidden="true">{selected ? '✓' : ''}</span>
      {children}
    </button>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <section className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function Modal({ children, title, onClose }) {
  return (
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="ui-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        {children}
      </section>
    </div>
  );
}

export function Drawer({ children, title, onClose }) {
  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="application-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        {children}
      </aside>
    </div>
  );
}

export function Toast({ children, action, onClose }) {
  return (
    <div className="undo-toast" role="status">
      <span>{children}</span>
      {action}
      {onClose && <Button aria-label="关闭提示" onClick={onClose} variant="text">关闭</Button>}
    </div>
  );
}

export function EmptyState({ children, icon }) {
  return (
    <section className="empty-state compact-empty">
      {icon}
      {children}
    </section>
  );
}

export function Skeleton({ className = '' }) {
  return <span className={`ui-skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function ConfirmDialog({ children, title }) {
  return (
    <section className="ui-confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title}>
      {children}
    </section>
  );
}
