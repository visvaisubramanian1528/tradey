import countries from './data/countries.json'

const normalizedCountries = {}
for (const key in countries) {
  normalizedCountries[key.toLowerCase()] = countries[key]
}

const landing = document.getElementById('landing')
const howItWorks = document.getElementById('how-it-works')
const mapView = document.getElementById('map-view')

const enterBtn = document.getElementById('enter-btn')
const howItWorksBtn = document.getElementById('how-it-works-btn')
const backFromHow = document.getElementById('back-from-how')
const backFromMap = document.getElementById('back-from-map')

const typedTextEl = document.getElementById('typed-text')

const subtitleText =
  "A live tracking of tariffs, sanctions, banned goods, and any military and trade war conflicts."

function typeInto(text, el, speed, onDone) {
  let i = 0
  function step() {
    if (i < text.length) {
      el.textContent += text.charAt(i)
      i++
      setTimeout(step, speed)
    } else if (onDone) {
      onDone()
    }
  }
  step()
}

typeInto(subtitleText, typedTextEl, 25)

function showView(viewToShow) {
  [landing, howItWorks, mapView].forEach((v) => v.classList.add('hidden'))
  viewToShow.classList.remove('hidden')
}

enterBtn.addEventListener('click', () => {
  showView(mapView)
  ensureMapLoaded()
})

howItWorksBtn.addEventListener('click', () => {
  showView(howItWorks)
})

backFromHow.addEventListener('click', () => {
  showView(landing)
})

backFromMap.addEventListener('click', () => {
  showView(landing)
})

/* ---------- Map loading (shared by Enter button and chatbot) ---------- */

const palette = [
  '#F28C8C', '#F2B26C', '#F2E06C', '#B4E27E', '#7ED4A4',
  '#7ED6D6', '#7EB6E2', '#8C9CF2', '#B48CF2', '#E28CD6',
  '#F28CAF', '#D9A87E', '#A8C97E', '#7EC9C0', '#9C9CF2'
]

let mapLoadPromise = null
let pinnedCountryEl = null
let hawaiiOverlayEl = null

function ensureMapLoaded() {
  if (!mapLoadPromise) {
    mapLoadPromise = (async () => {
      const response = await fetch('/src/data/world-map.svg')
      const svgText = await response.text()
      document.getElementById('app').innerHTML = svgText

      removeNativeTitles()
      colorCountries()
      attachHoverListeners()
      setupTooltipDrag()
      addHawaiiOverlay()
    })()
  }
  return mapLoadPromise
}

function removeNativeTitles() {
  document.querySelectorAll('svg title').forEach((el) => el.remove())
}

function getTopLevelCountryElements() {
  const idElements = Array.from(document.querySelectorAll('svg [id]'))

  return idElements.filter((el) => {
    let parent = el.parentElement
    while (parent && parent.tagName !== 'svg') {
      if (parent.id) return false
      parent = parent.parentElement
    }
    return true
  })
}

function getPathsWithin(el) {
  if (el.tagName === 'path') return [el]
  return Array.from(el.querySelectorAll('path'))
}

function colorCountries() {
  const countryElements = getTopLevelCountryElements()

  countryElements.forEach((el) => {
    const color = palette[Math.floor(Math.random() * palette.length)]
    const paths = getPathsWithin(el)
    paths.forEach((path) => {
      path.style.fill = color
    })
    el.style.cursor = 'pointer'
  })
}

