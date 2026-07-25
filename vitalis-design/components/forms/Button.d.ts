import * as React from 'react';
export interface ButtonProps {
  /** @default 'primary' */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Lucide icon name rendered before the label. */
  iconLeft?: string;
  /** Lucide icon name rendered after the label. */
  iconRight?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
/**
 * Primary tap action. Filled blue by default; pill-shaped.
 * @startingPoint section="Forms" subtitle="Primary / secondary / ghost / danger" viewport="360x140"
 */
export declare function Button(props: ButtonProps): JSX.Element;
