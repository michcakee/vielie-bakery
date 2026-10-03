import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import { GameProvider } from './ui/GameContext';
import { initPlatform } from './ui/native';
import { initPixelUi, initTouchSparkle } from './ui/pixelUi';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);

initPixelUi();
initTouchSparkle();
initPlatform();
