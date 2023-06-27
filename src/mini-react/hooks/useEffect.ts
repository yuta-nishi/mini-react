import { isEqual } from 'lodash';

import { appState } from '../core/state';

export const useEffect = (callback: () => void, deps: any[]) => {
  const oldHook = appState.wipFiber?.alternate?.hooks?.[appState.hookIndex];
  const hook = {
    deps,
  };

  if (oldHook) {
    if (!isEqual(oldHook.deps, hook.deps)) {
      callback();
    }
  } else {
    callback();
  }

  if (appState.wipFiber?.hooks) {
    appState.wipFiber.hooks.push(hook);
    appState.hookIndex++;
  }
};
