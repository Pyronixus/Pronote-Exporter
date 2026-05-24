// ============================================
// PRONOTE EXPORT - Extension pour récupérer les notes
// ============================================

// Éléments DOM
const exportStandardBtn = document.getElementById('exportStandardBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportMarkdownBtn = document.getElementById('exportMarkdownBtn');
const statusDiv = document.getElementById('status');
const loadingDiv = document.getElementById('loading');
const subjectsCountEl = document.getElementById('subjectsCount');
const notesCountEl = document.getElementById('notesCount');

// Sélection des conteneurs d'onglets réels de ton HTML d'origine
const gradesTabEl = document.getElementById('notePreview');
const subjectsTabEl = document.getElementById('subjectsPreview');
const helpTabEl = document.getElementById('help');

// Événements d'exportation
if (exportStandardBtn) exportStandardBtn.addEventListener('click', () => exportData('standard'));
if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportData('csv'));
if (exportMarkdownBtn) exportMarkdownBtn.addEventListener('click', () => exportData('markdown'));

// Variable globale contenant le flux intercepté
let currentPronoteData = null;

// ============================================
// DEBUG & LOGGING
// ============================================

function debugLog(message, data = null) {
    console.log(`[PRONOTE Export] ${message}`, data || '');
}

function showStatus(message, type = 'info') {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status show ${type}`;
    }
    if (type === 'success') {
        setTimeout(() => {
            if (statusDiv) statusDiv.classList.remove('show');
        }, 3000);
    }
}

function showLoading(show = true) {
    if (loadingDiv) {
        if (show) loadingDiv.classList.add('show');
        else loadingDiv.classList.remove('show');
    }
}

// ============================================
// LOGIQUE DE COMMUTATION DES ONGLETS D'ORIGINE
// ============================================
function switchTab(tabName) {
    debugLog(`Changement d'onglet : ${tabName}`);
    
    // 1. Gestion des classes actives sur les boutons du menu
    document.querySelectorAll('.tab-button').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 2. Gestion de l'affichage natif des conteneurs HTML d'origine
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // 3. Si on change d'onglet, on rafraîchit son contenu respectif
    if (currentPronoteData) {
        renderAllPreviews();
    }
}

// ============================================
// RECUPERATION ASYNCHRONE DU CACHE NETWORK
// ============================================
function getPronoteDataAsync() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs[0]) {
                resolve(null);
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: "extract_grades" }, (response) => {
                if (chrome.runtime.lastError || !response) {
                    debugLog("Aucune réponse du content script.");
                    resolve(null);
                } else {
                    resolve(response);
                }
            });
        });
    });
}

// ============================================
// LOGIQUE DE RENDU INTELLIGENT DES APERÇUS
// ============================================
function renderAllPreviews() {
    if (!currentPronoteData || !currentPronoteData.notes) return;
    
    const data = currentPronoteData;

    // --- RENDU PANNEAU 1 : TOUTES LES NOTES (ID: GRADES) ---
    if (gradesTabEl) {
        let htmlGrades = `
            <div style="background: white; border-radius: 12px; padding: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-top: 10px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid #eee; color: #764ba2; font-weight: bold;">
                            <th style="padding: 6px 4px;">Date</th>
                            <th style="padding: 6px 4px;">Matière</th>
                            <th style="padding: 6px 4px; text-align: center;">Note</th>
                            <th style="padding: 6px 4px; text-align: center;">Coef</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Tri chronologique décroissant (plus récent en premier)
        const notesTriees = [...data.notes].sort((a, b) => b.date.split('/').reverse().join('-').localeCompare(a.date.split('/').reverse().join('-')));

        notesTriees.forEach(n => {
            htmlGrades += `
                <tr style="border-bottom: 1px solid #f5f5f5;">
                    <td style="padding: 8px 4px; color: #666; white-space: nowrap;">${n.date}</td>
                    <td style="padding: 8px 4px; font-weight: 600; color: #333; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.matiere}</td>
                    <td style="padding: 8px 4px; text-align: center;">
                        <span style="background: #eef2ff; color: #764ba2; padding: 2px 6px; border-radius: 6px; font-weight: bold; font-size: 11px;">${n.valeur}</span>
                    </td>
                    <td style="padding: 8px 4px; text-align: center; color: #888;">x${n.coefficient}</td>
                </tr>
            `;
            if (n.commentaire && n.commentaire.trim() !== "") {
                htmlGrades += `
                    <tr style="background: #fafafa; border-bottom: 1px solid #f5f5f5;">
                        <td colspan="4" style="padding: 4px 8px; font-style: italic; color: #999; font-size: 10px;">💬 ${n.commentaire}</td>
                    </tr>
                `;
            }
        });

        htmlGrades += `</tbody></table></div>`;
        gradesTabEl.innerHTML = htmlGrades;
    }

    // --- RENDU PANNEAU 2 : PAR MATIÈRE (ID: SUBJECTS) ---
    if (subjectsTabEl) {
        // Liste dynamique et unique basée sur les notes reçues
        const matieresUniques = Array.from(new Set(data.notes.map(n => n.matiere || 'Sans matière'))).sort();

        let htmlSubjects = `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px; max-height: 280px; overflow-y: auto; padding-right: 4px;">`;

        matieresUniques.forEach(matiere => {
            const notesDeLaMatiere = data.notes.filter(n => n.matiere === matiere);
            const count = notesDeLaMatiere.length;
            const avgInfo = data.averages ? data.averages[matiere] : null;

            htmlSubjects += `
                <div class="note-item" style="background: white; padding: 10px 14px; border-radius: 10px; border-left: 5px solid #764ba2; margin: 0; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <strong style="font-size: 13px; color: #222;">${matiere}</strong>
                        <span style="font-size: 11px; background: #764ba2; color: white; padding: 1px 7px; border-radius: 10px; font-weight: 600;">
                            ${count} note${count > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666;">
                        <span>Moyenne élève : <strong style="color: #764ba2;">${avgInfo ? avgInfo.student : '-'}</strong></span>
                        ${avgInfo && avgInfo.class ? `<span style="color: #999;">(Classe: ${avgInfo.class})</span>` : ''}
                    </div>
                </div>
            `;
        });

        htmlSubjects += `</div>`;
        subjectsTabEl.innerHTML = htmlSubjects;
    }
}

