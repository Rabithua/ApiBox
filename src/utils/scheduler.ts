/**
 * Task scheduler utility
 * Handles cron-like scheduled tasks
 */

import { Logger } from "./helpers.ts";

export interface ScheduledTask {
  id: string;
  name: string;
  intervalMs: number;
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  errorCount: number;
  maxErrors: number;
}

export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, number> = new Map();
  private isRunning = false;

  /**
   * Add a new scheduled task
   */
  addTask(
    id: string,
    name: string,
    intervalMs: number,
    handler: () => Promise<void>,
    options: {
      enabled?: boolean;
      maxErrors?: number;
      runImmediately?: boolean;
    } = {}
  ): void {
    const task: ScheduledTask = {
      id,
      name,
      intervalMs,
      handler,
      enabled: options.enabled ?? true,
      errorCount: 0,
      maxErrors: options.maxErrors ?? 5,
      nextRun: new Date(Date.now() + intervalMs),
    };

    this.tasks.set(id, task);
    Logger.info(
      `📅 Scheduled task added: ${name} (every ${intervalMs / 1000}s)`
    );

    // Run immediately if requested
    if (options.runImmediately && task.enabled) {
      this.runTask(task).catch(() => {
        // Error already logged in runTask
      });
    }
  }

  /**
   * Remove a scheduled task
   */
  removeTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      this.stopTask(id);
      this.tasks.delete(id);
      Logger.info(`🗑️ Scheduled task removed: ${task.name}`);
    }
  }

  /**
   * Start a specific task
   */
  startTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      Logger.error(`Task not found: ${id}`);
      return;
    }

    if (this.intervals.has(id)) {
      Logger.warn(`Task already running: ${task.name}`);
      return;
    }

    task.enabled = true;
    task.nextRun = new Date(Date.now() + task.intervalMs);

    const intervalId = setInterval(async () => {
      if (task.enabled) {
        await this.runTask(task);
      }
    }, task.intervalMs);

    this.intervals.set(id, intervalId);
    Logger.info(`▶️ Started scheduled task: ${task.name}`);
  }

  /**
   * Stop a specific task
   */
  stopTask(id: string): void {
    const task = this.tasks.get(id);
    const intervalId = this.intervals.get(id);

    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
    }

    if (task) {
      task.enabled = false;
      Logger.info(`⏹️ Stopped scheduled task: ${task.name}`);
    }
  }

  /**
   * Start all tasks
   */
  start(): void {
    if (this.isRunning) {
      Logger.warn("Scheduler already running");
      return;
    }

    this.isRunning = true;
    Logger.info("🚀 Starting task scheduler...");

    for (const [id, task] of this.tasks) {
      if (task.enabled) {
        this.startTask(id);
      }
    }

    Logger.success(
      `✅ Task scheduler started with ${this.intervals.size} active tasks`
    );
  }

  /**
   * Stop all tasks
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    Logger.info("🛑 Stopping task scheduler...");

    for (const id of this.intervals.keys()) {
      this.stopTask(id);
    }

    this.isRunning = false;
    Logger.success("✅ Task scheduler stopped");
  }

  /**
   * Get task status
   */
  getTaskStatus(id: string): ScheduledTask | null {
    return this.tasks.get(id) || null;
  }

  /**
   * Get all tasks status
   */
  getAllTasksStatus(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Run a task immediately
   */
  private async runTask(task: ScheduledTask): Promise<void> {
    if (!task.enabled) {
      return;
    }

    try {
      Logger.debug(`🔄 Running scheduled task: ${task.name}`);
      task.lastRun = new Date();

      await task.handler();

      task.nextRun = new Date(Date.now() + task.intervalMs);
      task.errorCount = 0; // Reset error count on success

      Logger.debug(`✅ Completed scheduled task: ${task.name}`);
    } catch (error) {
      task.errorCount++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      Logger.error(
        `❌ Task failed: ${task.name} - ${errorMessage} (${task.errorCount}/${task.maxErrors})`
      );

      // Disable task if too many errors
      if (task.errorCount >= task.maxErrors) {
        Logger.error(`🚫 Disabling task due to too many errors: ${task.name}`);
        task.enabled = false;
        this.stopTask(task.id);
      }
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    totalTasks: number;
    activeTasks: number;
    disabledTasks: number;
    errorTasks: number;
  } {
    const tasks = Array.from(this.tasks.values());

    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter((t) => t.enabled).length,
      disabledTasks: tasks.filter((t) => !t.enabled).length,
      errorTasks: tasks.filter((t) => t.errorCount > 0).length,
    };
  }
}

// Global scheduler instance
let globalScheduler: TaskScheduler | null = null;

/**
 * Get the global scheduler instance
 */
export function getScheduler(): TaskScheduler {
  if (!globalScheduler) {
    globalScheduler = new TaskScheduler();
  }
  return globalScheduler;
}

/**
 * Initialize and start the global scheduler
 */
export function initializeScheduler(): TaskScheduler {
  const scheduler = getScheduler();
  if (!scheduler.getAllTasksStatus().length) {
    Logger.info("📅 Scheduler initialized (no tasks)");
  }
  return scheduler;
}

/**
 * Shutdown the global scheduler
 */
export function shutdownScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
    globalScheduler = null;
  }
}
