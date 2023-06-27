import { App } from './App';
import { MiniReact } from './mini-react';

const root = MiniReact.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
