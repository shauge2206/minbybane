import { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from './hooks/useGeolocation';
import { getNearestBybaneStops, getDepartures } from './api/entur';
import DepartureBoard from './components/DepartureBoard';
import TramTracker from './components/TramTracker';
import ServiceBanner from './components/ServiceBanner';
import { translations } from './i18n';
import './App.css';

const WALK_SPEEDS = {
  slow:   { mpm: 55 },
  normal: { mpm: 83 },
  fast:   { mpm: 110 },
};

const DIRECTIONS = ['sentrum', 'airport', 'fyllingsdalen'];

function walkingMinutes(distanceMeters, speedKey) {
  return Math.ceil(distanceMeters / WALK_SPEEDS[speedKey].mpm);
}

function filterByDirection(departures = [], direction) {
  return departures.filter((dep) => {
    const dest = (dep.destinationDisplay?.frontText ?? '').toLowerCase();
    if (direction === 'airport')       return dest.includes('flesland') || dest.includes('lufthavn');
    if (direction === 'fyllingsdalen') return dest.includes('fyllingsdalen');
    return !dest.includes('flesland') && !dest.includes('lufthavn') && !dest.includes('fyllingsdalen');
  });
}

const DEPARTURE_REFRESH = 20000;
const TICK_INTERVAL     = 15000;


export default function App() {
  const { location, error: geoError, loading: geoLoading } = useGeolocation();
  const [stopData, setStopData] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [tick, setTick]         = useState(0);

  const [selectedStop, setSelectedStop] = useState(0);
  const [walkSpeed, setWalkSpeed]       = useState('normal');
  const [direction, setDirection]       = useState('sentrum');
  const [lang, setLang]                 = useState('no');
  const [demo, setDemo]                 = useState(false);
  const [panelOpen, setPanelOpen]       = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const t = translations[lang];

  // Bergen Bystasjonen — fallback location when user is far from bybane
  const BYSTASJONEN = { lat: 60.3887, lon: 5.3318 };

  const fetchDepartures = useCallback(async () => {
    if (!location) return;
    try {
      let edges;
      let fallback = false;

      if (demo) {
        edges = await getNearestBybaneStops(BYSTASJONEN.lat, BYSTASJONEN.lon);
        fallback = true;
      } else {
        edges = await getNearestBybaneStops(location.lat, location.lon);
        if (edges.length === 0) {
          edges = await getNearestBybaneStops(BYSTASJONEN.lat, BYSTASJONEN.lon);
          fallback = true;
        }
      }

      setUsingFallback(fallback);

      const results = await Promise.all(
        edges.slice(0, 3).map(async (edge) => {
          const stop = await getDepartures(edge.node.place.id);
          return stop
            ? { ...stop, distance: edge.node.distance, lat: edge.node.place.latitude, lon: edge.node.place.longitude }
            : null;
        })
      );
      setStopData(results.filter(Boolean));
    } catch {
      setError('Kunne ikke hente avganger. Prøv igjen.');
    }
  }, [location, demo]);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    fetchDepartures().finally(() => setLoading(false));
  }, [location, fetchDepartures]);

  useEffect(() => {
    if (!location) return;
    const id = setInterval(fetchDepartures, DEPARTURE_REFRESH);
    return () => clearInterval(id);
  }, [location, fetchDepartures]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  if (geoLoading) return <div className="status">{t.statusLocation}</div>;
  if (geoError === 'PERMISSION_DENIED') {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return (
      <div className="status geo-denied">
        <div className="geo-denied__icon">📍</div>
        <h2 className="geo-denied__title">{lang === 'no' ? 'Posisjon blokkert' : 'Location blocked'}</h2>
        <p className="geo-denied__body">
          {lang === 'no'
            ? 'MinByBane trenger tilgang til posisjonen din for å finne nærmeste bybanestopp.'
            : 'MinByBane needs your location to find the nearest light rail stop.'}
        </p>
        <ol className="geo-denied__steps">
          {isIOS ? (
            <>
              <li>{lang === 'no' ? 'Åpne Innstillinger på iPhone/iPad' : 'Open Settings on your iPhone/iPad'}</li>
              <li>{lang === 'no' ? 'Trykk på Safari (eller nettleseren du bruker)' : 'Tap Safari (or your browser)'}</li>
              <li>{lang === 'no' ? 'Trykk på «Posisjon» og velg «Spør» eller «Tillat»' : 'Tap "Location" and choose "Ask" or "Allow"'}</li>
              <li>{lang === 'no' ? 'Last inn siden på nytt' : 'Reload the page'}</li>
            </>
          ) : isSafari ? (
            <>
              <li>{lang === 'no' ? 'Gå til Safari → Innstillinger for dette nettstedet' : 'Go to Safari → Settings for This Website'}</li>
              <li>{lang === 'no' ? 'Sett «Posisjon» til «Tillat»' : 'Set "Location" to "Allow"'}</li>
              <li>{lang === 'no' ? 'Last inn siden på nytt' : 'Reload the page'}</li>
            </>
          ) : (
            <>
              <li>{lang === 'no' ? 'Klikk på hengelås-ikonet til venstre i adressefeltet' : 'Click the lock icon in the address bar'}</li>
              <li>{lang === 'no' ? 'Finn «Posisjon» og sett den til «Tillat»' : 'Find "Location" and set it to "Allow"'}</li>
              <li>{lang === 'no' ? 'Last inn siden på nytt' : 'Reload the page'}</li>
            </>
          )}
        </ol>
        <button className="geo-denied__reload" onClick={() => window.location.reload()}>
          {lang === 'no' ? '↺ Last inn på nytt' : '↺ Reload page'}
        </button>
      </div>
    );
  }
  if (geoError)   return <div className="status error">{geoError}</div>;
  if (loading)    return <div className="status">{t.statusFinding}</div>;
  if (error)      return <div className="status error">{error}</div>;
  if (!loading && stopData.length === 0) {
    return <div className="status">{t.statusNoneFound}</div>;
  }

  const active   = stopData[selectedStop];
  const walkMins = walkingMinutes(active.distance, walkSpeed);

  // Which directions have at least one upcoming departure for this stop
  const availableDirections = Object.fromEntries(
    DIRECTIONS.map((d) => [d, filterByDirection(active.estimatedCalls, d).length > 0])
  );

  // Next departure time for current direction (to detect long waits)
  const upcomingDeps = filterByDirection(active.estimatedCalls, direction);
  const nextDep      = upcomingDeps[0];
  const minsToNext   = nextDep
    ? (new Date(nextDep.expectedDepartureTime ?? nextDep.aimedDepartureTime) - new Date()) / 60000
    : null;
  const longWait     = minsToNext !== null && minsToNext > 60;

  // Collect situations from all fetched stops (deduplicated)
  const situations = Object.values(
    stopData.flatMap((s) => s.situations ?? []).reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {})
  );
  const effectiveFallback = usingFallback;

  const directionLabel = (d) => ({
    sentrum:       t.directionSentrum,
    airport:       t.directionAirport,
    fyllingsdalen: t.directionFyllingsdalen,
  })[d];

  const subtitleDirection = direction === 'sentrum'
    ? t.towardsSentrum
    : direction === 'airport'
    ? t.towardsAirport
    : t.towardsFyllingsdalen;

  return (
    <div className={`layout ${panelOpen ? 'panel-is-open' : ''}`}>
      {/* Mobile overlay — tap to close panel */}
      {panelOpen && <div className="panel-overlay" onClick={() => setPanelOpen(false)} />}

      <aside className={`panel panel-left ${panelOpen ? 'panel-left--open' : ''}`}>
        <div className="title-row">
          <h1 className="app-title">{t.appTitle}</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="lang-btn" onClick={() => setLang(lang === 'no' ? 'en' : 'no')}>
              {t.langToggle}
            </button>
            <button
              className={`lang-btn ${demo ? 'lang-btn--demo-on' : ''}`}
              onClick={() => setDemo((d) => !d)}
              title="Forhåndsvis driftsmeldinger og lang ventetid"
            >
              {demo ? '✕ Demo' : 'Demo'}
            </button>
          </div>
        </div>

        <section className="control-group">
          <h2 className="control-label">{t.directionLabel}</h2>
          <div className="toggle-group horizontal">
            {DIRECTIONS.map((d) => {
              const available = availableDirections[d];
              return (
                <button
                  key={d}
                  className={`toggle-btn ${direction === d ? 'active' : ''} ${!available ? 'disabled' : ''}`}
                  onClick={() => available && setDirection(d)}
                  disabled={!available}
                  title={!available ? 'Ingen avganger i denne retningen' : undefined}
                >
                  {directionLabel(d)}
                </button>
              );
            })}
          </div>
        </section>

        <section className="control-group">
          <h2 className="control-label">{t.speedLabel}</h2>
          <div className="toggle-group horizontal">
            {['slow', 'normal', 'fast'].map((key) => (
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
        {/* Mobile toggle button */}
        <button className="panel-toggle-btn" onClick={() => setPanelOpen((o) => !o)} aria-label="Åpne innstillinger">
          ☰
        </button>

        <ServiceBanner situations={situations} lang={lang} />

        {active && (
          <>
            {effectiveFallback && (
              <div className="fallback-banner">
                <span>📍</span>
                <span>
                  {lang === 'no'
                    ? 'Ingen bybane i nærheten — viser avganger fra Bergen sentrum'
                    : 'No light rail nearby — showing departures from Bergen centre'}
                </span>
              </div>
            )}

            <div className="departure-header">
              <h2 className="stop-title">{active.name}</h2>
              <p className="stop-subtitle">
                {effectiveFallback
                  ? (lang === 'no' ? 'Bergen bystasjonen (standardlokasjon)' : 'Bergen station (default location)')
                  : `${t.mAway(Math.round(active.distance))} · ${t.walkTime(walkMins)} · ${subtitleDirection}`}
              </p>
            </div>

            {longWait && minsToNext !== null && (
              <div className="long-wait-banner">
                <span className="long-wait-icon">🕐</span>
                <span>
                  {lang === 'no'
                    ? `Neste avgang om ${Math.round(minsToNext / 60 * 10) / 10} timer`
                    : `Next departure in ${Math.round(minsToNext / 60 * 10) / 10} hours`}
                </span>
              </div>
            )}

            <TramTracker
              departures={active.estimatedCalls ?? []}
              direction={direction}
              walkMins={walkMins}
              tick={tick}
            />

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
