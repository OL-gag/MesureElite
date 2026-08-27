type Priority = 'urgent' | 'normal' | 'flexible'

interface PriorityBadgeProps {
  priority: Priority
  daysUntilDeadline: number
}

export default function PriorityBadge({ priority, daysUntilDeadline }: PriorityBadgeProps) {
  const getStyles = (prio: Priority) => {
    switch (prio) {
      case 'urgent':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-300',
          icon: '🔴',
        }
      case 'normal':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: '🟡',
        }
      case 'flexible':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-300',
          icon: '🟢',
        }
    }
  }

  const styles = getStyles(priority)
  const label =
    priority === 'urgent' && daysUntilDeadline < 0
      ? `OVERDUE (${Math.abs(daysUntilDeadline)} days)`
      : `${priority.toUpperCase()} (${daysUntilDeadline}d)`

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${styles.bg} ${styles.text}`}>
      <span>{styles.icon}</span>
      {label}
    </span>
  )
}
