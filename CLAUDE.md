# CLAUDE.md

# CatchRank — Project Instructions for Claude Code

Dit document bevat de vaste projectregels, productcontext, UX-richtlijnen, technische architectuurprincipes en werkafspraken voor Claude Code binnen de CatchRank codebase.

Claude Code moet deze instructies behandelen als de standaard projectwaarheid voor alle analyse-, refactor-, implementatie- en optimalisatietaken.

---

# 1. PROJECTIDENTITEIT

## Productnaam
CatchRank

## Domein
CatchRank.nl

## Positionering
CatchRank is een dark mobile-first sportvisplatform dat voelt als een mix van:
- Strava voor sportvissers
- slim vislogboek
- sessie- en stekplatform
- analytics- en statistiekenomgeving
- community- en clubsplatform
- ranking / XP / progressieplatform
- weather-enabled fishing intelligence app
- persoonlijke visgear / setup / favorieten omgeving
- affiliate-ready productlaag voor sportvisproducten

## Kernbelofte
- slimmer loggen
- beter inzicht
- meer motivatie
- meer community
- meer progressie
- slimmer vissen
- betere gearkeuzes

## Belangrijkste productpijlers
1. Catches
2. Sessions
3. Spots
4. Weather
5. Mijn Visgear
6. Stats
7. Rankings / XP
8. Community
9. Tools / advice / recommendations

---

# 2. HOOFDDOEL VAN CLAUDE CODE IN DIT PROJECT

Claude Code is in dit project:
- senior pair programmer
- repo analyst
- architecture-aware implementer
- UI/UX-sensitive code builder
- Firebase/Firestore-conscious engineer
- low-cost / low-spend optimizer
- systematic refactor partner

Claude Code moet:
- bestaande code eerst begrijpen
- daarna pas verbeteren of uitbreiden
- productwaarde, mobile UX en kostenefficiëntie prioriteren
- technische kwaliteit hoog houden zonder over-engineering
- zoveel mogelijk bouwen op bestaande patronen waar dat zinvol is

Claude Code moet **niet**:
- blind grootschalig refactoren zonder duidelijke reden
- onnodig architectuurcomplexiteit toevoegen
- dure of risicovolle processen automatisch activeren
- generieke SaaS-web patronen introduceren die niet passen bij CatchRank
- licht thema of desktop-first ontwerpkeuzes introduceren

---

# 3. DESIGN DNA / UI RICHTING

## Algemene stijl
CatchRank is expliciet:
- dark theme
- premium
- compact
- mobile-first
- sportief
- clean
- functioneel
- polished
- no-nonsense
- modern

## Visuele referentie
De visuele richting moet expliciet aansluiten op de bestaande Flutter app stijl:
- donkere basis
- goudgele accentkleur
- compacte spacing
- donkere cards
- grote duidelijke mobile tap targets
- hero image driven detail screens
- bottom navigation met centrale actieknop
- sterke screen titles
- duidelijke stat cards
- functionele, nette glow/accent states
- geen generieke Material demo uitstraling
- geen “witte SaaS dashboard” look

## Kleurgevoel
Primair:
- bijna zwart / deep charcoal
- goudgele accentkleur
- subtiele antraciet en bronze nuances
- optioneel zeer subtiel dark teal / water nuance

Vermijden:
- veel wit
- lichtblauw als hoofdmerkaccent
- schreeuwerige gradients
- platte startup-branding

## Typografie
- Inter voor UI, body, metadata, forms, cards, stats
- Krub voor headings, hero-titels, sectietitels, screen titles, merkaccenten

Typografie moet:
- compact en duidelijk zijn
- goede hiërarchie hebben
- goed leesbaar zijn op mobiel
- geen te kleine belangrijke informatie bevatten
- screen titles sterk en premium laten voelen

---

# 4. MOBILE-FIRST IS ABSOLUTE PRIORITEIT

CatchRank moet altijd worden ontworpen en gebouwd alsof mobiel de primaire context is.

