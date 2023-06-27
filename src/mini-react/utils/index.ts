export const isEvent = (key: string): boolean => key.startsWith('on');

export const isProperty = (key: string): boolean => key !== 'children' && !isEvent(key);

export const isNew =
  (prev: any, next: any) =>
  (key: string): boolean =>
    prev[key] !== next[key];

export const isGone =
  (next: any) =>
  (key: string): boolean =>
    !(key in next);
