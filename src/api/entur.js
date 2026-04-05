const JOURNEY_API = 'https://api.entur.io/journey-planner/v3/graphql';

const HEADERS = {
  'Content-Type': 'application/json',
  'ET-Client-Name': 'project-light-tram',
};

export async function getNearestBybaneStops(lat, lon, maxDistance = 2000) {
  const query = `
    {
      nearest(
        latitude: ${lat}
        longitude: ${lon}
        maximumDistance: ${maxDistance}
        filterByPlaceTypes: [stopPlace]
        filterByModes: [tram]
      ) {
        edges {
          node {
            distance
            place {
              ... on StopPlace {
                id
                name
                latitude
                longitude
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(JOURNEY_API, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  return data.data?.nearest?.edges ?? [];
}

export async function getDepartures(stopId) {
  const query = `
    {
      stopPlace(id: "${stopId}") {
        name
        situations {
          id
          summary { value language }
          description { value language }
          reportType
          validityPeriod { startTime endTime }
        }
        estimatedCalls(timeRange: 7200, numberOfDepartures: 30) {
          realtime
          expectedDepartureTime
          aimedDepartureTime
          destinationDisplay { frontText }
          serviceJourney {
            id
            journeyPattern {
              line { publicCode transportMode }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(JOURNEY_API, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  const stopPlace = data.data?.stopPlace ?? null;
  if (stopPlace?.estimatedCalls) {
    stopPlace.estimatedCalls = stopPlace.estimatedCalls.filter(
      (c) => c.serviceJourney?.journeyPattern?.line?.transportMode === 'tram'
    );
  }
  return stopPlace;
}
