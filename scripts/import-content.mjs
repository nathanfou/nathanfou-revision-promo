#!/usr/bin/env node
// Import du contenu (matières, chapitres, QCM, flashcards, exercices, contrôles) depuis des CSV.
//
//   npm run content:import -- <dossier> [--publier] [--sql] [--dry-run]
//
// Le dossier contient tout ou partie de : qcm.csv, flashcards.csv, exercices.csv, controles.csv
// (format : content/templates/). Les noms de matière et de chapitre sont transformés en
// identifiants ; les matières et chapitres manquants sont créés, dans l'ordre des fichiers.
//
// Idempotent : un QCM est identifié par (matière, chapitre, question), une carte par son recto,
// un exercice par son titre, un contrôle par (matière, nom). Relancer l'import met à jour.
//
// Statut : les nouveaux éléments sont en "brouillon" ; un import sans --publier ne change pas
// le statut des éléments existants. Avec --publier, tout ce qui est importé passe en "publié".
//
// Modes :
//   (défaut)   écrit dans Supabase avec la clé secrète (SUPABASE_URL, SUPABASE_SECRET_KEY du .env)
//   --sql      n'écrit rien : affiche un script SQL équivalent (à coller dans le SQL Editor)
//   --dry-run  vérifie les fichiers et affiche le bilan, sans rien écrire
//
// bonne_reponse : une ou plusieurs lettres, ex. "B" ou "A;C" (séparateurs acceptés : ; , espace).
// Colonnes de choix : choix_a à choix_h, les vides sont ignorées (2 choix minimum).

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const LETTERS = 'ABCDEFGH'
const DUREES = [5, 10, 20, 30]

// ------------------------------------------------------------------ arguments
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const positional = args.filter((a) => !a.startsWith('--'))
for (const f of flags) {
  if (!['--publier', '--sql', '--dry-run', '--help'].includes(f)) fail(`Option inconnue : ${f}`)
}
if (flags.has('--help') || positional.length !== 1) {
  console.log('Usage : npm run content:import -- <dossier> [--publier] [--sql] [--dry-run]')
  process.exit(flags.has('--help') ? 0 : 1)
}
const DIR = resolve(positional[0])
const PUBLIER = flags.has('--publier')
const MODE = flags.has('--sql') ? 'sql' : flags.has('--dry-run') ? 'dry' : 'api'

function fail(msg) {
  console.error(`Erreur : ${msg}`)
  process.exit(1)
}

