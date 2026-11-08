# Bachotage, maquettes

Sources des 14 écrans du canevas Design : https://claude.ai/artifact/Bf1D5PrxAZ7jQUnxMbLAED

## Contenu

| Fichier | Écran |
| --- | --- |
| Main.dc.html | Révision (accueil) |
| Feed.dc.html | Feed et classement |
| Profil.dc.html | Profil (vue privée et publique, victoire de niveau) |
| Qcm.dc.html | QCM, mode entraînement |
| QcmResultat.dc.html | Bilan de série, mode examen |
| Flashcards.dc.html | Flashcards, file du jour |
| Exercice.dc.html | Exercice, correction et auto-évaluation |
| Connexion.dc.html | Connexion |
| Inscription.dc.html | Inscription (étape 1) |
| Photo.dc.html | Choix de la photo de profil (étape 2) |
| ProfilPublic.dc.html | Profil public d’un camarade |
| Notifications.dc.html | Panneau des notifications |
| MobileCartes.dc.html | Téléphone, accueil flashcards |
| MobileCarte.dc.html | Téléphone, carte en révision |
| theme.css | Styles partagés : boutons, cadres pixel, animations |
| canvas.json | Disposition des écrans sur le canevas |

## À savoir

- Les fichiers `.dc.html` sont au format du canevas Design. Ils chargent un moteur (`support.js`) fourni par le canevas, qui n’est pas dans l’archive : ouverts directement dans un navigateur, ils ne s’affichent pas correctement. Pour les voir, utilise le lien du canevas.
- Pour coder l’appli React, sers-t’en comme référence : couleurs, tailles, textes et logique d’état sont en clair dans chaque fichier (styles en ligne et classe `Component` en bas).
- Palette : fond pêche `#fde9d6` à `#f9cda4`, cartes `#fffaf3`, texte `#2a1a10`, accent `#bb4d00`, LCD `#fbba72` sur `#2a1a10`, juste `#276a3f`, faux `#8f250c`.
- Polices Google Fonts : Geist, Geist Mono, Doto (chiffres LCD), DotGothic16 (katakana).
- Les données (matières, pseudos, scores) sont fictives.
