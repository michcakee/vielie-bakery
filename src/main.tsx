import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import { CrashScreen } from './ui/Crash';
import { GameProvider } from './ui/GameContext';
import { initPlatform } from './ui/native';
import { initPixelUi, initTouchSparkle } from './ui/pixelUi';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashScreen>
      <GameProvider>
        <App />
      </GameProvider>
    </CrashScreen>
  </StrictMode>,
);

initPixelUi();
initTouchSparkle();
initPlatform();
