import * as React from 'react';
export interface IconButtonProps {
  /** Lucide icon name. */
  icon: string;
  /** @default 'soft' */
  variant?: 'soft' | 'solid' | 'ghost' | 'surface';
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label (aria-label). */
  label?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}
/** Circular icon-only button — headers, toolbars, row affordances. */
export declare function IconButton(props: IconButtonProps): JSX.Element;
