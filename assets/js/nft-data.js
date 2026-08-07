/* Live NFT floor data. The same-origin backend caches the CoinGecko NFT
   collection endpoint; a collection the upstream cannot resolve stays absent
   rather than being filled with an estimate. */

let snapshot = null;
let savedAt = 0;
let inflight = null;

export async function fetchNftFloors({ force = false } = {}) {
  if (!force && snapshot && Date.now() - savedAt < 30_000) return snapshot;
  if (inflight) return inflight;
  inflight = fetch('/api/market/?resource=nft', { headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Floor data HTTP ${response.status}`);
      const data = await response.json();
      if (!data?.ok) throw new Error(data?.error || 'Floor data unavailable');
      snapshot = data;
      savedAt = Date.now();
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export const fmtEth = (value, digits = 2) =>
  (Number.isFinite(value) ? `${value.toLocaleString('en-US', { maximumFractionDigits: digits })} ETH` : 'Unavailable');

export const fmtMonth = (value) => {
  const [year, month] = String(value).split('-');
  if (!month) return year;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(month) - 1] || month} ${year}`;
};

/* Accepts YYYY, YYYY-MM, or YYYY-MM-DD and never invents a missing part. */
export const fmtResearchDate = (value) => {
  const parts = String(value).split('-');
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return fmtMonth(value);
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
};
