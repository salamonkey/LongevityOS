import * as React from 'react';
export interface IconProps {
  /** Lucide icon name, e.g. "syringe", "shield-check", "chevron-right". */
  name: string;
  /** Pixel size (width & height). @default 20 */
  size?: number;
  /** @default 1.75 */
  strokeWidth?: number;
  /** @default 'currentColor' */
  color?: string;
  style?: React.CSSProperties;
}
/** Lucide line-icon wrapper. Requires the Lucide UMD script on the page. */
export declare function Icon(props: IconProps): JSX.Element;
