import type { DomNode, Fiber, RequestIdleCallbackDeadline } from '../types';
import { isEvent, isGone, isNew, isProperty } from '../utils';
import { appState } from './state';

const styleObjectToString = (style: any): string => {
  return Object.keys(style).reduce(
    (acc, key) =>
      `${acc}${key
        .split(/(?=[A-Z])/)
        .join('-')
        .toLowerCase()}:${style[key]};`,
    ''
  );
};

const toChildArray = (children: any, out: any[] = []): any[] => {
  if (children == null || typeof children === 'boolean') {
    return out;
  }

  if (Array.isArray(children)) {
    children.some((child) => {
      toChildArray(child, out);
    });
  } else {
    out.push(children);
  }

  return out;
};

const createElement = (type: string, props: any, ...children: any[]): Fiber => {
  const childArray = toChildArray(children, []);

  return {
    type,
    props: {
      ...props,
      children: childArray.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  };
};

const createTextElement = (text: string): Fiber => {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  };
};

const updateDom = (dom: DomNode, prevProps: any, nextProps: any): void => {
  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(nextProps))
    .forEach((name) => {
      (dom as any)[name] = '';
    });

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      if (name === 'style') {
        (dom as any)[name] = styleObjectToString(nextProps[name]);
      } else {
        (dom as any)[name] = nextProps[name];
      }
    });

  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
};

const commitRoot = (): void => {
  appState.deletions.forEach(commitWork);

  if (appState.wipRoot?.child) {
    commitWork(appState.wipRoot.child);
    appState.currentRoot = appState.wipRoot;
  }

  appState.wipRoot = undefined;
};

const commitWork = (fiber?: Fiber): void => {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  while (!domParentFiber?.dom) {
    domParentFiber = domParentFiber?.parent;
  }

  const domParent = domParentFiber.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null && fiber.alternate) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    // domParent.removeChild(fiber.dom)
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child as Fiber);
  commitWork(fiber.sibling as Fiber);
};

const commitDeletion = (fiber: Fiber, domParent: DomNode): void => {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else if (fiber?.child) {
    commitDeletion(fiber.child, domParent);
  }
};

const workLoop = (deadline: RequestIdleCallbackDeadline): void => {
  let shouldYield = false;
  while (appState.nextUnitOfWork && !shouldYield) {
    appState.nextUnitOfWork = performUnitOfWork(appState.nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!appState.nextUnitOfWork && appState.wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

const performUnitOfWork = (fiber: Fiber): Fiber | undefined => {
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent as Fiber;
  }
};

const updateFunctionComponent = (fiber: Fiber): void => {
  appState.wipFiber = fiber;
  appState.hookIndex = 0;
  appState.wipFiber.hooks = [];
  const children = [(fiber.type as Function)(fiber.props)];
  reconcileChildren(fiber, children);
};

const updateHostComponent = (fiber: Fiber): void => {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  reconcileChildren(fiber, fiber.props.children);
};

const reconcileChildren = (wipFiber: Fiber, elements: any): void => {
  let index = 0;
  // 前回のレンダリング時のファイバーを取得
  let oldFiber = wipFiber.alternate?.child;
  let prevSibling: Fiber | undefined = undefined;

  // 子要素ごとに新しいファイバーを作成
  while (index < elements.length || oldFiber !== undefined) {
    const element = elements[index];
    let newFiber: Fiber | undefined = undefined;

    const sameType = oldFiber && element && element.type === oldFiber.type;

    // 古いファイバーと新しい要素が同じタイプの場合
    // DOMノードを保持し、新しいpropsで更新
    if (sameType) {
      newFiber = {
        type: oldFiber?.type,
        props: element.props,
        dom: oldFiber?.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }
    // タイプが異なり、新しい要素がある場合は新しいDOMノードを作成
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: undefined,
        parent: wipFiber,
        alternate: undefined,
        effectTag: 'PLACEMENT',
      };
    }
    // タイプが異なり、古いファイバーがある場合は、古いノードを削除
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION';
      appState.deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    // 最初の子要素の場合は 親要素の child に設定
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (elements && prevSibling) {
      // 2つ目以降の子要素の場合は、前の要素の sibling（兄弟要素） に設定
      prevSibling.sibling = newFiber;
    }

    // 今回作成したものを、次回参照ように prevSibling に設定
    prevSibling = newFiber;
    index++;
  }
};

const createDom = (fiber: Fiber): DomNode => {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type as string);

  updateDom(dom, {}, fiber.props);
  return dom;
};

const render = (container: DomNode): ((element: any) => void) => {
  return (element: any) => {
    appState.wipRoot = {
      dom: container,
      props: {
        children: [element],
      },
      alternate: appState.currentRoot,
    };
    appState.deletions = [];

    appState.nextUnitOfWork = appState.wipRoot;
  };
};

const createRoot = (container: DomNode) => {
  return {
    render: render(container),
  };
};

export { createElement, createRoot };
