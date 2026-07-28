/* Silent ten-second browser polling. Upstream freshness and rate limits are
   controlled by the same-origin backend cache. */

const TICK_MS = 10 * 1000;

export function startAutoRefresh(tasks) {
  const state = tasks.map((task) => ({ ...task, last: Date.now(), busy: false }));

  const tick = async () => {
    if (document.hidden) return;
    const now = Date.now();
    for (const task of state) {
      if (task.busy || now - task.last < task.every) continue;
      task.busy = true;
      task.last = now;
      try {
        await task.run();
      } catch (error) {
        console.warn('auto-refresh:', error?.message || error);
      } finally {
        task.busy = false;
      }
    }
  };

  const timer = setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
  return () => clearInterval(timer);
}
