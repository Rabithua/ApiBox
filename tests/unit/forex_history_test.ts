import { CacheManager } from "../../src/cache/manager.ts";

Deno.test("Forex history - append and retrieve hourly snapshots", () => {
  const cm = CacheManager.getInstance();

  // 清理之前的测试数据
  cm.delete("forex:history:XAU");

  const now = Date.now();
  // 创建三个小时的快照（跨越不同小时）
  const t1 = now - 2 * 3600000; // 两小时前
  const t2 = now - 3600000; // 一小时前
  const t3 = now; // 现在

  cm.appendHourlySnapshot("forex:history:XAU", { timestamp: t1, value: 1800 });
  cm.appendHourlySnapshot("forex:history:XAU", { timestamp: t2, value: 1810 });
  cm.appendHourlySnapshot("forex:history:XAU", { timestamp: t3, value: 1820 });

  const all = cm.getHistory("forex:history:XAU");
  if (all.length < 3) throw new Error("History length expected >= 3");

  // 测试范围查询
  const from = t2 - 1000;
  const filtered = cm.getHistory("forex:history:XAU", from);
  if (!filtered.every((h) => h.timestamp >= from))
    throw new Error("Filtered start failed");

  // 测试裁剪: 生成超过最大条数的数据
  for (let i = 0; i < 200; i++) {
    cm.appendHourlySnapshot("forex:history:XAU", {
      timestamp: now + (i + 1) * 3600000,
      value: 1900 + i,
    });
  }

  const after = cm.getHistory("forex:history:XAU");
  if (after.length > 24 * 7)
    throw new Error("History not trimmed to max entries");
});
