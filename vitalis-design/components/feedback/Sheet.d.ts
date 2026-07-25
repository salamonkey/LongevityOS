import * as React from 'react';
export interface SheetProps {
  open?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
/** Bottom sheet that slides up over the screen with a scrim; used for quick add and confirmations. */
export declare function Sheet(props: SheetProps): JSX.Element;
