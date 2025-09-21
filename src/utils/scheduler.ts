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
      alignToHour?: boolean;
    } = {}
  ): void {
    let nextRun: Date;

    if (options.alignToHour && intervalMs >= 60 * 60 * 1000) {
      // Calculate next hour boundary
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      nextRun = nextHour;
    } else {
      nextRun = new Date(Date.now() + intervalMs);
    }

    const task: ScheduledTask = {
      id,
      name,
      intervalMs,
      handler,
      enabled: options.enabled ?? true,
      errorCount: 0,
      maxErrors: options.maxErrors ?? 5,
      nextRun,
    };

    this.tasks.set(id, task);
    Logger.info(
      `📅 Scheduled task added: ${name} (every ${intervalMs / 1000}s)${
        options.alignToHour ? " - aligned to hour" : ""
      }`
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

    // Use the pre-calculated nextRun time if available, otherwise calculate it
    if (!task.nextRun) {
      task.nextRun = new Date(Date.now() + task.intervalMs);
    }

    // Use absolute time-based scheduling to prevent drift
    const scheduleNextRun = () => {
      if (!task.enabled) return;

      const now = new Date();
      const timeUntilNext = task.nextRun!.getTime() - now.getTime();

      if (timeUntilNext <= 0) {
        // Time to run the task
        this.runTask(task).finally(() => {
          // Schedule next run after current execution
          if (task.enabled) {
            this.scheduleNextExecution(task);
            scheduleNextRun();
          }
        });
      } else {
        // Schedule next check
        setTimeout(scheduleNextRun, Math.min(timeUntilNext, 60000)); // Check at most every minute
      }
    };

    // Start the scheduling loop
    scheduleNextRun();

    this.intervals.set(id, 1); // Use a placeholder value since we're not using setInterval
    Logger.info(
      `▶️ Started scheduled task: ${
        task.name
      } (next run: ${task.nextRun?.toISOString()})`
    );
  }

  /**
   * Stop a specific task
   */
  stopTask(id: string): void {
    const task = this.tasks.get(id);

    if (this.intervals.has(id)) {
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
   * Schedule the next execution for a task
   */
  private scheduleNextExecution(task: ScheduledTask): void {
    const now = new Date();

    if (task.intervalMs >= 60 * 60 * 1000) {
      // For hourly or longer intervals, align to the next hour boundary
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      task.nextRun = nextHour;
    } else {
      // For shorter intervals, use the interval
      task.nextRun = new Date(now.getTime() + task.intervalMs);
    }

    Logger.debug(
      `📅 Next execution scheduled for ${
        task.name
      }: ${task.nextRun.toISOString()}`
    );
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
