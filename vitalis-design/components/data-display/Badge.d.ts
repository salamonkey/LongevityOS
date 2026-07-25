import * as React from 'react';
export interface BadgeProps {
  /** Semantic status. @default 'neutral' */
  status?: 'due' | 'done' | 'upcoming' | 'overdue' | 'neutral';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
/** Small rounded status pill. */
export declare function Badge(props: BadgeProps): JSX.Element;
