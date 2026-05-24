# PRONOTE Exporter <img src="src/assets/icons/icon64.png" alt="icône" width="64px">

**PRONOTE Exporter** est une extension de navigateur (Manifest v3) minimaliste et puissante, conçue pour intercepter, afficher et exporter localement vos notes et vos moyennes depuis votre espace PRONOTE. 

L'extension fonctionne en arrière-plan en analysant de manière sécurisée les requêtes réseau pour extraire vos données d'évaluation sans jamais les transmettre à un serveur tiers.

---

## ✨ Fonctionnalités

- **Interception Réseau Temps Réel :** Capture les flux de données (XHR/Fetch) de PRONOTE dès que vous consultez l'onglet "Notes".
- **Tableau de Bord Intégré (Popup) :**
  - **Récapitulatif :** Nombre de matières détectées et total des notes interceptées.
  - **Vue Chronologique :** Liste exhaustive de toutes les notes avec coefficients, dates et commentaires des professeurs.
  - **Vue par Matière :** Regroupement automatisé affichant votre moyenne globale calculée ainsi que celle de la classe.
- **Multi-Formats d'Exportation :**
  - **JSON :** Format brut structuré idéal pour les développeurs ou la sauvegarde de données.
  - **CSV :** Parfaitement optimisé pour l'importation directe dans Microsoft Excel ou Google Sheets.
  - **Markdown :** Idéal pour l'intégration dans vos notes personnelles, Obsidian, Notion ou vos wikis.
- **Respect de la vie privée :** Vos identifiants et données de scolarité restent localement dans votre navigateur (utilisation de `chrome.storage.local`). Aucune donnée n'est envoyée à l'extérieur.

---

## 🛠️ Architecture du Code

L'extension est articulée autour de 4 composants clés :
1. `manifest.json` : Fichier de configuration de l'extension (permissions requises : `storage`, déclarations des scripts de contenu).
2. `inject.js` : Injecté directement dans la page web (DOM) pour surcharger (`override`) les méthodes globales `window.fetch` et `XMLHttpRequest.prototype.send` afin de copier les paquets JSON transitant sur le réseau.
3. `content.js` : Reçoit les paquets interceptés par le script d'injection, utilise un algorithme d'exploration récursive profonde (`ultraAgressiveSearch`) pour nettoyer et structurer les données brutes complexes d'Index Éducation, puis gère le cache local.
4. `popup.html` / `popup.js` : Interface graphique utilisateur (UI) codée sans framework, assurant l'affichage dynamique via des onglets interactifs et générant les fichiers à télécharger.

---

## 🚀 Installation (Mode Développeur)

Puisque l'extension n'est pas encore publiée sur le Chrome Web Store, voici comment l'installer manuellement sur un navigateur basé sur Chromium (Google Chrome, Brave, Microsoft Edge, Opera) :

1. **Téléchargez ou clonez** l'intégralité des fichiers du projet dans un dossier local (ex: `Pronote-Exporter`).
2. Ouvrez votre navigateur et accédez à la page de gestion des extensions :
   - Sur Chrome : `chrome://extensions/`
   - Sur Brave : `brave://extensions/`
   - Sur Edge : `edge://extensions/`
3. Activez le **Mode développeur** (interrupteur situé généralement en haut à droite).
4. Cliquez sur le bouton **Charger l'extension non empaquetée** (Load unpacked) en haut à gauche.
5. Sélectionnez le dossier racine contenant les fichiers de l'extension (le dossier où se trouve le fichier `manifest.json`).
6. L'icône de **PRONOTE Exporter** apparaît désormais dans votre barre d'extensions ! Pinnez-la pour y accéder plus facilement.

---

## 📖 Mode d'emploi

1. Connectez-vous à votre espace habituel **PRONOTE** (via votre ENT ou directement).
2. Dirigez-vous sur l'onglet **Notes** de PRONOTE (la page contenant vos derniers devoirs et vos moyennes). 
3. Cliquez sur l'icône de l'extension **PRONOTE Exporter** dans votre barre d'outils.
4. Les statistiques se mettent à jour automatiquement ! Vous pouvez naviguer entre les onglets pour observer la liste de vos notes ou de vos moyennes.
5. Cliquez sur le format de votre choix (**JSON**, **CSV** ou **Markdown**) dans l'onglet *Export* pour télécharger instantanément votre fichier.

> 💡 **Note :** Si l'extension affiche un message indiquant qu'aucune note n'est en mémoire, rafraîchissez simplement votre page PRONOTE (F5), retournez bien sur l'onglet des notes, puis réouvrez le popup de l'extension.

---

## 👨‍💻 Développeur & Code Source

- **Auteur :** [Pyro](https://github.com/Pyronixus) - *Futur développeur full-stack passionné par la création d'outils pratiques et minimalistes.*
- **Dépôt Officiel :** [Pronote-Exporter](https://github.com/Pyronixus/Pronote-Exporter)

---

## ⚠️ Clause de non-responsabilité (Disclaimer)

Cette extension est un projet indépendant. Elle n'est en aucun cas affiliée, associée, autorisée, approuvée ou officiellement liée à la société *Index Éducation* ou au logiciel *PRONOTE*. L'outil est proposé uniquement à des fins éducatives et de productivité personnelle.