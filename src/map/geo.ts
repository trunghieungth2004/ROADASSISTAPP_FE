export function circlePolygon(
  lat: number,
  lng: number,
  radiusMeters: number,
  points = 64,
): number[][][] {
  const ring: number[][] = [];
  const earth = 6371000;
  const d = radiusMeters / earth;
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  for (let i = 0; i <= points; i++) {
    const b = (i / points) * 2 * Math.PI;
    const pLat = Math.asin(
      Math.sin(latR) * Math.cos(d) +
        Math.cos(latR) * Math.sin(d) * Math.cos(b),
    );
    const pLng =
      lngR +
      Math.atan2(
        Math.sin(b) * Math.sin(d) * Math.cos(latR),
        Math.cos(d) - Math.sin(latR) * Math.sin(pLat),
      );
    ring.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }
  return [ring];
}
