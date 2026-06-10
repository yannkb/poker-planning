import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const LANG_KEY = 'pp-lang'

export const LANGS = ['fr', 'en'] as const
export type Lang = (typeof LANGS)[number]

function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value)
}

// English is the reference locale: its keys define MessageKey, and the
// French dictionary is checked against it at compile time.
const en = {
  tagline: 'Estimate together, ship with confidence',
  createRoom: 'Create Room',
  joinRoom: 'Join Room',
  yourName: 'Your name',
  sessionName: 'Session name',
  cardDeck: 'Card deck',
  roomCode: 'Room code',
  phHostName: 'e.g. Alice',
  phPlayerName: 'e.g. Bob',
  phSession: 'e.g. Sprint 42 Planning',
  phCode: 'e.g. ABC123',
  creating: 'Creating…',
  joining: 'Joining…',
  shareHint: 'Share the room code with your team to invite them.',
  defaultSessionName: 'Planning Session',
  kicked: 'You were removed from the room.',
  room: 'Room:',
  clickToCopy: '(click to copy link)',
  copied: '✓ Copied!',
  copyInviteLink: 'Copy invite link',
  observerBadge: '👁 Observer',
  voterBadge: '👤 Voter',
  observerTitle: 'Watch as observer',
  voterTitle: 'Switch to voter',
  settingsTitle: 'Room settings',
  changeDeck: 'Change deck:',
  estimating: 'Estimating',
  selectIssue: 'Select an issue to estimate',
  readyToVote: 'Ready to vote',
  roundComplete: 'Round complete',
  votedCount: '{voted}/{total} voted',
  waitingHost: 'Waiting for the host to reveal…',
  revealVotes: 'Reveal Votes',
  newRound: 'New Round',
  avg: 'avg',
  consensus: '🎉 Consensus!',
  hostTitle: 'Host',
  observerSeatTitle: 'Observer',
  removeParticipant: 'Remove {name}',
  reactTo: 'React to {name}',
  throwEmoji: 'Throw {emoji}',
  moreEmojis: 'More emojis…',
  loadingEmojis: 'Loading emojis…',
  results: 'Results',
  observingNote: 'You are observing this round.',
  you: ' (you)',
  clickPlayerHint: 'Click a player to throw an emoji at them',
  gifTitle: 'Send a GIF reaction',
  searchGiphy: 'Search Giphy…',
  gifUnconfigured: 'GIF search needs a Giphy API key on the server (GIPHY_API_KEY). Pick a classic instead:',
  gifError: 'Search failed — pick a classic instead:',
  searching: 'Searching…',
  noGifs: 'No GIFs found',
  gifReaction: 'GIF reaction',
  issues: 'Issues',
  add: '+ Add',
  addShort: 'Add',
  cancel: 'Cancel',
  addIssuesPrompt: 'Add issues to estimate.',
  noIssuesYet: 'No issues yet.',
  issueTitlePh: 'Issue title…',
  set: 'Set',
  save: 'Save',
  estimatePh: 'Estimate…',
  noVotesCast: 'No votes cast this round.',
  votesCount: '{count} votes',
  deck_fibonacci: 'Fibonacci',
  deck_modified_fibonacci: 'Modified Fibonacci',
  deck_tshirt: 'T-Shirt Sizes',
  deck_powers_of_2: 'Powers of 2',
  deck_days: 'Days',
} as const

export type MessageKey = keyof typeof en

const fr: Record<MessageKey, string> = {
  tagline: 'Estimez ensemble, livrez sereinement',
  createRoom: 'Créer un salon',
  joinRoom: 'Rejoindre un salon',
  yourName: 'Votre nom',
  sessionName: 'Nom de la session',
  cardDeck: 'Jeu de cartes',
  roomCode: 'Code du salon',
  phHostName: 'ex. Alice',
  phPlayerName: 'ex. Bob',
  phSession: 'ex. Planning Sprint 42',
  phCode: 'ex. ABC123',
  creating: 'Création…',
  joining: 'Connexion…',
  shareHint: 'Partagez le code du salon avec votre équipe.',
  defaultSessionName: 'Session de planning',
  kicked: 'Vous avez été exclu du salon.',
  room: 'Salon :',
  clickToCopy: '(cliquez pour copier le lien)',
  copied: '✓ Copié !',
  copyInviteLink: "Copier le lien d'invitation",
  observerBadge: '👁 Observateur',
  voterBadge: '👤 Votant',
  observerTitle: 'Regarder en observateur',
  voterTitle: 'Redevenir votant',
  settingsTitle: 'Paramètres du salon',
  changeDeck: 'Changer de jeu :',
  estimating: 'Estimation en cours',
  selectIssue: 'Choisissez un ticket à estimer',
  readyToVote: 'Prêts à voter',
  roundComplete: 'Manche terminée',
  votedCount: '{voted}/{total} ont voté',
  waitingHost: "En attente de la révélation par l'hôte…",
  revealVotes: 'Révéler les votes',
  newRound: 'Nouvelle manche',
  avg: 'moy.',
  consensus: '🎉 Consensus !',
  hostTitle: 'Hôte',
  observerSeatTitle: 'Observateur',
  removeParticipant: 'Exclure {name}',
  reactTo: 'Réagir à {name}',
  throwEmoji: 'Lancer {emoji}',
  moreEmojis: "Plus d'emojis…",
  loadingEmojis: 'Chargement des emojis…',
  results: 'Résultats',
  observingNote: 'Vous observez cette manche.',
  you: ' (vous)',
  clickPlayerHint: 'Cliquez sur un joueur pour lui lancer un emoji',
  gifTitle: 'Envoyer une réaction GIF',
  searchGiphy: 'Rechercher sur Giphy…',
  gifUnconfigured: 'La recherche GIF nécessite une clé Giphy côté serveur (GIPHY_API_KEY). Choisissez un classique :',
  gifError: 'Recherche échouée — choisissez un classique :',
  searching: 'Recherche…',
  noGifs: 'Aucun GIF trouvé',
  gifReaction: 'Réaction GIF',
  issues: 'Tickets',
  add: '+ Ajouter',
  addShort: 'Ajouter',
  cancel: 'Annuler',
  addIssuesPrompt: 'Ajoutez des tickets à estimer.',
  noIssuesYet: 'Pas encore de tickets.',
  issueTitlePh: 'Titre du ticket…',
  set: 'Définir',
  save: 'Enregistrer',
  estimatePh: 'Estimation…',
  noVotesCast: 'Aucun vote pour cette manche.',
  votesCount: '{count} votes',
  deck_fibonacci: 'Fibonacci',
  deck_modified_fibonacci: 'Fibonacci modifié',
  deck_tshirt: 'Tailles de T-shirt',
  deck_powers_of_2: 'Puissances de 2',
  deck_days: 'Jours',
}

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { fr, en }

