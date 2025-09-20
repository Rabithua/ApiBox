import { ProxyEngine } from "../proxy/engine.ts";

function msUntilNextHour(): number {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next.getTime() - now.getTime();
}

let running = false;

async function doCollect() {
  if (running) return;
  running = true;
  const engine = ProxyEngine.getInstance();
  try {
    const params = {
      pathParams: { instrument: "XAU", currency: "USD" },
      queryParams: {},
      headers: {},
    };

    // 使用代理引擎发起请求，复用现有逻辑（缓存、历史追加等）
    await engine.proxyRequest("forex", "quote", params);
  } catch (err) {
    console.warn("自动采集失败:", err);
  } finally {
    running = false;
  }
}

export function startHourlyCollector() {
  // 先等待到下一个整点
  setTimeout(() => {
    // 首次执行
    doCollect().catch(console.error);
    // 每小时执行一次
    setInterval(() => doCollect().catch(console.error), 60 * 60 * 1000);
  }, msUntilNextHour());
}

export default { startHourlyCollector };
