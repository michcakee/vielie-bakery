import { useGame } from '../components/GameContext';
import { CONCEPTS, CONCEPT_ORDER } from '../game/education';

export function NotebookView() {
  const { state } = useGame();
  const learned = CONCEPT_ORDER.filter((c) => state.learned.includes(c));
  return (
    <section className="panel notebook" aria-labelledby="nb-h">
      <div className="panel-head">
        <h2 id="nb-h">Economics notebook</h2>
        <p className="panel-sub">
          {learned.length} of {CONCEPT_ORDER.length} ideas collected. New pages appear as they come up in play, or when you click an underlined word.
        </p>
      </div>
      <ol className="nb-pages">
        {CONCEPT_ORDER.map((id) => {
          const c = CONCEPTS[id];
          const got = state.learned.includes(id);
          return (
            <li key={id} className={`nb-page ${got ? '' : 'is-blank'}`}>
              {got ? (
                <>
                  <h3>{c.term}</h3>
                  <p>{c.short}</p>
                  <p className="nb-example">{c.example}</p>
                </>
              ) : (
                <>
                  <h3 aria-label="Not yet discovered">Blank page</h3>
                  <p className="muted">Keep trading to discover this idea.</p>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
