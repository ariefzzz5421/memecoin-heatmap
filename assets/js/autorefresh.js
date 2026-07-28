/* ============================================================
   autorefresh.js — pembaruan data senyap di latar belakang.

   Tick tiap 10 detik; tiap sumber punya jarak minimum sendiri
   (CoinGecko ~60 detik, DeFiLlama ~60 detik, kline lebih jarang)
   supaya tidak menabrak batas rate API gratis. Tidak ada teks
   atau hitung mundur di layar — hanya titik ping kecil di bilah
   status yang berdenyut saat data benar-benar diperbarui.

   Saat tab disembunyikan, refresh berhenti; saat tampil lagi,
   sumber yang jatuh tempo langsung dijalankan.
   ============================================================ */

const TICK_MS = 10 * 1000;

/**
 * @param {Array<{every:number, run:() => Promise<void>|void}>} tasks
 *   every = jarak minimum antar-eksekusi (ms); run = pekerjaan senyap.
 * @param {HTMLElement|null} pingEl titik indikator (opsional).
 */
export function startAutoRefresh(tasks, pingEl = null) {
  const state = tasks.map((t) => ({ ...t, last: Date.now(), busy: false }));

  const pulse = () => {
    if (!pingEl) return;
    pingEl.classList.remove('ping-pulse');
    // paksa restart animasi
    void pingEl.offsetWidth;
    pingEl.classList.add('ping-pulse');
  };

  const tick = async () => {
    if (document.hidden) return;
    const now = Date.now();
    for (const t of state) {
      if (t.busy || now - t.last < t.every) continue;
      t.busy = true;
      t.last = now;
      try {
        await t.run();
        pulse();
      } catch (err) {
        // senyap: kegagalan refresh latar tidak boleh mengganggu halaman
        console.warn('auto-refresh:', err?.message || err);
      } finally {
        t.busy = false;
      }
    }
  };

  const timer = setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });

  return () => clearInterval(timer);
}

/** Sisipkan titik ping ke bilah status halaman. Mengembalikan elemennya. */
export function mountPing() {
  const bar = document.querySelector('.status-bar');
  if (!bar) return null;
  let dot = bar.querySelector('.ping');
  if (!dot) {
    dot = document.createElement('span');
    dot.className = 'ping';
    dot.title = 'Pembaruan data otomatis aktif';
    dot.setAttribute('aria-hidden', 'true');
    bar.append(dot);
  }
  return dot;
}
