export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideGeofence(position, location) {
  if (!position?.coords || !location) return { ok: false, distance: null, radius: null };
  const { latitude, longitude } = position.coords;
  if (![latitude, longitude, location.latitude, location.longitude].every(Number.isFinite)) {
    return { ok: false, distance: null, radius: location.gps_radius_m ?? 200 };
  }
  const radius = Number(location.gps_radius_m ?? 200);
  const distance = haversineDistanceMeters(latitude, longitude, Number(location.latitude), Number(location.longitude));
  // Keep the client aligned with the database: the point is valid only when strictly inside the radius.
  return { ok: distance < radius, distance, radius };
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GEOLOCALIZACAO_NAO_DISPONIVEL'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
      ...options,
    });
  });
}

export function explainGeofenceError(error) {
  const code = error?.code || error?.message || '';
  if (String(code).includes('1') || String(code).includes('PERMISSION')) return 'Permita a localização do dispositivo para registar o ponto.';
  if (String(code).includes('2')) return 'Não foi possível obter uma localização fiável. Tente novamente num local com sinal GPS.';
  if (String(code).includes('3')) return 'A leitura GPS demorou demasiado. Tente novamente.';
  if (String(code).includes('FORA_DO_RAIO')) return 'Está fora da área autorizada para esta instalação.';
  if (String(code).includes('GEOLOCALIZACAO_OBRIGATORIA')) return 'A localização é obrigatória para registar o ponto.';
  return error?.message || 'Não foi possível validar a localização.';
}
