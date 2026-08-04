/* Silent ten-second browser polling. Upstream freshness and rate limits are
   controlled by the same-origin backend cache. */

const TICK_MS = 10 * 1000;

export function startAutoRefresh(tasks) {
  const state = tasks.map((task) => ({
    ...task,
    busy: false,
    failures: 0,
    nextAt: Date.now() + task.every,
  }));

  const tick = async () => {
    if (document.hidden) return;
    const now = Date.now();
    for (const task of state) {
      if (task.busy || now < task.nextAt) continue;
      task.busy = true;
      try {
        await task.run();
        task.failures = 0;
        task.nextAt = Date.now() + task.every;
      } catch (error) {
        task.failures += 1;
        task.nextAt = Date.now() + Math.min(task.every * (2 ** task.failures), 5 * 60 * 1000);
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
