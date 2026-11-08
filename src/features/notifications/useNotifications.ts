// Notifications in-app (spec : pastilles, pas d'e-mail ni de push).
// SOCLE : implémentation vide. Le chantier "Feed" la remplace (réponses à mes posts,
// réactions, défis et duels plus tard) en gardant cette signature.

export type AppNotification = {
  id: string
  /** "person" : avatar d'un camarade ; "system" : icône */
  kind: 'person' | 'system'
  ppId?: string
  text: string
  detail?: string
  createdAt: string
  unread: boolean
  /** lien optionnel (ex. vers le post) */
  href?: string
  action?: { label: string; href: string }
}

export type NotificationsState = {
  items: AppNotification[]
  unread: number
  markAllRead: () => void
  markRead: (id: string) => void
}

export function useNotifications(): NotificationsState {
  return { items: [], unread: 0, markAllRead: () => {}, markRead: () => {} }
}
