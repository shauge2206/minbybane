import { useState, useEffect } from 'react';

function filterByDirection(departures, direction) {
  return departures.filter((dep) => {
    const dest = (dep.destinationDisplay?.frontText ?? '').toLowerCase();
    if (direction === 'airport')       return dest.includes('flesland') || dest.includes('lufthavn');
    if (direction === 'fyllingsdalen') return dest.includes('fyllingsdalen');
    return !dest.includes('flesland') && !dest.includes('lufthavn') && !dest.includes('fyllingsdalen');
  });
}

const MAX_MINS = 22;

// tick prop kept for API compatibility but unused — component has its own clock
export default function TramTracker({ departures = [], stopName, direction, walkMins, tick: _, lang = 'no' }) {
  const [, setSecond] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSecond((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();

  const filtered = filterByDirection(departures, direction)
    .map((dep) => {
      const expected  = dep.expectedDepartureTime ?? dep.aimedDepartureTime;
      const aimed     = dep.aimedDepartureTime;
      const minsUntil = (new Date(expected) - now) / 60000;
      const delaySec  = (new Date(expected) - new Date(aimed)) / 1000;
      const line      = dep.serviceJourney?.journeyPattern?.line?.publicCode ?? '';
      return { dep, minsUntil, delaySec, line };
    })
    .filter(({ minsUntil }) => minsUntil > -1 && minsUntil <= MAX_MINS)
    .slice(0, 5);

  if (!filtered.length) return null;

  const walkMarkerPct = Math.max(0, Math.min(98, ((MAX_MINS - walkMins) / MAX_MINS) * 100));

  const leaveAt = new Date(now.getTime() + walkMins * 60000);
  const leaveAtStr = leaveAt.toLocaleTimeString(lang === 'no' ? 'nb-NO' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  const walkLabel = lang === 'no' ? `Gå ${leaveAtStr}` : `Leave ${leaveAtStr}`;

  return (
    <div className="tracker">
      <div className="tracker-header">
        {stopName && <span className="tracker-stop-name">{stopName}</span>}
        <span className="tracker-label">Live</span>
      </div>
      <div className="tracker-track-wrap">
        <div
          className="walk-marker-label"
          style={{ left: `${walkMarkerPct}%` }}
        >
          {walkLabel}
        </div>

        <div className="tracker-track">
          <div className="tracker-stop-pin" />

          <div
            className="tracker-walk-marker"
            style={{ left: `${walkMarkerPct}%` }}
          />

          {filtered.map(({ dep, minsUntil, delaySec, line }, i) => {
            const pct       = Math.max(2, Math.min(95, ((MAX_MINS - minsUntil) / MAX_MINS) * 100));
            const delayMins = Math.round(delaySec / 60);
            const isLate    = delayMins > 0;
            const isEarly   = delayMins < 0;
            const canCatch  = minsUntil >= walkMins;

            let delayLabel = null;
            if (isLate)  delayLabel = `+${delayMins}m`;
            if (isEarly) delayLabel = `${delayMins}m`;

            const dest = dep.destinationDisplay?.frontText ?? '';

            return (
              <div
                key={dep.aimedDepartureTime + i}
                className={`tram-dot ${!canCatch ? 'tram-dot--missed' : isLate ? 'tram-dot--late' : ''}`}
                style={{ left: `${pct}%` }}
                title={`${dest} — om ${Math.round(minsUntil)} min${isLate ? ` (+${delayMins} min forsinket)` : ''}`}
              >
                {line && <span className="tram-line-badge">{line}</span>}
                <span className="tram-icon">🚋</span>
                <div className="tram-labels">
                  <span className="tram-mins">
                    {Math.round(minsUntil) <= 0 ? (lang === 'no' ? 'Nå' : 'Now') : `${Math.round(minsUntil)}m`}
                  </span>
                  {delayLabel && (
                    <span className={`tram-delay ${isEarly ? 'tram-delay--early' : ''}`}>
                      {delayLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
