import { logger } from "./logger"

export type AlertSeverity = "low" | "medium" | "high" | "critical"

export interface Alert {
  title: string
  message: string
  severity: AlertSeverity
  tags?: Record<string, string>
  timestamp: string
}

class AlertManager {
  private alertThresholds = new Map<string, number>()
  private alertCounts = new Map<string, number>()

  trigger(alert: Alert) {
    logger.error(`[ALERT] ${alert.title}`, undefined, alert as any)

    // Send to alert service (PagerDuty, Slack, etc.)
    if (process.env.NODE_ENV === "production") {
      this.sendAlert(alert)
    }
  }

  /**
   * Trigger alert only if threshold is exceeded
   */
  triggerThrottled(key: string, alert: Alert, threshold = 10, windowMs = 60000) {
    const count = (this.alertCounts.get(key) || 0) + 1
    this.alertCounts.set(key, count)

    // Reset count after window
    setTimeout(() => {
      this.alertCounts.delete(key)
    }, windowMs)

    if (count >= threshold) {
      this.trigger({
        ...alert,
        message: `${alert.message} (occurred ${count} times in last ${windowMs / 1000}s)`,
      })
    }
  }

  private async sendAlert(alert: Alert) {
    // Placeholder for alert service integration
    if (process.env.ALERT_WEBHOOK_URL) {
      try {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alert),
        })
      } catch (error) {
        logger.error("Failed to send alert", error as Error)
      }
    }
  }
}

export const alertManager = new AlertManager()
