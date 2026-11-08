// Chemins de l'appli : toujours passer par ces helpers pour faire un lien.
export const routes = {
  home: '/',
  login: '/connexion',
  signup: '/inscription',
  signupPhoto: '/inscription/photo',
  feed: '/feed',
  profile: '/profil',
  profilePhoto: '/profil/photo',
  publicProfile: (pseudo: string) => `/u/${encodeURIComponent(pseudo)}`,
  /** QCM d'un chapitre ; variante "entrainement" (défaut) ou "examen" */
  qcm: (chapterId: string, variante: 'entrainement' | 'examen' = 'entrainement') => `/qcm/${chapterId}?variante=${variante}`,
  qcmResult: (sessionId: string) => `/qcm/bilan/${sessionId}`,
  /** Flashcards : sans chapitre = file du jour (toutes matières) ; avec chapitre = cartes de ce chapitre */
  flashcards: (chapterId?: string) => (chapterId ? `/flashcards?chapitre=${chapterId}` : '/flashcards'),
  exercises: (chapterId: string) => `/exercices/${chapterId}`,
  exercise: (exerciseId: string) => `/exercice/${exerciseId}`,
} as const