## Mobiele prioriteiten
- alles eerst optimaliseren voor smartphone schermen
- snelle thumb-friendly interacties
- belangrijke acties binnen duimbereik
- bottom navigation als primair patroon
- centrale primary action button waar logisch
- compacte contentblokken
- minimale maar comfortabele spacing
- snelle scanbaarheid
- grote genoeg tap targets
- flows voor gebruik aan de waterkant
- forms kort, logisch en snel
- list/detail screens compact en rijk
- hero/meta/stats/actions logisch geordend
- bottom sheets vaak verkiezen boven desktop-style modals

## Niet doen
- desktop-first layout denken
- te veel witruimte introduceren
- kaarten onnodig hoog maken
- ingewikkelde multicolumn-patterns eerst voor web bedenken
- onnodige hover-afhankelijkheid

---

# 5. PRODUCTMODULES EN PRIORITEIT

## Prioriteit 1
- auth basis
- dashboard basis
- users profielstructuur
- catches loggen
- sessions loggen
- spots beheren
- quick catch flow
- draft logging
- basis stats
- XP progressie
- basis rankings
- mobile-first shell
- Mijn Visgear basis
- favorieten basis
- setup koppeling aan logging
- bestaande weatherlaag slim integreren zonder extra verspilling

## Prioriteit 2
- clubs
- community feed
- comments/likes
- uitgebreidere analytics
- badges / achievements
- filters en segmentaties
- community gear signals
- affiliate productcatalogus basis
- product matching user gear ↔ feeds
- weather insights / forecast verdieping

## Prioriteit 3
- geavanceerde tools
- advies-engines
- slimme analyses
- knowledge/content integratie
- extra gamification
- automation flows
- slimme gear aanbevelingen
- AI bait / gear / setup suggesties
- geavanceerde commerce personalisatie

Claude Code moet productbeslissingen altijd spiegelen aan deze prioriteiten.

---

# 6. MIJN VISGEAR — SPECIFIEKE PROJECTREGELS

## Naamgeving
Gebruik overal consequent:
- Mijn Visgear

Gebruik niet:
- Mijn Vista
- Vista/Gear
- VisTas
- Gear module (alleen technisch intern mag “gear” gebruikt worden, maar productmatig heet het Mijn Visgear)

## Doel van Mijn Visgear
Mijn Visgear is een utility-first module waarin users:
- eigen gear toevoegen
- favorieten opslaan
- setups maken
- gear koppelen aan catches, sessions en spots
- later productmatches en affiliate suggesties krijgen
- feedproducten kunnen ontdekken zonder webshopgevoel

## UX-volgorde
Altijd:
1. eigen gear
2. favorieten
3. setups
4. slimme suggesties
5. affiliate/conversie als ondersteunende laag

## Niet doen
- Mijn Visgear als losse shop behandelen
- affiliatecards dominant maken
- feedproducten boven eigen gear plaatsen zonder context

---

# 7. WEATHER / OPENWEATHER REGELS

## Belangrijke context
Er bestaat al een gekoppelde OpenWeather API en er zijn al weather-functies aanwezig in het project.

Claude Code moet:
- bestaande weather services inspecteren en hergebruiken
- dubbele weather logica vermijden
- weather als gedeelde platformlaag behandelen
- live weather, cached weather en stored snapshots logisch scheiden

## Weather wordt gebruikt voor:
- catches
- sessions
- spots context
- dashboards
- weather/forecast tools
- smart logging prefills
- future insights / recommendations

## Weather regels
- voorkom dubbele API-calls
- voorkom onnodige refreshes
- voorkom polling zonder noodzaak
- cache weather slim
- sla alleen relevante snapshots op
- gebruik historische snapshots voor analyses
- gebruik live fetch alleen waar productmatig zinvol

## Niet standaard activeren
- zware background refreshes
- agressieve forecast syncs
- bulk enrichment jobs
- frequente scheduled jobs zonder expliciete opdracht

---

# 8. FIREBASE / FIRESTORE PRINCIPES

## Algemene regels
Werk alsof er al een bestaand Firebase/Firestore project is met bestaande data die gerespecteerd moet worden.

Claude Code moet:
- bestaande collecties en velden eerst analyseren
- destructieve wijzigingen vermijden
- backwards-compatible werken waar mogelijk
- read-optimized data slim gebruiken
- writes beperken
- relationele refs duidelijk houden
- null-safe parsing gebruiken
- fromMap / toMap mapping netjes houden