function addHawaiiOverlay() {
  const app = document.getElementById('app')
  const usEl = getTopLevelCountryElements().find((el) => el.id.toLowerCase() === 'us')
  const usColor = usEl ? getPathsWithin(usEl)[0]?.style.fill : '#F28C8C'

  const overlay = document.createElement('div')
  overlay.id = 'hawaii-overlay'
  overlay.style.position = 'absolute'
  overlay.style.left = '7%'
  overlay.style.top = '58%'
  overlay.style.width = '4%'
  overlay.style.height = '2.4%'
  overlay.style.cursor = 'pointer'
  overlay.style.zIndex = '5'

  overlay.innerHTML = `
    <svg viewBox="0 0 140 60" width="100%" height="100%" style="display:block; overflow: visible;">
      <ellipse cx="10" cy="14" rx="3.5" ry="2.5" fill="${usColor}" transform="rotate(-20 10 14)" />
      <ellipse cx="22" cy="18" rx="5.5" ry="4" fill="${usColor}" transform="rotate(-15 22 18)" />
      <ellipse cx="42" cy="24" rx="6" ry="4.5" fill="${usColor}" transform="rotate(-10 42 24)" />
      <ellipse cx="58" cy="29" rx="2.8" ry="2" fill="${usColor}" />
      <ellipse cx="66" cy="31" rx="3.2" ry="2.2" fill="${usColor}" />
      <path d="M78 30 Q86 26 94 31 Q98 36 92 40 Q84 42 78 38 Q75 34 78 30 Z" fill="${usColor}" />
      <path d="M104 36 Q118 32 132 42 Q136 50 128 56 Q114 60 106 52 Q100 44 104 36 Z" fill="${usColor}" />
    </svg>
  `

  hawaiiOverlayEl = overlay
  const tooltip = document.getElementById('tooltip')

  overlay.addEventListener('mouseenter', () => {
    if (pinnedCountryEl) return
    setUsaHoverState(usEl, true)
    showTooltipForCode('us', tooltip)
  })

  overlay.addEventListener('mousemove', (e) => {
    if (pinnedCountryEl) return
    positionTooltip(e, tooltip)
  })

  overlay.addEventListener('mouseleave', () => {
    if (pinnedCountryEl) return
    setUsaHoverState(usEl, false)
    tooltip.classList.remove('visible')
  })

  overlay.addEventListener('click', (e) => {
    e.stopPropagation()
    if (!usEl) return
    pinUsa(usEl, e, tooltip)
  })

  app.style.position = 'relative'
  app.appendChild(overlay)
}

function setUsaHoverState(usEl, isHovering) {
  if (usEl) usEl.classList.toggle('country-hover', isHovering)
  if (hawaiiOverlayEl) hawaiiOverlayEl.classList.toggle('hawaii-hover', isHovering)
}

function setUsaPinnedState(usEl, isPinned) {
  if (usEl) usEl.classList.toggle('country-pinned', isPinned)
  if (hawaiiOverlayEl) hawaiiOverlayEl.classList.toggle('hawaii-pinned', isPinned)
}

function pinUsa(usEl, e, tooltip) {
  if (pinnedCountryEl === usEl) {
    unpinTooltip(tooltip)
    return
  }

  if (pinnedCountryEl) {
    pinnedCountryEl.classList.remove('country-pinned')
    setUsaPinnedState(pinnedCountryEl, false)
  }

  pinnedCountryEl = usEl
  setUsaPinnedState(usEl, true)
  showTooltipForCode('us', tooltip)
  tooltip.classList.add('pinned')
  positionTooltip(e, tooltip)
}

function buildCountryHTML(data) {
  const linkify = (text, url) =>
    url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-link">${text}</a>` : text

  const renderSection = (label, items, formatter) => {
    if (!items || items.length === 0) return ''
    const itemsHTML = items
      .map((item) => `<span class="tooltip-item">${linkify(formatter(item), item.sourceUrl)}</span>`)
      .join('')
    return `<div class="tooltip-section"><span class="tooltip-section-label">${label}</span>${itemsHTML}</div>`
  }

  let html = `<div class="tooltip-name">${data.name}</div>`
  html += renderSection('Tariffs', data.tariffs, (t) => `${t.rate} on ${t.category} (vs ${t.target})`)
  html += renderSection('Sanctions', data.sanctions, (s) => `${s.type}: ${s.description}`)
  html += renderSection('Banned Goods', data.bannedGoods, (b) => `${b.item} — ${b.reason}`)
  html += renderSection('Conflicts', data.conflicts, (c) => `${c.type} with ${c.with} (${c.status})`)
  html += `<div class="tooltip-updated">Updated ${data.lastUpdated}</div>`

  return html
}

