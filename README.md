# 📈 ROI-Kalkylator: Sjukfrånvaro

## 📖 Beskrivning
En kraftfull och interaktiv B2B-kalkylator som hjälper företag att räkna ut de dolda kostnaderna för sjukfrånvaro. Verktyget synliggör hur mycket pengar verksamheten förlorar varje år och demonstrerar tydligt den potentiella besparingen (ROI) vid proaktiva hälsoinsatser. Samtidigt fungerar applikationen som en högkonverterande lead-generator, utformad för att samla in kvalitativa kontaktuppgifter.

## ✨ Funktioner & Säkerhet
- **Server-Side Beräkningar (Säkerhet):** Räknar ut alla kostnader och besparingar på servern för att förhindra manipulering av data.
- **Robust Spamskydd:** 
  - Använder en dold honeypot-teknik för att lura botar.
  - Implementerar Upstash Redis för distribuerad, beständig Rate Limiting som fungerar säkert i en Serverless-miljö.
- **Datasäkerhet:** Alla fritextfält escapas/saneras för att förhindra HTML-injektion innan de renderas i mailutskick.
- **Dubbla e-postutskick:** Skapar och skickar automatiskt ett snyggt och professionellt HTML-mail med en bifogad PDF till kunden, samt ett detaljerat lead-mail till admin.
- **Centraliserad Konfiguration:** All kund- och branschspecifik konfiguration (löner, företagsnamn) hanteras enkelt i `src/client.config.ts`.

## 🧮 Beräkningsformel (Sjukfrånvarokostnad)
Kalkylen baseras på branschstandardiserade schablonvärden:
1. **Kostnad per sjukdag:** `(Månadslön / 21 arbetsdagar) * 1.4` (1.4 täcker indirekta kostnader som vikarier, administration och produktionsbortfall samt lagstadgade arbetsgivaravgifter).
2. **Total årlig kostnad:** `Antal anställda * 220 arbetsdagar * (Sjukfrånvaro-% / 100) * Kostnad per sjukdag`.
3. **Potentiell besparing:** Ett intervall mellan 15% (Low) och 30% (High) av den totala årliga kostnaden.

## 🛠️ Teknikstack
- **Frontend:** React / TypeScript / Tailwind CSS (Vite)
- **Backend:** Vercel Serverless Functions (Node.js/Express)
- **E-post:** Resend API & PDFKit
- **Redis (Rate limit):** Upstash Redis

## 💻 Kom igång lokalt

1. **Klona repot och installera beroenden:**
   ```bash
   npm install
   ```

2. **Konfigurera miljövariabler:**
   Skapa en fil som heter `.env` (se `.env.example`) i projektets rotmapp och lägg in dina unika värden:
   ```env
   RESEND_API_KEY=din_resend_api_nyckel_här
   ADMIN_EMAIL=din_admin_epost_här
   KV_REST_API_URL=din_kv_url_här
   KV_REST_API_TOKEN=din_kv_token_här
   ALLOWED_ORIGIN=https://din-doman.se (frivillig i dev, viktig för prod)
   ```
   *Notera: `KV_REST_API_URL` och `KV_REST_API_TOKEN` skapas normalt automatiskt av Vercel när en Redis-databas kopplas till projektet via Storage-fliken.*

3. **Starta utvecklingsservern:**
   ```bash
   npm run dev
   ```

## 🚀 Deployment (Vercel)

Projektet är optimalt byggt för att snabbt och enkelt hostas på [Vercel](https://vercel.com).

1. Importera ditt anslutna GitHub-repo i Vercel.
2. **Viktigt:** Innan du bygger, säkerställ att du lägger in alla miljövariabler under inställningarna (Environment Variables) i Vercel-dashboarden.
3. Klicka på **Deploy**! Vercel kommer bygga frontenden samt kompilera API-filerna (`/api/send-roi.ts`) automatiskt.