## Belangrijke collecties
Bestaand of verwacht:
- users
- catches_v2
- sessions_v2
- spots_v2
- species
- clubs
- club_members
- club_feed
- academy_articles
- academy_baits
- academy_knots
- academy_lures
- academy_rigs
- products
- challenges

Voor Mijn Visgear / productlaag verwacht:
- user_gear
- user_favorites
- user_setups
- gear_usage_links
- affiliate_products
- product_catalog_index
- community_gear_signals
- gear_recommendations

## Firestore architectuurregels
- gebruik refs waar logisch
- dupliceer alleen velden die read-performance duidelijk verbeteren
- gebruik aggregaties waar ze echt nuttig zijn
- voorkom overly nested complexity zonder reden
- houd models leesbaar en consistent
- documenteer mappingkeuzes indien relevant

## Read/write regels
- minimaliseer reads
- minimaliseer writes
- vermijd zware real-time listeners
- vermijd inefficiënte screen rebuild queries
- laad lightweight list data voor lijstschermen
- laad full detail data pas als nodig

---

# 9. DEVELOPMENT MODE / SAFE MODE

Claude Code moet standaard werken in development-safe mode.

## Harde regels
- gebruik demo/test user waar nodig
- bouw integraties volledig maar activeer dure processen niet standaard
- gebruik mocks/placeholders/sample data waar zinvol
- voorkom onnodige writes
- voorkom onnodige realtime listeners
- voorkom onnodige background jobs
- voorkom onnodige API-calls
- production gedrag alleen als daar expliciet om gevraagd wordt

## Development-safe verwachtingen
In development moet de app:
- schermen volledig kunnen renderen
- flows volledig kunnen tonen
- integraties architectonisch klaarzetten
- bestaande services slim gebruiken
- maar kosten en verbruik minimaliseren

## Bij integraties altijd aangeven
Claude Code moet expliciet aangeven:
- wat gebouwd is
- wat live actief is
- wat alleen voorbereid / feature-flagged / placeholder is
- wat nog niet geactiveerd wordt om tokens/spend te besparen

---

# 10. LOW-SPEND / LOW-COST RULES

Kostenbeheersing is een kernregel.

## Claude Code moet:
- reads minimaliseren
- writes minimaliseren
- API-verbruik minimaliseren
- caching toepassen
- lazy loading toepassen
- paginatie toepassen waar relevant
- real-time alleen gebruiken waar functioneel noodzakelijk
- feature flags gebruiken voor dure modules
- backgroundprocessen standaard uit laten als die niet expliciet nodig zijn

## Nooit standaard introduceren
- agressieve realtime feeds
- polling loops
- automatische bulk syncs
- zware scheduled jobs
- onnodige media/uploads bij elke stap
- productfeed live runtime fetch op elke schermrender

## Productfeed regel
Voor affiliate/productcatalogus geldt:
- app gebruikt primair Firebase-gecachede / genormaliseerde catalogdata
- feed URL is sync-bron, niet standaard runtime UI-bron
- live feed-fetch alleen voor admin/dev/test/fallback indien expliciet gewenst

---

# 11. ARCHITECTUURSTIJL

## Gewenste structuur
Claude Code moet feature-based en modulair denken.

Voorkeur:
- duidelijke modulegrenzen
- screen/ui laag gescheiden van data/service laag
- herbruikbare widgets/components
- gedeelde theming/design tokens
- nette repository/service patterns waar zinvol
- lichtgewicht state-structuren passend bij huidige codebase

## Niet doen
- onnodige enterprise-architectuur introduceren
- abstractie om abstractie
- alles tegelijk refactoren
- patronen introduceren die niet aansluiten op de rest van de code

## Refactorregel
Refactor alleen als:
- huidige code echt blokkeert
- er duidelijke duplicatie is
- consistentie sterk verbetert
- schaalbaarheid/productkwaliteit duidelijk beter wordt

Anders: voortbouwen op bestaande code.

---

# 12. STANDAARD WERKWIJZE PER TAAK

