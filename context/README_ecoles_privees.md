# Écoles privées IDF + Grand Est — Prospection Genially + IA / Formiris + OPCO

**Fichier livrable v2** : `ecoles_privees_IDF_GrandEst_v2_Formiris_OPCO.csv` (téléchargé dans ton dossier Downloads, 1 888 lignes, séparateur `;`, encodage UTF-8 BOM)

**Source** : Annuaire de l'éducation, Ministère de l'Éducation Nationale (data.education.gouv.fr), extraction du 3 mai 2026

**Documents associés dans /outputs** :
- [`catalogue_formations.md`](catalogue_formations.md) — 6 formations Genially + IA, articulées Formiris / OPCO
- [`pitchs_prospection.md`](pitchs_prospection.md) — 3 emails d'approche + variantes LinkedIn + séquence multi-touch + saisonnalité

---

## Périmètre

1 888 écoles privées **ouvertes** en Île-de-France et Grand Est, niveaux primaire / collège / lycée. Médico-social et autres structures exclus.

| Région | Total | Sous contrat | Hors contrat | Inconnu |
|---|---|---|---|---|
| Île-de-France | 1 389 | 835 | 545 | 9 |
| Grand Est | 499 | 356 | 139 | 4 |
| **Total** | **1 888** | **1 191** | **684** | **13** |

Par type : 892 écoles primaires, 504 collèges, 492 lycées.

Top départements : Paris 431 / Hauts-de-Seine 196 / Yvelines 189 / Seine-Saint-Denis 146 / Val-de-Marne 124 / Val-d'Oise 109 / Seine-et-Marne 100 / Bas-Rhin 98 / Essonne 94 / Moselle 76 / Haut-Rhin 70 / Marne 63 / Meurthe-et-Moselle 61 / Vosges 46 / Aube 35 / Ardennes 22 / Meuse 18 / Haute-Marne 10.

---

## Colonnes du CSV v2

`UAI` | `nom_etablissement` | `type` | `nature` | `type_contrat_brut` | `statut_contrat` (Sous contrat / Hors contrat / Inconnu) | `adresse` | `code_postal` | `ville` | `code_dept` | `departement` | `region` | `telephone` | `email` | `site_web` | `siret` | **`public_Formiris`** | **`public_OPCO`** | `OPCO_probable` | **`formations_proposables`** | `contact_decisionnaire` (vide) | `fonction_contact` (vide) | `profil_pedagogique_notes` (vide) | `etat`

---

## La logique de double ciblage Formiris ↔ OPCO

C'est l'ossature de la stratégie commerciale. Sur **chaque école** tu peux qualifier deux publics et deux canaux de financement.

### Sous contrat (1 191 écoles, 63 %)
| Public | Canal de financement | Formations cible |
|---|---|---|
| **Enseignants** (1ʳ et 2nd degré) | **Formiris** (réseau enseignement catholique principalement) | IA pour enseignants, Genially pour enseigner, IA + Genially séquence A→Z |
| **Personnel non-enseignant** (direction, vie scolaire, admin, agents) | **OPCO AKTO** — CCN EPNL IDCC 3218 — via plan de développement des compétences | IA pour admin/direction, Genially pour la communication scolaire, productivité IA |

→ **Double pitch** sur le même établissement : un email Formiris (catalogue enseignants) + un email OPCO (catalogue admin). Cf. `pitchs_prospection.md` Pitch 1 et Pitch 2.

### Hors contrat (684 écoles, 37 %)
| Public | Canal de financement | Formations cible |
|---|---|---|
| **Tout le personnel** (enseignants compris) | **OPCO** (souvent AKTO via CCN EPNL — à vérifier au cas par cas via SIRET) | Toute la combinaison IA + Genially en parcours intra |

→ Pitch unique « format intra toute l'équipe », financement OPCO sur l'ensemble de l'effectif. Cf. `pitchs_prospection.md` Pitch 3.

### Vérification fiable
Pour confirmer l'OPCO réel d'un établissement, le SIRET (présent dans le CSV) permet une recherche sur `code-idcc.com` ou `cfadock.fr`. Pour Formiris, le rattachement de l'établissement est visible sur l'annuaire de l'enseignement catholique (`enseignement-catholique.fr`).

---

## ⚠️ Pré-requis Qualiopi (critique pour formations non-certifiantes)

Tes formations sont non-certifiantes — c'est parfaitement compatible avec un financement Formiris ET OPCO **à condition que ton OF soit certifié Qualiopi catégorie « Actions de formation » (catégorie 1)**. Sans Qualiopi : aucun financement public ni paritaire possible. Avec Qualiopi cat. 1 : tout est ouvert sauf le CPF (qui exige une certification RNCP / RS).

---

## Catalogue de formations construit pour ces cibles

Détail dans `catalogue_formations.md`. En résumé, six modules :

**Pour enseignants (Formiris)** :
1. L'IA générative au service de la pratique enseignante (14 h)
2. Genially pour enseigner — supports interactifs (14 h)
3. IA + Genially : concevoir une séquence de A à Z (21 h, atelier-projet)

**Pour personnel non-enseignant (OPCO AKTO)** :
4. L'IA générative pour le personnel administratif et de direction (14 h)
5. Genially pour la communication et l'administration scolaire (7 h)
6. Pack productivité IA — vie scolaire / accueil (7 h)

**En hors contrat** : combinaison libre des 6 modules en intra.

---

## Pitchs et séquence de prospection

Détail dans `pitchs_prospection.md`. À retenir :

- **3 emails type** calibrés (Formiris enseignants / OPCO admin sous contrat / OPCO toute l'équipe hors contrat)
- **2 variantes LinkedIn DM** courtes
- **Séquence multi-touch 21 jours** : email J0 → LinkedIn J+3 → relance J+7 → appel J+14 → stop/nurture J+21
- **Fenêtre saisonnière prioritaire** : mai à juillet (construction des plans de formation 2026-2027). Tu es au bon moment.

---

## Enrichissement contacts décisionnaires

Les colonnes `contact_decisionnaire`, `fonction_contact`, `profil_pedagogique_notes` sont vides — pas dans l'annuaire public. Trois pistes pour enrichir :

1. **Web scraping** des sites d'établissement (`site_web` renseigné pour 623 écoles / 1 888 dans le CSV) — la page « équipe » donne le chef d'établissement.
2. **LinkedIn Sales Navigator** : recherche par nom d'établissement → poste « Chef d'établissement » / « Directeur ».
3. **Enrichissement automatisé** : Dropcontact, Kaspr, Lusha — batch sur les noms + sites.

Je peux te générer un script de scraping ciblé si tu veux automatiser ça.

---

## Étendre

- **Autres régions** : je relance la même extraction. Codes INSEE utiles : 84 ARA, 76 Occitanie, 93 PACA, 32 Hauts-de-France, 75 Nouvelle-Aquitaine, 24 Centre-VL, 27 BFC, 28 Normandie, 52 Pays de la Loire, 53 Bretagne, 94 Corse.
- **Enseignement supérieur privé** (écoles de commerce, ingé, bachelors) : source différente — annuaire DS et listes Bachelor / Grade Master.
- **CFA et organismes de formation privés** : cibles OPCO les plus pures — annuaire Qualiopi DGEFP. Dis-moi si tu veux que je lance.
