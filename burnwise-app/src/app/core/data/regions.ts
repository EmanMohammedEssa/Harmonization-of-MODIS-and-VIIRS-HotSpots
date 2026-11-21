export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// Approximate boxes, for quick filtering of the map by area.
export const REGIONS: Record<string, { label: string; latMin: number; latMax: number; lonMin: number; lonMax: number }> = {
  cairo:   { label: 'Greater Cairo & Giza',        latMin: 29.5,  latMax: 30.5,  lonMin: 30.75, lonMax: 31.75 },
  delta:   { label: 'Nile Delta',                  latMin: 30.0,  latMax: 31.6,  lonMin: 30.0,  lonMax: 32.0 },
  north:   { label: 'North Coast & Alexandria',    latMin: 30.5,  latMax: 31.6,  lonMin: 25.0,  lonMax: 30.25 },
  suez:    { label: 'Suez Canal',                  latMin: 29.75, latMax: 31.5,  lonMin: 32.0,  lonMax: 32.75 },
  sinai:   { label: 'Sinai',                       latMin: 27.5,  latMax: 31.5,  lonMin: 32.5,  lonMax: 34.9 },
  middle:  { label: 'Middle Egypt (Fayoum–Minya)', latMin: 27.5,  latMax: 29.75, lonMin: 29.75, lonMax: 31.5 },
  upper:   { label: 'Upper Egypt (Sohag–Aswan)',   latMin: 22.0,  latMax: 27.5,  lonMin: 30.5,  lonMax: 33.0 },
  redsea:  { label: 'Red Sea coast',               latMin: 21.75, latMax: 28.5,  lonMin: 33.0,  lonMax: 36.25 },
  western: { label: 'Western Desert & Siwa',       latMin: 21.75, latMax: 31.5,  lonMin: 25.0,  lonMax: 29.5 },
};
