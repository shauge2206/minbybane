function filterByDirection(departures, direction) {
  return departures.filter((dep) => {
    const dest = (dep.destinationDisplay?.frontText ?? '').toLowerCase();
    if (direction === 'airport')       return dest.includes('flesland') || dest.includes('lufthavn');
    if (direction === 'fyllingsdalen') return dest.includes('fyllingsdalen');
    return !dest.includes('flesland') && !dest.includes('lufthavn') && !dest.includes('fyllingsdalen');
  });
}

const MAX_MINS = 22;

// tick prop is consumed to force re-render every interval
export default function TramTracker({ departures = [], direction, walkMins, tick: _ }) {
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

  // Walk marker position as percentage
  const walkMarkerPct = Math.max(0, Math.min(98, ((MAX_MINS - walkMins) / MAX_MINS) * 100));

  return (
    <div className="tracker">
      <div className="tracker-label">Live</div>
      <div className="tracker-track-wrap">
        {/* "Her må du gå" annotation above the walk marker */}
        <div
          className="walk-marker-label"
          style={{ left: `${walkMarkerPct}%` }}
        >
          Her må du gå
        </div>

        <div className="tracker-track">
          {/* Stop pin */}
          <div className="tracker-stop-pin" />

          {/* Walk threshold line */}
          <div
            className="tracker-walk-marker"
            style={{ left: `${walkMarkerPct}%` }}
          />

          {/* Trams */}
          {filtered.map(({ dep, minsUntil, delaySec, line }, i) => {
            const pct      = Math.max(2, Math.min(95, ((MAX_MINS - minsUntil) / MAX_MINS) * 100));
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
                style={{ left: `${pct}%`, transition: 'left 12s linear' }}
                title={`${dest} — om ${Math.round(minsUntil)} min${isLate ? ` (+${delayMins} min forsinket)` : ''}`}
              >
                {line && <span className="tram-line-badge">{line}</span>}
                <span className="tram-icon">🚋</span>
                <div className="tram-labels">
                  <span className="tram-mins">
                    {Math.round(minsUntil) <= 0 ? 'Nå' : `${Math.round(minsUntil)}m`}
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
