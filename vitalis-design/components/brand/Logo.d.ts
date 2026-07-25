import * as React from 'react';
export interface LogoProps {
  /** Shield size in px. @default 34 */
  size?: number;
  /** Show the "Vitalis" wordmark next to the shield. @default true */
  word?: boolean;
  /** White shield for dark backgrounds. @default false */
  reversed?: boolean;
  /** Gap between shield and wordmark. @default 10 */
  gap?: number;
  /** Wordmark font size; defaults to size * 0.82. */
  wordSize?: number;
  style?: React.CSSProperties;
}
/**
 * Vitalis logo — shield mark holding the Vorsorge-Ring, with optional wordmark.
 * @startingPoint section="Brand" subtitle="Logo — mark & wordmark" viewport="360x120"
 */
export declare function Logo(props: LogoProps): JSX.Element;
