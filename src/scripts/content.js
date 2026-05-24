console.log("[PRONOTE EXPORTER] Content script démarré.");

// Injection de inject.js pour intercepter XHR et Fetch
try {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/scripts/inject.js");
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
} catch (err) {
  console.error("[PRONOTE EXPORTER] Erreur injection:", err);
}

// Variables de session globales
let localGradesCache = null;
let savedSubjectsIndex = {};

// 1. Récupération immédiate de l'index des matières sauvegardé au tour précédent
chrome.storage.local.get(["pronoteSubjectsIndex"], (result) => {
  if (result.pronoteSubjectsIndex) {
    savedSubjectsIndex = result.pronoteSubjectsIndex;
    console.log(
      "[PRONOTE EXPORTER] 📂 Index des matières restauré depuis la mémoire :",
      Object.keys(savedSubjectsIndex).length,
      "matières chargées.",
    );
  }
});

// Écouteur principal des données réseau interceptées
window.addEventListener("PRONOTE_DATA_INTERCEPTED", (event) => {
  const raw = event.detail;
  if (!raw) return;

  try {
    const result = ultraAgressiveSearch(raw);

    if (result && result.notes && result.notes.length > 0) {
      if (!localGradesCache) {
        localGradesCache = result;
      } else {
        // Fusion des notes pour éviter les doublons
        result.notes.forEach((newNote) => {
          const exists = localGradesCache.notes.some(
            (n) =>
              n.matiere === newNote.matiere &&
              n.valeur === newNote.valeur &&
              n.date === newNote.date,
          );
          if (!exists) localGradesCache.notes.push(newNote);
        });

        // Fusion des moyennes de disciplines
        localGradesCache.averages = {
          ...localGradesCache.averages,
          ...result.averages,
        };
        localGradesCache.periodes = Array.from(
          new Set([
            ...(localGradesCache.periodes || []),
            ...(result.periodes || []),
          ]),
        );
      }

      // Recalculer les disciplines uniques de l'onglet
      const matieresUniques = new Set(
        localGradesCache.notes.map((n) => n.matiere),
      );
      localGradesCache.disciplines = Array.from(matieresUniques).map((m) => ({
        designation: m,
      }));

      console.log(
        `[PRONOTE EXPORTER] 🔥 REUSSITE ! ${result.notes.length} notes traitées dans ce paquet. Total en cache: ${localGradesCache.notes.length}`,
      );
    }
  } catch (err) {
    console.error("[PRONOTE EXPORTER] Erreur d'analyse interne:", err);
  }
});

/**
 * Extracteur et Décodeur profond de requêtes PRONOTE
 */
function ultraAgressiveSearch(obj) {
  let extractedNotes = [];
  let currentMatiereContext = "Général";
  let foundAverages = {};
  let foundPeriodes = new Set();
  let newSubjectsFound = false;

  // --- Étape A : Recherche et mémorisation universelle des Matières ---
  function scanForSubjects(current) {
    if (!current || typeof current !== "object") return;

    // Structure de liste de matières typique IndexÉducation (recherche d'un libellé et d'un ID)
    if (current.libelle || current.designation) {
      const nom = current.libelle || current.designation;
      const id = current.N || current.id || current.ID;
      if (id && nom && typeof nom === "string" && nom.length > 1) {
        if (savedSubjectsIndex[id] !== nom) {
          savedSubjectsIndex[id] = nom;
          newSubjectsFound = true;
        }
      }

      // Capture simultanée des blocs de moyennes s'ils sont présents dans cette vue
      if (current.moyenne || current.moyenneEleve) {
        foundAverages[nom] = {
          student:
            current.moyenne?.V || current.moyenneEleve?.V || current.moyenne,
          class: current.moyenneClasse?.V || current.moyenneClasse || null,
        };
      }
    }

    if (current.periode && typeof current.periode === "string") {
      foundPeriodes.add(current.periode);
    }

    for (let key in current) {
      if (Object.prototype.hasOwnProperty.call(current, key))
        scanForSubjects(current[key]);
    }
  }

  scanForSubjects(obj);

  // Si de nouvelles matières ont été découvertes, on les sauvegarde de manière persistante
  if (newSubjectsFound) {
    chrome.storage.local.set({ pronoteSubjectsIndex: savedSubjectsIndex });
    console.log(
      "[PRONOTE EXPORTER] 💾 Nouvelles correspondances de matières enregistrées en mémoire.",
    );
  }

  // --- Étape B : Scan profond et extraction des notes ---
  function scanForGrades(current, parentKey = "") {
    if (!current || typeof current !== "object") return;

    // Détection d'un nom de matière potentiel au niveau d'un groupe parent
    if (current.libelle || current.designation || current.libelleMatiere) {
      const potentielNom =
        current.libelle || current.designation || current.libelleMatiere;
      if (
        typeof potentielNom === "string" &&
        potentielNom.length > 2 &&
        !potentielNom.includes("{")
      ) {
        currentMatiereContext = potentielNom;
      }
    }

    if (Array.isArray(current)) {
      current.forEach((item) => {
        if (item && typeof item === "object") {
          let rawVal =
            item.note?.V ||
            item.valeur?.V ||
            item.note ||
            item.valeur ||
            item.v;
          if (rawVal !== undefined && rawVal !== null) {
            let strVal = String(rawVal).trim();

            if (
              strVal &&
              (!isNaN(strVal.replace(",", ".")) ||
                ["Abs", "Disp", "Dispense", "A", "N.Not"].includes(strVal))
            ) {
              // Résolution de la matière (via ID ou nom direct)
              let matiereId =
                item.matiere?.V || item.matiere || item.matiereId || item.m;
              let matiereNom = "Général";

              if (matiereId) {
                if (savedSubjectsIndex[matiereId]) {
                  matiereNom = savedSubjectsIndex[matiereId];
                } else if (
                  typeof matiereId === "string" &&
                  matiereId.length > 2 &&
                  isNaN(matiereId)
                ) {
                  matiereNom = matiereId;
                }
              }

              // Repli sur le contexte récolté si toujours inconnu
              if (
                matiereNom === "Général" &&
                currentMatiereContext !== "Général"
              ) {
                matiereNom = currentMatiereContext;
              }

              if (item.libelleMatiere) matiereNom = item.libelleMatiere;
              if (item.libelle) matiereNom = item.libelle;

              extractedNotes.push({
                valeur: strVal,
                matiere: matiereNom,
                date:
                  item.date?.V ||
                  item.date ||
                  new Date().toLocaleDateString("fr-FR"),
                coefficient: item.coefficient || item.coef || 1,
                commentaire: item.commentaire || item.info || "",
                periode: item.periode?.V || item.periode || "Période Courante",
              });
            }
          }
        }
      });
    }

    for (let key in current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        if (
          (key.toLowerCase().includes("matiere") || key === "libelle") &&
          typeof current[key] === "string"
        ) {
          currentMatiereContext = current[key];
        }
        scanForGrades(current[key], key);
      }
    }
  }

  scanForGrades(obj);

  if (extractedNotes.length > 0) {
    // Post-traitement : Nettoyage final des libellés orphelins
    extractedNotes = extractedNotes.map((n) => {
      if (n.matiere === "Général" && currentMatiereContext !== "Général") {
        n.matiere = currentMatiereContext;
      }
      return n;
    });

    return {
      notes: extractedNotes,
      averages: foundAverages,
      periodes: Array.from(foundPeriodes),
      eleve: { nom: "Élève Connecté" },
    };
  }
  return null;
}

// Transmission du cache au popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_grades") {
    sendResponse(localGradesCache);
  }
  return true;
});