// Rafraîchissement global au lancement du Popup
async function updateStats() {
    try {
        const data = await getPronoteDataAsync();
        
        if (data && data.notes && data.notes.length > 0) {
            currentPronoteData = data;

            // Mise à jour des petits badges d'en-tête ronds
            const totalNotes = data.notes.length;
            const totalMatieres = Array.from(new Set(data.notes.map(n => n.matiere))).length;

            if (subjectsCountEl) subjectsCountEl.textContent = totalMatieres;
            if (notesCountEl) notesCountEl.textContent = totalNotes;

            // Injecter le code HTML propre dans chaque bloc d'onglet respectif
            renderAllPreviews();
        } else {
            const emptyMessage = '<p style="color: black; font-size: 12px; text-align: center; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; margin-top:10px;">Aucune note interceptée en mémoire. Ouvrez d\'abord l\'onglet Notes de PRONOTE.</p>';
            if (gradesTabEl) gradesTabEl.innerHTML = emptyMessage;
            if (subjectsTabEl) subjectsTabEl.innerHTML = emptyMessage;
        }
    } catch (error) {
        debugLog('Erreur updateStats:', error);
    }
}

// ============================================
// CONFIGURATION DES FONCTIONS D'EXPORT
// ============================================

function formatStandard(data) {
    return JSON.stringify({
        metadata: { exportDate: new Date().toISOString(), source: 'PRONOTE', version: '1.2.0' },
        eleve: data.eleve || { nom: 'Élève Connecté' },
        periodes: data.periodes || [],
        averages: data.averages || {},
        notes: data.notes
    }, null, 2);
}

function formatCSV(data) {
    const rows = [['Date', 'Matiere', 'Note', 'Coefficient', 'Commentaire']];
    data.notes.forEach(n => {
        rows.push([n.date, n.matiere, n.valeur, n.coefficient, n.commentaire || '']);
    });
    return rows.map(row => row.map(cell => {
        const str = String(cell);
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')).join('\n');
}

function formatMarkdown(data) {
    const lines = [`# Notes PRONOTE\n`, `**Export du :** ${new Date().toLocaleDateString('fr-FR')}\n`, `--- \n`];
    const parMatiere = {};
    data.notes.forEach(n => {
        if (!parMatiere[n.matiere]) parMatiere[n.matiere] = [];
        parMatiere[n.matiere].push(n);
    });

    Object.entries(parMatiere).forEach(([matiere, notes]) => {
        lines.push(`### 📚 ${matiere}`);
        notes.forEach(n => {
            lines.push(`- **${n.valeur}** (coef ${n.coefficient}) — *le ${n.date}* ${n.commentaire ? `| ${n.commentaire}` : ''}`);
        });
        lines.push(``);
    });
    return lines.join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

async function exportData(format) {
    showLoading(true);
    try {
        const data = currentPronoteData;
        if (!data || !data.notes || data.notes.length === 0) {
            showStatus('⚠️ Aucune donnée disponible à exporter.', 'warning');
            showLoading(false);
            return;
        }

        let content, filename, mimeType;
        const timestamp = new Date().toISOString().split('T')[0];

        if (format === 'standard') {
            content = formatStandard(data);
            filename = `pronote_export_${timestamp}.json`;
            mimeType = 'application/json';
        } else if (format === 'csv') {
            content = formatCSV(data);
            filename = `pronote_export_${timestamp}.csv`;
            mimeType = 'text/csv';
        } else if (format === 'markdown') {
            content = formatMarkdown(data);
            filename = `pronote_export_${timestamp}.md`;
            mimeType = 'text/markdown';
        }

        downloadFile(content, filename, mimeType);
        showStatus(`✅ Fichier généré avec succès !`, 'success');
    } catch (error) {
        showStatus(`❌ Erreur d'export`, 'error');
    } finally {
        showLoading(false);
    }
}

// Initialisation au clic sur le bouton d'extension
debugLog('Extension PRONOTE démarrée');
updateStats();

// Écouteurs d'onglets originaux restaurés
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        switchTab(tabName);
    });
});