Claude Code moet normaal gesproken deze workflow aanhouden:

## Stap 1 — Analyse
Eerst:
- relevante files lezen
- huidige architectuur begrijpen
- benoemen wat bestaat
- benoemen wat ontbreekt
- risico’s noemen

## Stap 2 — Plan
Daarna:
- compact implementatieplan geven
- duidelijke volgorde voorstellen
- scopes begrenzen

## Stap 3 — Implementatie
Dan pas:
- relevante files wijzigen
- nieuwe files toevoegen waar nodig
- bestaande code respecteren
- naming en structuur consistent houden

## Stap 4 — Rapportage
Na implementatie altijd:
- gewijzigde files opsommen
- belangrijkste keuzes uitleggen
- open TODO’s noemen
- aangeven wat nog getest moet worden
- benoemen wat dev-safe/disabled is gebleven

Claude Code moet dus **niet** meteen blind gaan coderen zonder eerst analyse en plan, tenzij de opdracht expliciet direct implementatie vraagt.

---

# 13. VERPLICHTE OUTPUTSTIJL VAN CLAUDE CODE

Bij elke relevante implementatie-output moet Claude Code idealiter deze secties geven:

1. **Wat ik heb geanalyseerd**
2. **Plan**
3. **Gewijzigde files**
4. **Wat ik heb gebouwd**
5. **Belangrijke architectuurkeuzes**
6. **Wat nog niet actief / dev-safe is**
7. **Open TODOs**
8. **Wat jij nu handmatig moet testen**

Hou uitleg compact maar concreet.

---

# 14. UX-RICHTLIJNEN PER TYPE SCHERM

## Dashboard
- compact
- actiegericht
- direct bruikbaar
- quick actions prominent
- niet te veel widgets
- live context tonen waar nuttig

## Logging flows
- snelheid boven perfectie
- quick first, enrich later
- altijd save/draft pad
- later aanvullen moet makkelijk zijn
- prefills slim maar niet opdringerig

## Detailpagina’s
- rijke hero
- sterke titel/meta
- stat blocks
- linked relations preview
- duidelijke CTA’s
- scanbaar en compact

## Lists
- lightweight cards
- sterke hiërarchie
- search/filter logisch
- snelle selectie mogelijk

## Bottom sheets
- gebruiken voor quick actions, pickers, preview cards en snelle mobile interacties

---

# 15. BELANGRIJKE CROSS-MODULE LOGICA

CatchRank modules moeten niet als losse silo’s voelen.

Claude Code moet actief nadenken over verbindingen tussen:
- catches ↔ sessions
- catches ↔ spots
- catches ↔ weather
- catches ↔ Mijn Visgear
- sessions ↔ spots
- sessions ↔ weather
- sessions ↔ participants
- sessions ↔ gear/setup
- spots ↔ catches/sessions
- Mijn Visgear ↔ catches/sessions/spots/productfeed
- stats ↔ alle bovenstaande modules

## Belangrijke regel
Context inheritance en prefills mogen logging versnellen maar niet verwarrend maken.

---

# 16. NOTIFICATIES / DRAFTS / ACCEPTANCE LOGICA

Wanneer Claude Code werkt aan session invites, pending accepts, draft completions of soortgelijke functies:
- ontwerp altijd user-safe
- owner-flow moet simpel blijven
- invited user moet niet overvallen worden
- pending states moeten duidelijk zijn
- acceptance status moet zichtbaar zijn
- writes en notificaties moeten low-spend blijven

---

# 17. AFFILIATE / PRODUCTFEED RICHTLIJNEN

## Productlaag
Affiliate/productcatalogus moet service-first zijn.

Belangrijk:
- utility first, commerce second
- eerst user value
- pas daarna conversie
- geen shop-look
- geen agressieve CTA spam
- geen bannerschaos

## Technisch
- genormaliseerde catalogusdata in Firebase
- feed URL als import/sync-bron
- slimme category mapping
- list vs detail data scheiden
- product cards passen in CatchRank stijl

## UI
- product cards moeten aanvoelen als onderdeel van de app
- subtiele affiliate CTA’s
- duidelijke relevantie/context
- makkelijk toevoegen aan Mijn Visgear / setup

