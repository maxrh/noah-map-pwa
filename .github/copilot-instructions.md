# Progressive Web App til NOAH

## 1. Projektbeskrivelse

En Progressive Web App (PWA) der viser NOAHs afdelinger og grupper på et interaktivt kort over Danmark. Appen giver brugerne mulighed for at udforske NOAHs lokale tilstedeværelse, finde nærmeste afdeling, og få detaljerede oplysninger om hver gruppe/afdeling.

## 2. Tech Stack

- **Next.js 16** – React-baseret framework med god SEO og performance
- **shadcn/ui + Tailwind CSS** – Moderne, tilgængelige UI-komponenter
- **Lucide Icons** – Open source ikoner via lucide-react
- **MapLibre GL JS** + **Protomaps** – Open source vektor-kort med self-hosted tiles
- **REST API** (dokumenteret i Postman) – Interface til POI-data
- **Cloudflare Pages** (statisk eksport) – Hosting med automatisk SSL og hurtig CDN
- **GitHub** – Versionsstyring med automatisk deploy til Cloudflare via GitHub Actions
- **Serwist** (next-pwa) – Service worker til offline-support og installerbar app
- **Cloudflare Web Analytics** (valgfrit) – Privacy-venlig analytics uden cookies (GDPR-compliant)

## 3. Sider & Funktionalitet

### 3.1 Kort/Map Side (Forside)

Interaktivt kort over Danmark med markører for alle NOAHs afdelinger og grupper.

- Interaktivt kort med zoom, panorering og touch-support
- POI-markører for hver afdeling/gruppe
- Markører grupperes automatisk ved lav zoom og udfoldes ved højere zoom
- Klik på en markør viser kort info-popup med navn, kategori og link til detaljeside
- Responsivt layout – kortet tilpasser sig alle skærmstørrelser

### 3.2 Liste Side

Listevisning af alle afdelinger/grupper med søgning og filtrering.

- Fritekst-søgning på navn, by, beskrivelse
- Filtrering efter kategori og/eller region
- Sortering (f.eks. alfabetisk)
- Hvert listeelement linker til detaljeside

### 3.3 Detalje Side

Fuld information om en specifik NOAH-afdeling eller -gruppe.

- Overordnet info som navn, kategori og beskrivelse
- Relevant kontaktinformation og links
- Lille kort der viser afdelingens placering
- Mulighed for at navigere tilbage til kort eller liste med bevaret state
- Det konkrete indhold på detaljesiden tilpasses den data der er tilgængelig via API'et

### 3.4 Om/Info Side (valgfri)

Kort side med info om NOAH og appens formål.

## 4. PWA-funktionalitet

- **Installerbar** – kan tilføjes til startskærmen på mobil og desktop
- **Offline-support** – cached data og app shell er tilgængeligt uden internet
- **App-lignende oplevelse** – åbner i fuldskærm uden browser-chrome
- **Web App Manifest** – med NOAHs branding, ikoner og farver

## 5. API-design (Postman)

Med under 100 POIs er ét samlet endpoint der inkluderer al data den bedste løsning – det giver nem vedligeholdelse/administration, hurtigere navigation og forbedret offline-support.

### POI Datamodel (eksempel)

```json
[
  {
    "id": "uuid",
    "slug": "noah-aarhus",
    "navn": "NOAH Aarhus",
    "kategori": "lokalgruppe",
    "beskrivelse": "NOAHs lokalgruppe i Aarhus arbejder med...",
    "adresse": {
      "gade": "Vestergade 12",
      "postnummer": "8000",
      "by": "Aarhus C",
      "region": "Midtjylland"
    },
    "koordinater": {
      "lat": 56.1572,
      "lng": 10.2107
    },
    "kontakt": {
      "email": "aarhus@noah.dk",
      "telefon": "45 12345678"
    },
    "links": {
      "website": "https://noah.dk/aarhus"
    },
    "opdateret": "20260115T103000Z"
  }
]
```

Kategorier (til filtrering) og regioner udtrækkes automatisk fra de returnerede POIs. Når en ny kategori tilføjes til en POI i API'et, dukker den automatisk op som filtermulighed i appen – uden ekstra opsætning.

## 6. Tilgængelighed (Accessibility)

Appen bygges efter WCAG 2.2 AA-standarden. De vigtigste tiltag:

- ARIA-labels på kort, markører, popups og alle interaktive elementer, så skærmlæsere kan formidle indholdet
- Liste-siden som alternativ til kortet – sikrer at al information er tilgængelig uden at bruge kortet

## 7. Performance & SEO

- **Statisk generering (SSG)** – sider pre-renderes ved build for hurtig indlæsning
- **Lazy loading af kort** – kortet indlæses først når det er synligt
- **Edge caching** – Cloudflare CDN cacher assets tæt på brugeren
- **SEO-metadata** – Dynamisk `<title>`, description og Open Graph-tags på alle sider
- **Sitemap** – Auto-genereret sitemap.xml med alle detaljesider
