import { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from './hooks/useGeolocation';
import { getNearestBybaneStops, getDepartures } from './api/entur';
import DepartureBoard from './components/DepartureBoard';
import { translations } from './i18n';
import './App.css';

const WALK_SPEEDS = {
  slow:   { mpm: 55 },
  normal: { mpm: 83 },
  fast:   { mpm: 110 },
};

function walkingMinutes(distanceMeters, speedKey) {
  return Math.ceil(distanceMeters / WALK_SPEEDS[speedKey].mpm);
}

const REFRESH_INTERVAL = 20000;
const TICK_INTERVAL = 15000;

export default function App() {
  const { location, error: geoError, loading: geoLoading } = useGeolocation();
  const [stopData, setStopData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const [selectedStop, setSelectedStop] = useState(0);
  const [walkSpeed, setWalkSpeed] = useState('normal');
  const [direction, setDirection] = useState('sentrum');
  const [lang, setLang] = useState('no');

  const t = translations[lang];

  const fetchData = useCallback(async () => {
    if (!location) return;
    try {
      const edges = await getNearestBybaneStops(location.lat, location.lon);
      const results = await Promise.all(
        edges.slice(0, 3).map(async (edge) => {
          const stop = await getDepartures(edge.node.place.id);
          return stop ? { ...stop, distance: edge.node.distance } : null;
        })
      );
      setStopData(results.filter(Boolean));
    } catch {
      setError('Kunne ikke hente avganger. Prøv igjen.');
    }
  }, [location]);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [location, fetchData]);

  useEffect(() => {
    if (!location) return;
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [location, fetchData]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  if (geoLoading) return <div className="status">{t.statusLocation}</div>;
  if (geoError)   return <div className="status error">{geoError}</div>;
  if (loading)    return <div className="status">{t.statusFinding}</div>;
  if (error)      return <div className="status error">{error}</div>;
  if (!loading && stopData.length === 0) {
    return <div className="status">{t.statusNoneFound}</div>;
  }

  const active = stopData[selectedStop];
  const walkMins = walkingMinutes(active.distance, walkSpeed);

  return (
    <div className="layout">
      <aside className="panel panel-left">
        <div className="title-row">
          <h1 className="app-title">{t.appTitle}</h1>
          <button
            className="lang-btn"
            onClick={() => setLang(lang === 'no' ? 'en' : 'no')}
          >
            {t.langToggle}
          </button>
        </div>

        <section className="control-group">
          <h2 className="control-label">{t.directionLabel}</h2>
          <div className="toggle-group horizontal">
            <button
              className={`toggle-btn ${direction === 'sentrum' ? 'active' : ''}`}
              onClick={() => setDirection('sentrum')}
            >
              {t.directionSentrum}
            </button>
            <button
              className={`toggle-btn ${direction === 'airport' ? 'active' : ''}`}
              onClick={() => setDirection('airport')}
            >
              {t.directionAirport}
            </button>
          </div>
        </section>

        <section className="control-group">
          <h2 className="control-label">{t.speedLabel}</h2>
          <div className="toggle-group horizontal">
            {(['slow', 'normal', 'fast']).map((key) => (
              <button
                key={key}
                className={`toggle-btn ${walkSpeed === key ? 'active' : ''}`}
                onClick={() => setWalkSpeed(key)}
              >
                {t[`speed${key.charAt(0).toUpperCase() + key.slice(1)}`]}
              </button>
            ))}
          </div>
        </section>

        <section className="control-group">
          <h2 className="control-label">{t.stopsLabel}</h2>
          <div className="toggle-group vertical">
            {stopData.map((stop, i) => {
              const mins = walkingMinutes(stop.distance, walkSpeed);
              return (
                <button
                  key={i}
                  className={`toggle-btn stop-btn ${selectedStop === i ? 'active' : ''}`}
                  onClick={() => setSelectedStop(i)}
                >
                  <span className="stop-name">{stop.name}</span>
                  <span className="stop-meta">
                    {t.mAway(Math.round(stop.distance))} · {t.walkTime(mins)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </aside>

      <main className="panel panel-right">
        {active && (
          <>
            <div className="departure-header">
              <h2 className="stop-title">{active.name}</h2>
              <p className="stop-subtitle">
                {t.mAway(Math.round(active.distance))} · {t.walkTime(walkMins)} ·{' '}
                {direction === 'sentrum' ? t.towardsSentrum : t.towardsAirport}
              </p>
            </div>
            <DepartureBoard
              departures={active.estimatedCalls}
              direction={direction}
              walkMins={walkMins}
              tick={tick}
              t={t}
            />
          </>
        )}
      </main>
    </div>
  );
}
