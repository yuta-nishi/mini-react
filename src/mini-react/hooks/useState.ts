import { appState } from '../core/state';

export const useState = <T>(initial: T): [T, (action: (prevState: T) => T) => void] => {
  const oldHook = appState.wipFiber?.alternate?.hooks?.[appState.hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [] as any[],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action: any) => (hook.state = action(hook.state)));

  const setState = (action: any) => {
    if (typeof action === 'function') {
      hook.queue.push(action);
    } else {
      hook.queue.push(() => action);
    }

    appState.wipRoot = {
      dom: appState.currentRoot!.dom,
      props: appState.currentRoot!.props,
      alternate: appState.currentRoot,
    };

    appState.nextUnitOfWork = appState.wipRoot;
    appState.deletions = [];
  };

  if (appState.wipFiber) {
    appState.wipFiber.hooks!.push(hook);
    appState.hookIndex++;
  }

  return [hook.state, setState];
};
