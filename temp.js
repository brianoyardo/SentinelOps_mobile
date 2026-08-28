const fs = require('fs');
const file = 'src/app/(main)/ronda-execution.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { getAssignment, getRoute, getCheckpointsByRoute } from '@/services/spatialService';",
  "import { getAssignment, getRoute, getCheckpointsByRoute, getGeofenceByRoute } from '@/services/spatialService';"
);

// Add geofence state
content = content.replace(
  "  const [route, setRoute] = useState<{ name?: string } | null>(null);",
  "  const [route, setRoute] = useState<{ name?: string } | null>(null);\n  const [geofencePolygon, setGeofencePolygon] = useState<import('@/types').GeoPoint[] | null>(null);"
);

// Fetch geofence
content = content.replace(
  "            getRoute(assign.routeId),\n            getCheckpointsByRoute(assign.routeId),\n          ]);",
  "            getRoute(assign.routeId),\n            getCheckpointsByRoute(assign.routeId),\n            getGeofenceByRoute(assign.routeId),\n          ]);"
);

content = content.replace(
  "          if (r) setRoute(r);\n          setCheckpoints(cps.map(checkpointToFlat).filter((cp): cp is FlatCheckpoint => cp !== null));",
  "          if (r) setRoute(r);\n          setCheckpoints(cps.map(checkpointToFlat).filter((cp): cp is FlatCheckpoint => cp !== null));\n          const gf = arguments[0][2];\n          if (gf && gf.geometry && gf.geometry.coordinates && gf.geometry.coordinates[0]) {\n            setGeofencePolygon(gf.geometry.coordinates[0].map(c => ({ lng: c[0], lat: c[1] })));\n          }"
);

// We need a better regex/replace for the gf parsing because arguments[0] won't work perfectly inside a destructuring `const [r, cps] = await Promise.all(...)`
// Let's do it cleaner.
