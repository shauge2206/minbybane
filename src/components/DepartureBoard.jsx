function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('no-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function filterByDirection(departures, direction) {
  return departures.filter((dep) => {
    const dest = (dep.destinationDisplay?.frontText ?? '').toLowerCase();
    if (direction === 'airport') {
      return dest.includes('flesland') || dest.includes('lufthavn');
    }
    return !dest.includes('flesland') && !dest.includes('lufthavn');
  });
}

// Returns status: 'ok' | 'urgent' | 'gone'
function getStatus(departureIso, walkMins) {
  const minsUntilDep = (new Date(departureIso) - new Date()) / 60000;
  const leaveIn = minsUntilDep - walkMins;
  if (leaveIn < 0) return { status: 'gone', leaveIn };
  if (leaveIn <= 3) return { status: 'urgent', leaveIn: Math.round(leaveIn) };
  return { status: 'ok', leaveIn: Math.round(leaveIn) };
}

export default function DepartureBoard({ departures = [], direction, walkMins, tick: _, t }) {
  const all = filterByDirection(departures, direction);

  // Remove rows that have already departed (gone), then take 8
  const visible = all
    .filter((dep) => {
      const time = dep.expectedDepartureTime ?? dep.aimedDepartureTime;
      return getStatus(time, walkMins).status !== 'gone';
    })
    .slice(0, 8);

  return (
    <div className="board">
      {visible.length === 0 ? (
        <p className="no-departures">{t.noDepartures}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{t.colLine}</th>
              <th>{t.colDirection}</th>
              <th>{t.colDeparture}</th>
              <th className="col-leave">{t.colLeave}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((dep) => {
              const line = dep.serviceJourney?.journeyPattern?.line;
              const time = dep.expectedDepartureTime ?? dep.aimedDepartureTime;
              const { status, leaveIn } = getStatus(time, walkMins);

              const leaveLabel = leaveIn === 0 ? t.goNow : `${leaveIn} min`;

              return (
                <tr
                  key={time}
                  className={`dep-row dep-row--${status}`}
                >
                  <td className="status-dot-cell">
                    <span className={`status-dot status-dot--${status}`} />
                  </td>
                  <td className="line-code">{line?.publicCode ?? '—'}</td>
                  <td className="dep-dest">{dep.destinationDisplay?.frontText ?? '—'}</td>
                  <td className="dep-time">{formatTime(time)}</td>
                  <td className={`col-leave leave-label leave-label--${status}`}>
                    {leaveLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
