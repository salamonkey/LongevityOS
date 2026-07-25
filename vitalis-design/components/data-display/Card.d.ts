import * as React from 'react';
export interface CardProps {
  children?: React.ReactNode;
  /** Inner padding in px. @default 16 */
  padding?: number;
  /** Soft shadow lift. @default true */
  elevated?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}
/** Generic white surface container with soft shadow and 16px radius. */
export declare function Card(props: CardProps): JSX.Element;
