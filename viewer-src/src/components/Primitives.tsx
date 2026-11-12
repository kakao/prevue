import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import './primitives.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'quiet' };
export function Button({ variant = 'default', className = '', type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} className={`pv-button pv-button-${variant} ${className}`} />;
}

export function IconButton({ label, children, ...props }: Omit<ButtonProps, 'variant'> & { label: string }) {
  return <Button {...props} className={`pv-icon-button ${props.className || ''}`} aria-label={label} title={props.title ?? label}>{children}</Button>;
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'warning' | 'error' }) {
  return <span className={`pv-pill pv-pill-${tone}`}>{children}</span>;
}

export function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="pv-field"><span className="pv-field-label">{label}</span><input {...props} /></label>;
}
