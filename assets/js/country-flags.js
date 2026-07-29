const FLAGS = {
  'Seychelles': 'sc',
  'Cayman Islands': 'ky',
  'United States': 'us',
  'British Virgin Islands': 'vg',
  'Lithuania': 'lt',
  'South Korea': 'kr',
  'Luxembourg': 'lu',
  'Samoa': 'ws',
  'Indonesia': 'id',
  'Singapore': 'sg',
  'Australia': 'au',
  'Panama': 'pa',
  'Gibraltar': 'gi',
  'Japan': 'jp',
  'Hong Kong': 'hk',
  'Brazil': 'br',
  'Estonia': 'ee',
  'Switzerland': 'ch',
  'Turkey': 'tr',
  'Türkiye': 'tr',
  'Netherlands': 'nl',
  'United Kingdom': 'gb',
  'Malta': 'mt',
  'Germany': 'de',
  'France': 'fr',
  'Canada': 'ca',
};

export function countryFlag(country) {
  const code = FLAGS[country];
  return code ? `/assets/img/flags/${code}.svg` : '';
}

export function flagImage(country, className = 'country-flag') {
  const src = countryFlag(country);
  if (!src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = src;
  img.alt = '';
  img.width = 22;
  img.height = 15;
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}