function renderTooltipShell(innerHTML) {
  return `
    <div class="tooltip-drag-handle">⠿ Drag to move</div>
    <div class="tooltip-body">${innerHTML}</div>
  `
}

function showTooltipForCode(code, tooltip) {
  const data = normalizedCountries[code]
  tooltip.classList.add('visible')

  const inner = data
    ? buildCountryHTML(data)
    : `<div class="tooltip-name">${code.toUpperCase()}</div><div class="no-data-message">No active measures tracked</div>`

  tooltip.innerHTML = renderTooltipShell(inner)
}

function attachHoverListeners() {
  const countryElements = getTopLevelCountryElements()
  const tooltip = document.getElementById('tooltip')

  countryElements.forEach((el) => {
    const isUsa = el.id.toLowerCase() === 'us'

    el.addEventListener('mouseenter', () => {
      if (pinnedCountryEl) return
      el.classList.add('country-hover')
      if (isUsa) setUsaHoverState(el, true)
      showTooltipForCode(el.id.toLowerCase(), tooltip)
    })

    el.addEventListener('mousemove', (e) => {
      if (pinnedCountryEl) return
      positionTooltip(e, tooltip)
    })

    el.addEventListener('mouseleave', () => {
      if (pinnedCountryEl) return
      el.classList.remove('country-hover')
      if (isUsa) setUsaHoverState(el, false)
      tooltip.classList.remove('visible')
    })

    el.addEventListener('click', (e) => {
      e.stopPropagation()

      if (isUsa) {
        pinUsa(el, e, tooltip)
        return
      }

      if (pinnedCountryEl === el) {
        unpinTooltip(tooltip)
        return
      }

      if (pinnedCountryEl) {
        pinnedCountryEl.classList.remove('country-pinned')
        if (pinnedCountryEl.id.toLowerCase() === 'us') setUsaPinnedState(pinnedCountryEl, false)
      }

      pinnedCountryEl = el
      el.classList.add('country-pinned')
      showTooltipForCode(el.id.toLowerCase(), tooltip)
      tooltip.classList.add('pinned')
      positionTooltip(e, tooltip)
    })
  })

  document.addEventListener('click', (e) => {
    if (!pinnedCountryEl) return
    if (tooltip.contains(e.target)) return
    unpinTooltip(tooltip)
  })
}

function positionTooltip(e, tooltip) {
  tooltip.style.left = e.clientX + 15 + 'px'
  tooltip.style.top = e.clientY + 15 + 'px'
}

function unpinTooltip(tooltip) {
  if (pinnedCountryEl) {
    pinnedCountryEl.classList.remove('country-pinned', 'country-hover')
    if (pinnedCountryEl.id.toLowerCase() === 'us') {
      setUsaHoverState(pinnedCountryEl, false)
      setUsaPinnedState(pinnedCountryEl, false)
    }
  }
  pinnedCountryEl = null
  tooltip.classList.remove('visible', 'pinned')
}

function setupTooltipDrag() {
  const tooltip = document.getElementById('tooltip')
  let dragging = false
  let offsetX = 0
  let offsetY = 0

  tooltip.addEventListener('mousedown', (e) => {
    if (!e.target.classList.contains('tooltip-drag-handle')) return
    dragging = true
    const rect = tooltip.getBoundingClientRect()
    offsetX = e.clientX - rect.left
    offsetY = e.clientY - rect.top
    e.preventDefault()
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return
    tooltip.style.left = e.clientX - offsetX + 'px'
    tooltip.style.top = e.clientY - offsetY + 'px'
  })

  document.addEventListener('mouseup', () => {
    dragging = false
  })
}

function findCountryElementByCode(code) {
  const elements = getTopLevelCountryElements()
  return elements.find((el) => el.id.toLowerCase() === code)
}

function highlightCountryOnMap(code) {
  showView(mapView)
  ensureMapLoaded().then(() => {
    const el = findCountryElementByCode(code)
    if (!el) return

    el.classList.add('country-highlight')
    if (code === 'us' && hawaiiOverlayEl) hawaiiOverlayEl.classList.add('hawaii-highlight')

    setTimeout(() => {
      el.classList.remove('country-highlight')
      if (code === 'us' && hawaiiOverlayEl) hawaiiOverlayEl.classList.remove('hawaii-highlight')
    }, 3000)
  })
}

