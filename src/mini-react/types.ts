export interface Fiber {
  props: {
    children: Fiber[];
    [key: string]: any;
  };
  type?: string | Function;
  dom?: DomNode;
  parent?: Fiber;
  sibling?: Fiber;
  child?: Fiber;
  alternate?: Fiber;
  effectTag?: string;
  hooks?: any[];
}

export interface Prop {
  children: Fiber[];
  [key: string]: any;
}

export type DomNode = HTMLElement | Text;

export interface RequestIdleCallbackDeadline {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

export interface AppState {
  currentRoot?: Fiber;
  deletions: Fiber[];
  wipFiber?: Fiber;
  nextUnitOfWork?: Fiber;
  wipRoot?: Fiber;
  hookIndex: number;
}
