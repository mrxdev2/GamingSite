# GamingHub 🎮

Jukwaa la kupakia na kupakua michezo, lenye mfumo wa **coin/wallet** kwa malipo, na eneo la **admin** la kuthibitisha malipo ya coin.

## Vipengele

- **Vinjari Michezo** — kadi za michezo zenye icon, picha ya preview, na kitufe cha kupakua.
- **Ongeza Mchezo** — mtu yeyote anaweza kupakia mchezo: jina, link ya icon, link ya preview, link ya download, bei kwa coin, na **password yake mwenyewe** ya kutumia baadaye kufuta/kubadili tangazo lake (hakuna akaunti inahitajika kwa hili).
- **Pochi (Wallet)** — akaunti nyepesi ya jina-la-mtumiaji + password inayoshikilia salio la coin.
- **Kununua Coin kwa USSD (Mfumo wa Malipo)** — mtumiaji anachagua idadi ya coin (coin 1 = TSH 500), anatumiwa maelekezo ya kutuma pesa kwa USSD kwenda namba iliyowekwa (mfano `0775710774`, Yas/Mixx by Yas), kisha anawasilisha *transaction reference* yake. Ombi linabaki "linalosubiri" mpaka **admin athibitishe**, ndipo coin zinaingia kwenye Pochi yake papo hapo.
- **Admin Dashboard** — kuona/kuthibitisha/kukataa maombi ya coin, na takwimu za jumla.

### Kuhusu malipo ya USSD — muhimu kusoma

Hakuna huduma ya moja kwa moja (automatic) ya kukata pesa simu kwa simu bila akaunti rasmi ya *payment aggregator* (mfano Selcom Pesa, Azampay, ClickPesa, au API ya moja kwa moja ya mtandao wa simu) yenye API keys zake — hizo hupatikana kwa kusajili biashara rasmi na mtoa huduma huyo. Kwa hiyo mfumo huu unatumia mtiririko wa kweli na wa haki:

1. Mtumiaji anaona kiasi cha kulipa na namba ya kutumia.
2. Anatuma pesa mwenyewe kwa USSD ya kawaida ya simu yake.
3. Anawasilisha namba ya muamala (transaction ID) kwenye fomu.
4. Wewe (admin) unaangalia ujumbe/statement yako ya mobile money, kisha unabofya "Kubali" — coin zinaongezwa papo hapo.

Ukipata akaunti ya mtoa huduma wa malipo baadaye (Selcom, Azampay, ClickPesa n.k.), badilisha hatua 2-4 kwa *webhook* itakayoita kazi ile ile ya "approve" moja kwa moja — muundo wa `routes/admin.js` na `routes/wallet.js` tayari umetengenezwa kwa namna hiyo ili iwe rahisi kuunganisha.

## Muundo wa Mradi

```
gaminghub/
  server.js            # Express app kuu
  lib/
    db.js              # "database" nyepesi ya JSON file (badilisha na Postgres/Mongo baadaye ukihitaji)
    passwords.js        # hashing ya password (crypto.scrypt, hakuna dependency ya ziada)
    middleware.js        # requireLogin / requireAdmin
  routes/
    auth.js             # register/login/logout ya akaunti za Pochi
    games.js            # CRUD ya michezo + download/purchase
    wallet.js           # taarifa za malipo + deposit requests
    admin.js            # admin login + kuthibitisha/kukataa deposits
  public/               # frontend (HTML/CSS/JS wazi, hakuna build step)
    index.html, add.html, wallet.html, admin.html
    css/style.css
    js/*.js
  data/                 # JSON files za data (huundwa kiotomatiki)
```

## Kuendesha Kwenye Kompyuta Yako (local)