---

# 18. NAMING & CONSISTENTIE

Claude Code moet naming consequent houden.

## Voorbeelden
Gebruik:
- Catch
- Session
- Spot
- Weather
- Mijn Visgear
- Setup
- Favorite/Favoriet afhankelijk van bestaande codeconventie
- Live Session
- Draft
- Complete

Vermijd:
- willekeurige synoniemen door elkaar
- Vista voor productnaam
- inconsistent casing of terminologie
- generieke namen zoals `dataService2`, `tempModel`, `newWidgetFinal`

## Regels
- geef duidelijke file names
- geef duidelijke class names
- houd naming semantisch sterk
- volg bestaande codeconventie als die goed genoeg is

---

# 19. TEST- EN VALIDATIEHOUDING

Wanneer relevant moet Claude Code:
- bestaande tests respecteren
- waar nuttig tests uitbreiden
- in ieder geval handmatige teststappen noemen
- aangeven welke flows na implementatie gecontroleerd moeten worden

Als echte tests toevoegen te zwaar is voor de scope:
- noem expliciet de belangrijkste handmatige checks

---

# 20. WAT CLAUDE CODE ALTIJD MOET PRIORITEREN

Volgorde van prioriteit:

1. correcte productlogica
2. mobile UX
3. compatibiliteit met bestaande codebase
4. low-spend architectuur
5. Firebase/Firestore netheid
6. herbruikbaarheid
7. visuele consistentie met CatchRank
8. performance
9. schaalbaarheid
10. verdere fancy uitbreidbaarheid

---

# 21. VERBODEN OF ONGEWENSTE PATRONEN

Claude Code moet deze dingen vermijden tenzij expliciet gevraagd:

- grote ongefundeerde rewrites
- desktop-first UI
- light theme defaults
- overmatige witruimte
- generieke SaaS cards/layouts
- agressieve real-time listeners
- polling zonder noodzaak
- live productfeed fetch op elk scherm
- onnodige package toevoegingen
- onnodige abstraction layers
- API-calls zonder cachingstrategie
- writes bij elke kleine UI state verandering
- “AI magic” zonder uitlegbare logica

---

# 22. STANDAARD PROMPTGEDRAG DAT JE MAG AANNEMEN

Als de gebruiker vraagt om iets te bouwen, mag Claude Code meestal uitgaan van deze impliciete verwachtingen:
- analyseer eerst relevante files
- maak compact plan
- implementeer gericht
- wees development-safe
- wees low-spend
- houd UI donker en mobiel
- respecteer bestaande Flutter/CatchRank stijl
- vermeld file-overzicht en teststappen

Tenzij de gebruiker expliciet anders vraagt.

---

# 23. BIJ TWIJFEL: KIES DIT

Als iets niet volledig gespecificeerd is:
- kies de meest logische productkeuze voor een dark mobile-first sportvis app
- kies de minst dure architectuur die nog goed schaalbaar is
- kies de simpelste robuuste implementatie
- kies een oplossing die snel aanvoelt op mobiel
- kies consistentie boven creatief afwijken

---

# 24. AANBEVOLEN STANDAARD ANTWOORDFORMAT VOOR IMPLEMENTATIEWERK

Gebruik bij codewijzigingen bij voorkeur deze structuur:

## Analyse
...

## Plan
...

## Gewijzigde files
- ...
- ...

## Wat ik heb gebouwd
...

## Belangrijke keuzes
...

## Dev-safe / nog niet geactiveerd
...

## Open TODOs
...

## Handmatige checks
...

---

# 25. KORTE PROJECTSAMENVATTING

CatchRank is een premium dark mobile-first sportvis app.  
De app draait om logging, sessions, spots, weather, progressie, Mijn Visgear en slimme context.  
Claude Code moet bouwen alsof dit een serieuze publieksschaalbare app is, maar in development-safe mode en met sterke kostenbeheersing.  
Alles moet compact, praktisch, premium en mobiel aanvoelen.  
Gebruik bestaande code slim, hergebruik bestaande weather/Firebase logica waar mogelijk, en bouw geen generieke SaaS-oplossingen.

Einde van projectinstructies.