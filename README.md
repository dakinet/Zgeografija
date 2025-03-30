# Zanimljiva Geografija

Multiplayer igra "Zanimljiva Geografija" implementirana kao Node.js web aplikacija sa Socket.io za realtime komunikaciju. Tradicionalna igra poznata u regionu Balkana, digitalizovana za online igranje.

![Zanimljiva Geografija Screenshot](https://via.placeholder.com/800x400?text=Zanimljiva+Geografija)

## 🎮 Funkcionalnosti

- **Multiplayer**: Igrajte sa prijateljima u realnom vremenu
- **Korisnički kreiranje igara**: Kreiranje igara i deljenje koda za pristup
- **Kategorije**: Veliki broj kategorija (Zastava, Država, Grad, Reka, Planina, Biljka, Životinja, itd.)
- **Sistem bodovanja**: Automatsko praćenje rezultata za sve igrače
- **Vizualizacije zastava**: Integracija sa REST Countries API za prikaz zastava
- **Responsive dizajn**: Prilagođeno za mobilne uređaje i desktop
- **Tajmeri za runde**: Vremensko ograničenje za svaku rundu
- **Validacija odgovora**: Sistem za potvrdu i bodovanje odgovora

## 📱 Mobile-friendly

Igra je posebno optimizovana za Android pregledače, uzimajući u obzir specifičnosti mobilnih uređaja:
- Prilagođen prikaz kad tastatura zauzima pola ekrana
- Responsive dizajn koji se automatski prilagođava dimenzijama ekrana
- Touch-friendly kontrole

## 🚀 Tehnologije

- **Backend**: Node.js & Express
- **Realtime komunikacija**: Socket.io
- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **API integracija**: REST Countries API za zastave

## ⚙️ Instalacija i pokretanje

### Preduslovi

- Node.js (verzija 18.x ili novija)
- NPM (dolazi uz Node.js)

### Instalacija

1. Klonirajte repozitorijum:
```bash
git clone https://github.com/your-username/zanimljiva-geografija.git
cd zanimljiva-geografija
```

2. Instalirajte zavisnosti:
```bash
npm install
```

3. Pokrenite aplikaciju:
```bash
npm start
```

4. Otvorite aplikaciju u pregledaču:
```
http://localhost:3000
```

## 🌐 Deployment

Aplikacija je spremna za deployment na platforme kao što su Render, Heroku, ili Vercel. Za Render, pratite sledeće korake:

1. Napravite novi Web Service na Render dashboard-u
2. Povežite sa GitHub repozitorijumom
3. Postavite Build Command na `npm install`
4. Postavite Start Command na `npm start`
5. Kliknite na "Create Web Service"

## 🎲 Kako igrati

1. **Kreiranje igre**:
   - Unesite svoje ime i kliknite "Kreiraj igru"
   - Podelite kod igre sa prijateljima

2. **Pridruživanje igri**:
   - Unesite svoje ime
   - Unesite kod igre i kliknite "Pridruži se"

3. **Tok igre**:
   - Igrači se označavaju kao "Spreman"
   - Igra počinje kada su svi igrači spremni
   - Igrač na potezu bira slovo
   - Svi igrači popunjavaju kategorije na izabrano slovo
   - Nakon isteka vremena, ili kad svi završe, rezultati se prikazuju
   - Host potvrđuje validnost odgovora
   - Igra se nastavlja dok se ne iskoriste sva slova

4. **Bodovanje**:
   - Svaki tačan odgovor nosi 10 poena
   - Na kraju igre, igrač sa najviše poena je pobednik

## 📝 Pravila igre

- Odgovori moraju počinjati izabranim slovom
- Odgovori moraju biti jedinstveni i pravilno napisani
- Vreme za odgovore je ograničeno (podrazumevano 60 sekundi)
- Slova koja su već korišćena nisu dostupna za sledeće runde
- Za kategoriju "Zastava" možete odabrati zastavu iz prikazanih opcija

## 🤝 Doprinos projektu

Doprinosi su dobrodošli! Ako želite da doprinesete, molimo:

1. Fork-ujte repozitorijum
2. Napravite feature branch (`git checkout -b feature/amazing-feature`)
3. Commit-ujte vaše promene (`git commit -m 'Add amazing feature'`)
4. Push-ujte na branch (`git push origin feature/amazing-feature`)
5. Otvorite Pull Request

## 📜 Licenca

Distribuirano pod MIT licencom. Pogledajte `LICENSE` za više informacija.

## 🙏 Zahvalnice

- [Socket.io](https://socket.io/) za realtime komunikaciju
- [REST Countries API](https://restcountries.com/) za podatke o zastavama
- [Express](https://expressjs.com/) za server framework
- [Font Awesome](https://fontawesome.com/) za ikonice