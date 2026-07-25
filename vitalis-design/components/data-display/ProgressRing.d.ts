import * as React from 'react';
export interface ProgressRingProps {
  /** 0–100. */
  value?: number;
  /** Diameter in px. @default 72 */
  size?: number;
  /** Ring thickness in px. @default 8 */
  stroke?: number;
  /** Progress color. @default 'var(--color-primary)' */
  color?: string;
  /** Track color. @default 'var(--slate-100)' */
  track?: string;
  /** Center label; defaults to "<value>%". */
  label?: React.ReactNode;
  /** Small text under the label. */
  sublabel?: string;
  style?: React.CSSProperties;
}
/**
 * Circular progress metric — the dashboard "Vorsorge-Score".
 * @startingPoint section="Data display" subtitle="Animated score ring" viewport="200x200"
 */
export declare function ProgressRing(props: ProgressRingProps): JSX.Element;