// ------------------------------------------------------------------ CSV (RFC 4180)
function parseCsv(text) {
  text = text.replace(/^﻿/, '')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"' && field === '') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (quoted) throw new Error('guillemet non fermé')
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function readCsv(name, required) {
  const path = join(DIR, name)
  if (!existsSync(path)) return null
  let rows
  try {
    rows = parseCsv(readFileSync(path, 'utf8'))
  } catch (e) {
    fail(`${name} : ${e.message}`)
  }
  if (!rows.length) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  for (const col of required) if (!header.includes(col)) fail(`${name} : colonne "${col}" manquante`)
  return rows.slice(1).map((r, i) => {
    const o = { _line: i + 2, _file: name }
    header.forEach((h, j) => (o[h] = (r[j] ?? '').trim()))
    return o
  })
}

// ------------------------------------------------------------------ lecture et validation
const errors = []
const err = (r, msg) => errors.push(`${r._file}, ligne ${r._line} : ${msg}`)
const need = (r, ...cols) => cols.every((c) => (r[c] ? true : (err(r, `"${c}" est vide`), false)))

const subjects = [] // noms, dans l'ordre d'apparition
const chapters = [] // { matiere, chapitre }
const seenChap = new Set()
function touch(matiere, chapitre) {
  if (!subjects.includes(matiere)) subjects.push(matiere)
  if (chapitre === undefined) return
  const k = `${matiere}\u0000${chapitre}`
  if (!seenChap.has(k)) {
    seenChap.add(k)
    chapters.push({ matiere, chapitre })
  }
}

/** Ordre des éléments : position dans le chapitre, dans le fichier. */
function withOrder(items) {
  const counters = new Map()
  for (const it of items) {
    const k = `${it.matiere}\u0000${it.chapitre}`
    const n = (counters.get(k) ?? 0) + 1
    counters.set(k, n)
    it.ordre = n
  }
  return items
}

/** Doublons dans un même fichier : la dernière ligne gagne, avec un avertissement. */
const warnings = []
function dedupe(items, keyOf, label) {
  const map = new Map()
  for (const it of items) {
    const k = keyOf(it)
    if (map.has(k)) warnings.push(`${it._file}, ligne ${it._line} : ${label} en double, cette ligne remplace la ligne ${map.get(k)._line}`)
    map.set(k, it)
  }
  return [...map.values()]
}

const qcmRows = readCsv('qcm.csv', ['matiere', 'chapitre', 'question', 'choix_a', 'choix_b', 'bonne_reponse'])
const cardRows = readCsv('flashcards.csv', ['matiere', 'chapitre', 'recto', 'verso'])
const exoRows = readCsv('exercices.csv', ['matiere', 'chapitre', 'titre', 'enonce', 'correction', 'duree_min'])
const examRows = readCsv('controles.csv', ['matiere', 'nom', 'date'])
if (!qcmRows && !cardRows && !exoRows && !examRows) fail(`aucun CSV trouvé dans ${DIR}`)

const questions = []
for (const r of qcmRows ?? []) {
  if (!need(r, 'matiere', 'chapitre', 'question', 'bonne_reponse')) continue
  const choix = []
  for (const l of LETTERS) {
    const v = r[`choix_${l.toLowerCase()}`]
    if (v) {
      if (choix.length !== LETTERS.indexOf(l)) {
        err(r, `choix_${l.toLowerCase()} rempli alors qu'un choix précédent est vide`)
        break
      }
      choix.push(v)
    }
  }
  if (choix.length < 2) {
    err(r, 'il faut au moins 2 choix')
    continue
  }
  const bonnes = [...new Set(r.bonne_reponse.toUpperCase().split(/[\s;,/]+/).flatMap((s) => (s.length > 1 && /^[A-H]+$/.test(s) ? s.split('') : [s])).filter(Boolean))].sort()
  const bad = bonnes.filter((b) => !LETTERS.slice(0, choix.length).includes(b))
  if (!bonnes.length || bad.length) {
    err(r, `bonne_reponse "${r.bonne_reponse}" invalide (lettres possibles : ${LETTERS.slice(0, choix.length).split('').join(', ')})`)
    continue
  }
  touch(r.matiere, r.chapitre)
  questions.push({ _file: r._file, _line: r._line, matiere: r.matiere, chapitre: r.chapitre, enonce: r.question, choix, bonnes, explication: r.explication || null })
}

const cards = []
for (const r of cardRows ?? []) {
  if (!need(r, 'matiere', 'chapitre', 'recto', 'verso')) continue
  touch(r.matiere, r.chapitre)
  cards.push({ _file: r._file, _line: r._line, matiere: r.matiere, chapitre: r.chapitre, recto: r.recto, verso: r.verso })
}

const exos = []
for (const r of exoRows ?? []) {
  if (!need(r, 'matiere', 'chapitre', 'titre', 'enonce', 'correction', 'duree_min')) continue
  const d = Number(r.duree_min)
  if (!DUREES.includes(d)) {
    err(r, `duree_min "${r.duree_min}" invalide (5, 10, 20 ou 30)`)
    continue
  }
  touch(r.matiere, r.chapitre)
  exos.push({ _file: r._file, _line: r._line, matiere: r.matiere, chapitre: r.chapitre, titre: r.titre, enonce: r.enonce, correction: r.correction, duree_min: d })
}

const exams = []
for (const r of examRows ?? []) {
  if (!need(r, 'matiere', 'nom', 'date')) continue
  const t = Date.parse(r.date)
  if (Number.isNaN(t)) {
    err(r, `date "${r.date}" illisible (format attendu : 2026-12-15T08:00:00+01:00)`)
    continue
  }
  touch(r.matiere)
  exams.push({ _file: r._file, _line: r._line, matiere: r.matiere, nom: r.nom, date: new Date(t).toISOString() })
}

if (errors.length) {
  console.error(`${errors.length} erreur(s), rien n'a été importé :`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

const Q = withOrder(dedupe(questions, (x) => `${x.matiere}\u0000${x.chapitre}\u0000${x.enonce}`, 'question'))
const C = withOrder(dedupe(cards, (x) => `${x.matiere}\u0000${x.chapitre}\u0000${x.recto}`, 'recto'))
const E = withOrder(dedupe(exos, (x) => `${x.matiere}\u0000${x.chapitre}\u0000${x.titre}`, 'titre'))
const X = dedupe(exams, (x) => `${x.matiere}\u0000${x.nom}`, 'contrôle')
for (const w of warnings) console.warn(`Attention : ${w}`)

const summary = () =>
  [
    `${subjects.length} matière(s), ${chapters.length} chapitre(s)`,
    `${Q.length} QCM, ${C.length} carte(s), ${E.length} exercice(s), ${X.length} contrôle(s)`,
    PUBLIER ? 'statut : publié' : 'statut : brouillon pour les nouveaux éléments (existants inchangés)',
  ].join('\n  ')

// ------------------------------------------------------------------ mode --dry-run
if (MODE === 'dry') {
  console.log(`Vérification OK (rien n'a été écrit) :\n  ${summary()}`)
  process.exit(0)
}

// ------------------------------------------------------------------ mode --sql
if (MODE === 'sql') {
  const s = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
  const arr = (a) => `array[${a.map(s).join(', ')}]::text[]`
  const chap = (m, c) =>
    `(select c.id from public.chapters c join public.subjects s on s.id = c.subject_id where s.nom = ${s(m)} and c.nom = ${s(c)})`
  const statutCol = PUBLIER ? ', statut' : ''
  const statutVal = PUBLIER ? ", 'publie'" : ''
  const statutSet = PUBLIER ? ', statut = excluded.statut' : ''
  const out = [`-- Généré par scripts/import-content.mjs (${new Date().toISOString()})`, '-- ' + summary().replace(/\n {2}/g, '\n-- '), 'begin;']
  for (const m of subjects) {
    out.push(`insert into public.subjects (nom, ordre) select ${s(m)}, coalesce(max(ordre), 0) + 1 from public.subjects on conflict (nom) do nothing;`)
  }
  for (const { matiere, chapitre } of chapters) {
    out.push(
      `insert into public.chapters (subject_id, nom, ordre) select s.id, ${s(chapitre)}, coalesce((select max(c.ordre) from public.chapters c where c.subject_id = s.id), 0) + 1 from public.subjects s where s.nom = ${s(matiere)} on conflict (subject_id, nom) do nothing;`,
    )
  }
  for (const q of Q) {
    out.push(
      `insert into public.questions (chapter_id, enonce, choix, ordre${statutCol}) values (${chap(q.matiere, q.chapitre)}, ${s(q.enonce)}, ${s(JSON.stringify(q.choix))}::jsonb, ${q.ordre}${statutVal}) on conflict (chapter_id, enonce) do update set choix = excluded.choix, ordre = excluded.ordre${statutSet};`,
      `insert into public.question_answers (question_id, bonnes_reponses, explication) select q.id, ${arr(q.bonnes)}, ${s(q.explication)} from public.questions q where q.chapter_id = ${chap(q.matiere, q.chapitre)} and q.enonce = ${s(q.enonce)} on conflict (question_id) do update set bonnes_reponses = excluded.bonnes_reponses, explication = excluded.explication;`,
    )
  }
  for (const c of C) {
    out.push(
      `insert into public.flashcards (chapter_id, recto, verso, ordre${statutCol}) values (${chap(c.matiere, c.chapitre)}, ${s(c.recto)}, ${s(c.verso)}, ${c.ordre}${statutVal}) on conflict (chapter_id, recto) do update set verso = excluded.verso, ordre = excluded.ordre${statutSet};`,
    )
  }
  for (const e of E) {
    out.push(
      `insert into public.exercises (chapter_id, titre, enonce, correction, duree_min, ordre${statutCol}) values (${chap(e.matiere, e.chapitre)}, ${s(e.titre)}, ${s(e.enonce)}, ${s(e.correction)}, ${e.duree_min}, ${e.ordre}${statutVal}) on conflict (chapter_id, titre) do update set enonce = excluded.enonce, correction = excluded.correction, duree_min = excluded.duree_min, ordre = excluded.ordre${statutSet};`,
    )
  }
  for (const x of X) {
    out.push(
      `insert into public.exams (subject_id, nom, date) select s.id, ${s(x.nom)}, ${s(x.date)}::timestamptz from public.subjects s where s.nom = ${s(x.matiere)} on conflict (subject_id, nom) do update set date = excluded.date;`,
    )
  }
  out.push('commit;')
  console.log(out.join('\n'))
  process.exit(0)
}

// ------------------------------------------------------------------ mode API (clé secrète)
try {
  process.loadEnvFile?.(resolve('.env'))
} catch {
  // pas de .env : les variables peuvent venir de l'environnement
}
const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SECRET_KEY
if (!URL || !KEY || KEY.includes('xxx')) fail('SUPABASE_URL et SUPABASE_SECRET_KEY doivent être définis dans .env (voir .env.example)')
if (!KEY.startsWith('sb_secret_') && !KEY.startsWith('ey')) fail("SUPABASE_SECRET_KEY doit être la clé secrète (sb_secret_...), pas la clé publishable")

const { createClient } = await import('@supabase/supabase-js')
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const ok = (res, what) => {
  if (res.error) fail(`${what} : ${res.error.message}`)
  return res.data
}
const chunks = (a, n = 200) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

// Matières : on ne crée que les manquantes (l'ordre des existantes est conservé).
const existingSubjects = ok(await db.from('subjects').select('id, nom, ordre'), 'lecture des matières')
let maxOrdre = Math.max(0, ...existingSubjects.map((s) => s.ordre))
const missingSubjects = subjects.filter((m) => !existingSubjects.some((s) => s.nom === m)).map((nom) => ({ nom, ordre: ++maxOrdre }))
if (missingSubjects.length) ok(await db.from('subjects').insert(missingSubjects), 'création des matières')
const subjectId = new Map(ok(await db.from('subjects').select('id, nom'), 'lecture des matières').map((s) => [s.nom, s.id]))

// Chapitres : idem, ordre = suite du dernier chapitre de la matière.
const existingChapters = ok(await db.from('chapters').select('id, subject_id, nom, ordre'), 'lecture des chapitres')
const maxBySubject = new Map()
for (const c of existingChapters) maxBySubject.set(c.subject_id, Math.max(maxBySubject.get(c.subject_id) ?? 0, c.ordre))
const missingChapters = []
for (const { matiere, chapitre } of chapters) {
  const sid = subjectId.get(matiere)
  if (existingChapters.some((c) => c.subject_id === sid && c.nom === chapitre)) continue
  const ordre = (maxBySubject.get(sid) ?? 0) + 1
  maxBySubject.set(sid, ordre)
  missingChapters.push({ subject_id: sid, nom: chapitre, ordre })
}
if (missingChapters.length) ok(await db.from('chapters').insert(missingChapters), 'création des chapitres')
const chapterId = new Map(
  ok(await db.from('chapters').select('id, subject_id, nom'), 'lecture des chapitres').map((c) => [`${c.subject_id}\u0000${c.nom}`, c.id]),
)
const cid = (m, c) => chapterId.get(`${subjectId.get(m)}\u0000${c}`)
const statut = PUBLIER ? { statut: 'publie' } : {}

// QCM puis bonnes réponses (table séparée, illisible par le navigateur).
for (const part of chunks(Q)) {
  const rows = ok(
    await db
      .from('questions')
      .upsert(part.map((q) => ({ chapter_id: cid(q.matiere, q.chapitre), enonce: q.enonce, choix: q.choix, ordre: q.ordre, ...statut })), { onConflict: 'chapter_id,enonce' })
      .select('id, chapter_id, enonce'),
    'import des QCM',
  )
  const idOf = new Map(rows.map((r) => [`${r.chapter_id}\u0000${r.enonce}`, r.id]))
  ok(
    await db.from('question_answers').upsert(
      part.map((q) => ({ question_id: idOf.get(`${cid(q.matiere, q.chapitre)}\u0000${q.enonce}`), bonnes_reponses: q.bonnes, explication: q.explication })),
      { onConflict: 'question_id' },
    ),
    'import des bonnes réponses',
  )
}
for (const part of chunks(C)) {
  ok(
    await db
      .from('flashcards')
      .upsert(part.map((c) => ({ chapter_id: cid(c.matiere, c.chapitre), recto: c.recto, verso: c.verso, ordre: c.ordre, ...statut })), { onConflict: 'chapter_id,recto' }),
    'import des flashcards',
  )
}
for (const part of chunks(E)) {
  ok(
    await db.from('exercises').upsert(
      part.map((e) => ({ chapter_id: cid(e.matiere, e.chapitre), titre: e.titre, enonce: e.enonce, correction: e.correction, duree_min: e.duree_min, ordre: e.ordre, ...statut })),
      { onConflict: 'chapter_id,titre' },
    ),
    'import des exercices',
  )
}
if (X.length) {
  ok(
    await db.from('exams').upsert(X.map((x) => ({ subject_id: subjectId.get(x.matiere), nom: x.nom, date: x.date })), { onConflict: 'subject_id,nom' }),
    'import des contrôles',
  )
}

console.log(`Import terminé :\n  ${summary()}`)