Mahitaji: [Node.js](https://nodejs.org) toleo la 18 au zaidi.

```bash
cd gaminghub
npm install
cp .env.example .env
# fungua .env na ubadilishe SESSION_SECRET na ADMIN_PASSWORD
npm start
```

Fungua `http://localhost:3000` kwenye browser.

## Environment Variables

| Variable | Maana | Default |
|---|---|---|
| `SESSION_SECRET` | Neno la siri la ku-sign session cookies — **libadilishe** kwenye production | — |
| `ADMIN_PASSWORD` | Password ya kuingia `/admin.html` | `admin123` |
| `COIN_PRICE_TSH` | Bei ya coin 1 kwa TSH | `500` |
| `PAYMENT_NUMBER` | Namba ya kupokelea malipo ya USSD | `0775710774` |
| `PAYMENT_NETWORK` | Jina la mtandao linaloonyeshwa kwa mtumiaji | `Yas (Mixx by Yas)` |
| `PORT` | Port ya server (hosts nyingi huweka automatically) | `3000` |

## Muhimu Kuhusu Uhifadhi wa Data (Storage)

Mradi huu unatumia **JSON files** (`data/*.json`) kama database — hii inafanya mradi kuwa mwepesi kufunga (hakuna database ya nje inayohitajika), lakini kumbuka:

> Heroku na baadhi ya free tiers za Render/Railway zina **ephemeral filesystem** — faili zinafutika kila app inapo-restart au ku-redeploy.

Kwa matumizi madogo/majaribio hii ni sawa. Kwa production ya kudumu, fanya mojawapo:

1. Tumia **persistent volume/disk** (Railway na Render zinatoa hii kwenye paid plans), au
2. Badilisha `lib/db.js` kutumia database ya kweli (Postgres — Railway/Render zinatoa bure kiasi — au MongoDB Atlas free tier). Sehemu nyingine ya app (routes zote) hazitagusika kwa sababu zote zinaongea na `lib/db.js` tu.

## Ku-deploy

### Heroku

```bash
heroku create jina-la-app-yako
heroku config:set SESSION_SECRET="badilisha-hii" ADMIN_PASSWORD="badilisha-hii"
git push heroku main
```

`Procfile` tayari ipo (`web: node server.js`), na Heroku hutambua Node.js kiotomatiki kutoka `package.json`.

### Render

1. "New +" → "Web Service" → unganisha repo yako ya GitHub.
2. Build command: `npm install`
3. Start command: `npm start`
4. Ongeza Environment Variables (`SESSION_SECRET`, `ADMIN_PASSWORD`, n.k.) kwenye tab ya "Environment".
5. (Hiari, kwa data ya kudumu) Ongeza "Disk" na uielekeze kwenye folder ya `data/`.

### Railway

1. "New Project" → "Deploy from GitHub repo".
2. Railway itatambua Node.js kiotomatiki na kutumia `npm start`.
3. Kwenye tab ya "Variables", ongeza `SESSION_SECRET`, `ADMIN_PASSWORD`, n.k.
4. (Hiari, kwa data ya kudumu) Ongeza "Volume" na uielekeze kwenye `/app/data`.

## Usalama wa Msingi Ulioongezwa

- Password zote (za Pochi na za kila mchezo) zinahifadhiwa zikiwa zime-hash kwa `crypto.scrypt` + salt — hakuna plain text.
- Session cookies ni `httpOnly` na `secure` kwenye production.
- Rate limiting kwenye `/api/*` (maombi 60 kwa dakika kwa kila IP) kuzuia matumizi mabaya.
- Uthibitishaji wa aina ya URL kwa links zote (icon/preview/download) kabla ya kuhifadhiwa.
- Admin routes zote zimefungwa nyuma ya `requireAdmin` middleware.

## Vitu vya Kuongeza Baadaye (mapendekezo)

- Uunganishaji halisi wa API ya malipo (Selcom/Azampay/ClickPesa) badala ya uthibitisho wa mkono wa admin.
- Uwezo wa admin kufuta/kuficha mchezo wowote bila kuhitaji password ya mwenye mchezo (moderation).
- Kuhamisha kutoka JSON files kwenda Postgres/Mongo kwa ajili ya data ya kudumu na utendaji bora ukiwa na watumiaji wengi.
