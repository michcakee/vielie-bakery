import { BakeryScene } from '../components/BakeryScene';
import { useGame } from '../components/GameContext';

export function TitleScreen({ onPlay }: { onPlay: () => void }) {
  const { state, dispatch, hasSave } = useGame();
  const resumable = hasSave && (state.history.length > 0 || state.day > 1);

  return (
    <main className="title" aria-labelledby="title-h">
      <div className="title-text">
        <h1 id="title-h">
          <span className="title-word">Vielie</span>
          <span className="title-word title-word-2">Bakery</span>
        </h1>
        <p className="title-tag">Run a bakery. Learn how money moves.</p>
        <p className="title-lede">
          Thirty days, four products, one small shop on Vielie Lane. Plan the bake, set prices, buy ingredients and watch what customers do. Every number in the
          game follows a real economic model you can inspect.
        </p>
        <div className="title-actions">
          {resumable ? (
            <>
              <button className="btn btn-bake" onClick={onPlay}>
                Continue day {state.day}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  dispatch({ type: 'newGame' });
                  onPlay();
                }}
              >
                Start a new season
              </button>
            </>
          ) : (
            <button
              className="btn btn-bake"
              onClick={() => {
                if (state.history.length || state.day > 1) dispatch({ type: 'newGame' });
                onPlay();
              }}
            >
              Open the shop
            </button>
          )}
        </div>
        <p className="title-foot">Progress saves automatically in this browser. No account, no tracking.</p>
      </div>
      <div className="title-art">
        <BakeryScene
          mode="morning"
          weather="sunny"
          shelf={{ sourdough: 30, matcha: 54, muffin: 42, croissant: 36 }}
          customers={110}
          owned={[]}
          greenScore={60}
          competitor={false}
          chalk="Fresh    today"
        />
      </div>
    </main>
  );
}