// Meme quotes shown in the table center while a round is being voted
export const MEME_QUOTES: Record<Lang, readonly string[]> = {
  fr: [
    '« Ça marche sur ma machine. » 🤷',
    "« C'est pas un bug, c'est une feature. »",
    '« On refactorera plus tard. Promis. »',
    '« Ça passera en prod. Sûrement. »',
    '« 404 : estimation introuvable. »',
    "« Encore 5 minutes et c'est bon. »",
    '« Ce ticket ? Deux jours, max. »',
    '« git push --force, et advienne que pourra. »',
    '« La spec ? Quelle spec ? »',
    '« Le daily d’hier a duré 45 minutes. »',
  ],
  en: [
    '“It works on my machine.” 🤷',
    '“It’s not a bug, it’s a feature.”',
    '“We’ll refactor it later. Promise.”',
    '“It’ll be fine in prod. Probably.”',
    '“404: estimate not found.”',
    '“Five more minutes and it’s done.”',
    '“This ticket? Two days, tops.”',
    '“git push --force and hope for the best.”',
    '“The spec? What spec?”',
    '“Yesterday’s daily lasted 45 minutes.”',
  ],
}

export type QuipCategory = 'consensus' | 'bigSpread' | 'coffee' | 'mystery' | 'high' | 'low' | 'default'

// Funny one-liners about the revealed results, by situation
export const RESULT_QUIPS: Record<Lang, Record<QuipCategory, readonly string[]>> = {
  fr: {
    consensus: [
      'Alignement parfait. Suspect. 🤨',
      'Consensus ! Vous aviez répété avant ?',
      "Tout le monde d'accord. Champagne ! 🍾",
    ],
    bigSpread: [
      "Quelqu'un n'a pas lu le ticket… 👀",
      'Grand écart olympique. 🤸',
      "Il va falloir qu'on parle.",
    ],
    coffee: ['Pause café générale ! ☕', "L'équipe a voté : machine à café."],
    mystery: ['Le mystère reste entier. 🔮', "Un point d'interrogation vaut mille mots."],
    high: ['Aïe. On découpe ? 🔪', "C'est un epic déguisé, ça."],
    low: ['Easy money. 💸', 'Vite estimé, vite oublié.'],
    default: [
      'Statistiquement parlant, c’est un résultat.',
      'Les chiffres ont parlé. 📊',
      "Beau travail d'équipe. Ou presque.",
    ],
  },
  en: {
    consensus: [
      'Perfect alignment. Suspicious. 🤨',
      'Consensus! Did you rehearse this?',
      'Everyone agrees. Champagne! 🍾',
    ],
    bigSpread: [
      'Someone didn’t read the ticket… 👀',
      'Olympic-level split. 🤸',
      'We need to talk.',
    ],
    coffee: ['Coffee break for everyone! ☕', 'The team has voted: coffee machine.'],
    mystery: ['The mystery remains. 🔮', 'A question mark is worth a thousand words.'],
    high: ['Ouch. Shall we split it? 🔪', 'That’s an epic in disguise.'],
    low: ['Easy money. 💸', 'Quickly estimated, quickly forgotten.'],
    default: [
      'Statistically speaking, that’s a result.',
      'The numbers have spoken. 📊',
      'Great teamwork. Almost.',
    ],
  },
}

// Deterministic pick so all participants see the same line for a given round
export function pickFrom(list: readonly string[], seed: number): string {
  return list.length ? (list[Math.abs(seed) % list.length] ?? '') : ''
}

export type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TranslateFn
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY)
      return isLang(stored) ? stored : 'fr'
    } catch {
      return 'fr'
    }
  })

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // localStorage unavailable — language just won't persist
    }
  }, [])

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      let text = MESSAGES[lang][key]
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replace(`{${name}}`, String(value))
        }
      }
      return text
    },
    [lang],
  )

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}