/* ---------- Chatbot ---------- */

const chatToggle = document.getElementById('chat-toggle')
const chatPanel = document.getElementById('chat-panel')
const chatClose = document.getElementById('chat-close')
const chatMessages = document.getElementById('chat-messages')
const chatInput = document.getElementById('chat-input')
const chatSend = document.getElementById('chat-send')

let greetingShown = false

chatToggle.addEventListener('click', () => {
  chatPanel.classList.toggle('hidden')
  if (!chatPanel.classList.contains('hidden') && !greetingShown) {
    greetingShown = true
    addBotMessageTyped(
      "Hey there! I'm Tradey — think of me as your guide to global trade drama. Ask me about a country's tariffs, sanctions, or conflicts, or just say hi!"
    )
  }
})

chatClose.addEventListener('click', () => {
  chatPanel.classList.add('hidden')
})

chatSend.addEventListener('click', handleSend)
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSend()
})

function handleSend() {
  const text = chatInput.value.trim()
  if (!text) return

  addUserMessage(text)
  chatInput.value = ''
  respondTo(text)
}

function addUserMessage(text) {
  const el = document.createElement('div')
  el.className = 'chat-message user'
  el.textContent = text
  chatMessages.appendChild(el)
  chatMessages.scrollTop = chatMessages.scrollHeight
}

function addBotMessageInstantHTML(html) {
  const el = document.createElement('div')
  el.className = 'chat-message bot'
  el.innerHTML = html
  chatMessages.appendChild(el)
  chatMessages.scrollTop = chatMessages.scrollHeight
}

