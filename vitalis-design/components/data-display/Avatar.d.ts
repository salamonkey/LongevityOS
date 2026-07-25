import * as React from 'react';
export interface AvatarProps {
  /** Full name — initials are derived when no image is given. */
  name?: string;
  /** Optional image URL. */
  src?: string;
  /** 'sm' | 'md' | 'lg' or an explicit pixel number. @default 'md' */
  size?: 'sm' | 'md' | 'lg' | number;
  style?: React.CSSProperties;
}
/** Round avatar showing an image or derived initials. */
export declare function Avatar(props: AvatarProps): JSX.Element;
