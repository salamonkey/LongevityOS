import * as React from 'react';
export interface InputProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  /** Helper text below the field. */
  hint?: string;
  /** Error message; overrides hint and turns the field red. */
  error?: string;
  /** Optional leading Lucide icon name. */
  icon?: string;
  /** @default 'text' */
  type?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}
/** Single-line text field with label, optional icon, hint, and error state. */
export declare function Input(props: InputProps): JSX.Element;