function addBotMessageTyped(text) {
  const el = document.createElement('div')
  el.className = 'chat-message bot'
  chatMessages.appendChild(el)

  let i = 0
  function step() {
    if (i < text.length) {
      el.textContent += text.charAt(i)
      i++
      chatMessages.scrollTop = chatMessages.scrollHeight
      setTimeout(step, 15)
    }
  }
  step()
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const countryAliases = {
  us: ['united states', 'usa', 'america'],
  cn: ['china'],
  ru: ['russia'],
  ir: ['iran'],
  eu: ['european union', 'europe'],
  kp: ['north korea', 'dprk'],
  ve: ['venezuela'],
  ca: ['canada'],
  mx: ['mexico'],
  cu: ['cuba'],
  br: ['brazil'],
  ar: ['argentina'],
  co: ['colombia'],
  cl: ['chile'],
  pe: ['peru'],
  ec: ['ecuador'],
  bo: ['bolivia'],
  gy: ['guyana'],
  py: ['paraguay'],
  uy: ['uruguay'],
  sr: ['suriname'],
  gt: ['guatemala'],
  sv: ['el salvador', 'salvador'],
  hn: ['honduras'],
  cr: ['costa rica'],
  ni: ['nicaragua'],
  pa: ['panama'],
  do: ['dominican republic'],
  tt: ['trinidad and tobago', 'trinidad', 'tobago'],
  jm: ['jamaica'],
  bz: ['belize'],
  bs: ['bahamas', 'the bahamas'],
  ht: ['haiti'],
  bb: ['barbados'],
  gd: ['grenada'],
  lc: ['saint lucia', 'st lucia', 'st. lucia'],
  vc: ['saint vincent and the grenadines', 'saint vincent', 'st vincent'],
  kn: ['saint kitts and nevis', 'saint kitts', 'st kitts'],
  dm: ['dominica'],
  ag: ['antigua and barbuda', 'antigua', 'barbuda'],
  gb: ['united kingdom', 'uk', 'britain', 'great britain'],
  ch: ['switzerland'],
  by: ['belarus'],
  rs: ['serbia'],
  de: ['germany'],
  fr: ['france'],
  nl: ['netherlands', 'holland', 'dutch'],
  ua: ['ukraine'],
  hu: ['hungary'],
  pl: ['poland'],
  ie: ['ireland'],
  tr: ['turkey', 'turkiye'],
  ge: ['georgia'],
  it: ['italy'],
  es: ['spain'],
  md: ['moldova'],
  at: ['austria'],
  sk: ['slovakia'],
  cz: ['czech republic', 'czechia'],
  am: ['armenia'],
  az: ['azerbaijan'],
  ee: ['estonia'],
  lv: ['latvia'],
  lt: ['lithuania'],
  ro: ['romania'],
  bg: ['bulgaria'],
  gr: ['greece'],
  ba: ['bosnia and herzegovina', 'bosnia', 'herzegovina'],
  xk: ['kosovo'],
  al: ['albania'],
  mk: ['north macedonia', 'macedonia'],
  me: ['montenegro'],
  hr: ['croatia'],
  dk: ['denmark'],
  no: ['norway'],
  se: ['sweden'],
  fi: ['finland'],
  pt: ['portugal'],
  cy: ['cyprus'],
  be: ['belgium'],
  gl: ['greenland'],
  is: ['iceland'],
  il: ['israel'],
  sa: ['saudi arabia'],
  ae: ['united arab emirates', 'uae', 'emirates'],
  qa: ['qatar'],
  jp: ['japan'],
  kr: ['south korea', 'korea'],
  tw: ['taiwan'],
  vn: ['vietnam'],
  in: ['india'],
  sy: ['syria'],
  ye: ['yemen'],
  iq: ['iraq'],
  pk: ['pakistan'],
  lb: ['lebanon'],
  jo: ['jordan'],
  eg: ['egypt'],
  af: ['afghanistan'],
  kz: ['kazakhstan'],
  uz: ['uzbekistan'],
  om: ['oman'],
  bd: ['bangladesh'],
  np: ['nepal'],
  th: ['thailand'],
  kh: ['cambodia'],
  my: ['malaysia'],
  id: ['indonesia'],
  ph: ['philippines'],
  sg: ['singapore'],
  mm: ['myanmar', 'burma'],
  lk: ['sri lanka'],
  kw: ['kuwait'],
  bh: ['bahrain'],
  tj: ['tajikistan'],
  mn: ['mongolia'],
  la: ['laos'],
  bn: ['brunei'],
  bt: ['bhutan'],
  kg: ['kyrgyzstan'],
  au: ['australia'],
  nz: ['new zealand'],
  pg: ['papua new guinea'],
  fj: ['fiji'],
  pf: ['french polynesia', 'tahiti'],
  mh: ['marshall islands'],
  fm: ['micronesia', 'federated states of micronesia'],
  pw: ['palau'],
  sb: ['solomon islands'],
  vu: ['vanuatu'],
  ws: ['samoa'],
  to: ['tonga'],
  za: ['south africa'],
  cd: ['democratic republic of the congo', 'dr congo', 'drc', 'congo'],
  rw: ['rwanda'],
  ng: ['nigeria'],
  so: ['somalia'],
  sd: ['sudan'],
  ss: ['south sudan'],
  et: ['ethiopia'],
  ly: ['libya'],
  td: ['chad'],
  ml: ['mali'],
  ne: ['niger'],
  ke: ['kenya'],
  gh: ['ghana'],
  ma: ['morocco'],
  tn: ['tunisia'],
  dz: ['algeria'],
  sn: ['senegal'],
  zw: ['zimbabwe'],
  zm: ['zambia'],
  ao: ['angola'],
  ls: ['lesotho'],
  bw: ['botswana'],
  na: ['namibia'],
  mz: ['mozambique'],
  mg: ['madagascar'],
  mu: ['mauritius'],
  tz: ['tanzania'],
  ug: ['uganda'],
  cm: ['cameroon'],
  ci: ['ivory coast', "cote d'ivoire", 'cote divoire'],
  gn: ['guinea'],
  dj: ['djibouti'],
  er: ['eritrea'],
  ga: ['gabon'],
  cg: ['republic of the congo', 'congo-brazzaville'],
  cf: ['central african republic', 'car'],
  bj: ['benin'],
  tg: ['togo'],
  sl: ['sierra leone'],
  lr: ['liberia'],
  bf: ['burkina faso'],
  bi: ['burundi'],
  gm: ['the gambia', 'gambia'],
  mr: ['mauritania'],
  mw: ['malawi'],
  sz: ['eswatini', 'swaziland'],
  gq: ['equatorial guinea'],
  cv: ['cabo verde', 'cape verde'],
  gw: ['guinea-bissau', 'guinea bissau'],
  sc: ['seychelles'],
  st: ['sao tome and principe', 'sao tome'],
  mt: ['malta'],
  lu: ['luxembourg'],
  li: ['liechtenstein'],
  ad: ['andorra'],
  mc: ['monaco'],
  sm: ['san marino'],
  va: ['vatican', 'vatican city', 'holy see'],
  tm: ['turkmenistan'],
  km: ['comoros'],
  eh: ['western sahara'],
  ki: ['kiribati'],
  tv: ['tuvalu'],
  nr: ['nauru'],
  nc: ['new caledonia'],
  fk: ['falkland islands', 'falklands'],
  gf: ['french guiana'],
  si: ['slovenia']
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findCountryInText(lowerText) {
  const entries = []
  for (const code in countryAliases) {
    for (const alias of countryAliases[code]) {
      entries.push({ code, alias })
    }
    entries.push({ code, alias: code })
  }
  entries.sort((a, b) => b.alias.length - a.alias.length)

  for (const { code, alias } of entries) {
    const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i')
    if (pattern.test(lowerText)) return code
  }
  return null
}

/* ---------- Fuzzy matching (typo tolerance for country names) ---------- */

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

// Only fuzzy-match descriptive names (not bare 2/3-letter codes), and only
// against input words of 5+ letters, to avoid false positives on short
// common words (e.g. "chat" vs "Chad").
const fuzzyCandidates = []
for (const code in countryAliases) {
  for (const alias of countryAliases[code]) {
    if (alias.length >= 4) {
      fuzzyCandidates.push({ code, alias })
    }
  }
}

function fuzzyFindCountryInText(lowerText) {
  const words = lowerText.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return null

  let best = null
  let bestDistance = Infinity

  for (const { code, alias } of fuzzyCandidates) {
    const aliasWordCount = alias.split(' ').length
    for (let i = 0; i <= words.length - aliasWordCount; i++) {
      const phraseWords = words.slice(i, i + aliasWordCount)
      const phrase = phraseWords.join(' ')

      // Require the single leading word of a multi-word phrase to be
      // reasonably long too, and skip if lengths are too far apart.
      if (aliasWordCount === 1 && phrase.length < 5) continue
      if (Math.abs(phrase.length - alias.length) > 2) continue

      const distance = levenshtein(phrase, alias)
      if (distance === 0) continue // exact matches are handled elsewhere

      const threshold = alias.length <= 6 ? 1 : alias.length <= 10 ? 2 : 3
      const ratio = distance / alias.length

      if (distance <= threshold && ratio <= 0.34 && distance < bestDistance) {
        bestDistance = distance
        best = { code, alias, matchedText: phrase }
      }
    }
  }

  return best
}

const greetingsList = ['hello', 'hi', 'hey', 'yo', 'sup', "what's up", 'howdy', 'hiya', 'greetings']
const howAreYouList = [
  'how are you', 'how you doing', 'how are u', "how's it going", 'you good', 'you ok',
  'how is your day', 'how was your day', "how's your day", "hows your day",
  'how has your day been', 'you doing ok', 'you doing okay', "what's new",
  "what's going on", 'whats going on', 'how are things'
]
const thanksList = ['thank you', 'thanks', 'appreciate it', 'ty']
const whoAreYouList = ['who are you', 'what are you', 'your name']
const byeList = ['bye', 'goodbye', 'see ya', 'later', 'cya']
const jokeList = ['joke', 'funny', 'make me laugh']
const complimentList = ['good bot', 'nice job', 'you\'re smart', 'youre smart', 'well done', 'good job']

function containsAny(text, list) {
  return list.some((phrase) => text.includes(phrase))
}

function respondTo(rawText) {
  const lower = rawText.toLowerCase().trim()

  let matchedCode = findCountryInText(lower)
  let isFuzzy = false

  if (!matchedCode) {
    const fuzzy = fuzzyFindCountryInText(lower)
    if (fuzzy) {
      matchedCode = fuzzy.code
      isFuzzy = true
    }
  }

  if (matchedCode) {
    const data = normalizedCountries[matchedCode]
    highlightCountryOnMap(matchedCode)

    if (data) {
      const prefix = isFuzzy
        ? `<div class="fuzzy-note">Showing results for <strong>${data.name}</strong> — let me know if that's not what you meant!</div>`
        : ''
      addBotMessageInstantHTML(prefix + buildCountryHTML(data))
    } else {
      addBotMessageTyped(
        pick([
          `Found ${matchedCode.toUpperCase()} on the map for you — but I don't have tracked data on it just yet. It's on my research list!`,
          `I highlighted ${matchedCode.toUpperCase()}, though I'm still gathering intel on that one. Check back soon.`
        ])
      )
    }
    return
  }

  if (containsAny(lower, greetingsList)) {
    addBotMessageTyped(
      pick([
        "Hey! Ready to dig into some global trade tension?",
        "Hello there! Ask me about any country and I'll pull up the details.",
        "Hi! I've got tariffs, sanctions, and conflicts on the brain. What can I help with?"
      ])
    )
    return
  }

  if (containsAny(lower, howAreYouList)) {
    addBotMessageTyped(
      pick([
        "I'm doing great, thanks for asking! Keeping an eye on trade wars around the clock. How can I help?",
        "Running smoothly! Sanctions and tariffs don't sleep, and neither do I. What do you want to know?",
        "Can't complain — I run on data, not coffee. What's on your mind?",
        "Pretty good day so far, mostly spent watching tariff rates change. What can I look up for you?",
        "All good here! Ask me about a country and let's see what's going on with it."
      ])
    )
    return
  }

  if (containsAny(lower, whoAreYouList)) {
    addBotMessageTyped(
      "I'm Tradey — built to help you navigate tariffs, sanctions, banned goods, and conflicts around the world. Think of me as your trade-drama tour guide."
    )
    return
  }

  if (containsAny(lower, thanksList)) {
    addBotMessageTyped(
      pick([
        "Anytime! That's what I'm here for.",
        "You're very welcome. Let me know if you want to check another country.",
        "Happy to help! Ask away if you have more questions."
      ])
    )
    return
  }

  if (containsAny(lower, jokeList)) {
    addBotMessageTyped(
      "Why did the tariff break up with the trade deal? Too many conditions attached. ...I'll stick to geopolitics."
    )
    return
  }

  if (containsAny(lower, complimentList)) {
    addBotMessageTyped(
      pick([
        "Aw, thanks! I do my best to keep track of the chaos out there.",
        "Appreciate that! Let me know what else you'd like to explore."
      ])
    )
    return
  }

  if (containsAny(lower, byeList)) {
    addBotMessageTyped("See you around! Come back if you need to check on any more countries.")
    return
  }

  if (lower.includes('what is tradey') || lower.includes('what is this')) {
    addBotMessageTyped(
      'Tradey is an interactive world map tracking tariffs, sanctions, banned goods, and trade or military conflicts for countries around the world.'
    )
    return
  }

  if (lower.includes('how') && (lower.includes('work') || lower.includes('use'))) {
    addBotMessageTyped(
      'Click Dive In to open the map. Hover a country for a quick preview, or click it to pin the details open and drag the panel anywhere.'
    )
    return
  }

  if (lower.includes('source') || (lower.includes('where') && lower.includes('data'))) {
    addBotMessageTyped(
      "Look for the blue underlined text in any country's details — that's a clickable link straight to the original source."
    )
    return
  }

  addBotMessageTyped(
    pick([
      'Not sure about that one yet! Try asking about a specific country, like "Tell me about China."',
      'I\'m still learning — ask me about a country\'s tariffs or sanctions and I\'ll do my best.',
      'Hmm, I don\'t have an answer for that. Try "how does this work?" or name a country.'
    ])
  )
}