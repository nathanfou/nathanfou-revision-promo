// Reprise d'une série après un rechargement de la page (F5, rechargement mobile).
//
// L'état d'une série en cours (cartes ou questions tirées, position, réponses déjà données)
// est copié dans le sessionStorage de l'onglet : il survit au rechargement mais pas à la
// fermeture de l'onglet, et chaque onglet a le sien. Un seul emplacement par mode, écrasé à
// chaque nouvelle série.
//
// Une copie n'est reprise que si elle a moins de 12 h et si son "scope" correspond : même
// utilisateur, même page, même entrée d'historique (location.key, conservée par le navigateur
// au rechargement mais nouvelle à chaque clic sur un lien). Relancer une série depuis un lien
// en démarre donc toujours une neuve.
//
// Clés : préfixe "leafnotes.reprise." pour ne pas toucher aux clés existantes
// ("bachotage-feuilles" en localStorage, "<slug>.chrono.*" du Labo en sessionStorage).
import { supabase } from './supabase'

const PREFIX = 'leafnotes.reprise.'
const VERSION = 1
/** Au-delà, la copie est ignorée (onglet resté ouvert très longtemps). */
const MAX_AGE_MS = 12 * 60 * 60 * 1000

export type ResumeSlot = 'flashcards' | 'qcm' | 'exercice'

type Envelope<T> = { v: number; scope: string; savedAt: number; data: T }

/** Identifiant de la série : utilisateur, puis les éléments donnés (page, location.key…). */
export function resumeScope(userId: string | null | undefined, ...parts: (string | null | undefined)[]) {
  return [userId ?? '', ...parts.map((p) => p ?? '')].join('|')
}

export function loadResume<T>(slot: ResumeSlot, scope: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + slot)
    if (!raw) return null
    const env = JSON.parse(raw) as Envelope<T>
    if (env.v !== VERSION || env.scope !== scope || Date.now() - env.savedAt > MAX_AGE_MS) return null
    return env.data
  } catch {
    return null
  }
}

export function saveResume<T>(slot: ResumeSlot, scope: string, data: T) {
  try {
    const env: Envelope<T> = { v: VERSION, scope, savedAt: Date.now(), data }
    window.sessionStorage.setItem(PREFIX + slot, JSON.stringify(env))
  } catch {
    /* stockage indisponible (navigation privée, quota) : pas de reprise, rien de grave */
  }
}

export function clearResume(slot: ResumeSlot) {
  try {
    window.sessionStorage.removeItem(PREFIX + slot)
  } catch {
    /* ignoré */
  }
}

/** La session existe et n'est pas terminée : on peut continuer à y répondre après un rechargement. */
export async function isSessionOpen(sessionId: string): Promise<boolean> {
  const { data, error } = await supabase.from('sessions').select('ended_at').eq('id', sessionId).maybeSingle()
  if (error) throw error
  return !!data && data.ended_at === null
}
