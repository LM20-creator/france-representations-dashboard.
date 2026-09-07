const DATA_URL = "data/data.json";
const DISPLAY_LIMITS = {
  events: 12,
  lexical: 12,
  terms: 15,
};

const state = {
  proofs: [],
  filters: {
    ton: "",
    echelle: "",
    secteur: "",
  },
};

const els = {
  resultCount: document.querySelector("#resultCount"),
  status: document.querySelector("#status"),
  toneFilter: document.querySelector("#toneFilter"),
  scaleFilter: document.querySelector("#scaleFilter"),
  sectorFilter: document.querySelector("#sectorFilter"),
  eventsList: document.querySelector("#eventsList"),
  eventsMeta: document.querySelector("#eventsMeta"),
  lexicalList: document.querySelector("#lexicalList"),
  lexicalMeta: document.querySelector("#lexicalMeta"),
  nounsList: document.querySelector("#nounsList"),
  adjectivesList: document.querySelector("#adjectivesList"),
  verbsList: document.querySelector("#verbsList"),
  expressionsList: document.querySelector("#expressionsList"),
  associationsList: document.querySelector("#associationsList"),
  proofsList: document.querySelector("#proofsList"),
  proofsMeta: document.querySelector("#proofsMeta"),
};

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values) {
  return [...new Set(values.map(text).filter(Boolean))];
}

function sectorsForProof(proof) {
  return unique([proof.secteur_principal, ...asArray(proof.secteurs_secondaires)]);
}

function sortFrench(values) {
  return [...values].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function setStatus(message, type = "") {
  els.status.textContent = message;
  els.status.className = type ? `status ${type}` : "status";
}

function buildSectorFilter(proofs) {
  const sectors = new Set();
  proofs.forEach((proof) => {
    sectorsForProof(proof).forEach((sector) => sectors.add(sector));
  });

  sortFrench(sectors).forEach((sector) => {
    const option = document.createElement("option");
    option.value = sector;
    option.textContent = sector;
    els.sectorFilter.append(option);
  });
}

function proofMatchesFilters(proof) {
  if (state.filters.ton && text(proof.ton) !== state.filters.ton) {
    return false;
  }
  if (state.filters.echelle && text(proof.echelle) !== state.filters.echelle) {
    return false;
  }
  if (state.filters.secteur && !sectorsForProof(proof).includes(state.filters.secteur)) {
    return false;
  }
  return true;
}

function countByProof(proofs, field) {
  const counts = new Map();
  proofs.forEach((proof) => {
    unique(asArray(proof[field])).forEach((item) => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
}

function renderRankList(listEl, rows, limit) {
  listEl.replaceChildren();
  const visibleRows = rows.slice(0, limit);

  if (!visibleRows.length) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "Aucune donnée";
    listEl.append(item);
    return;
  }

  visibleRows.forEach(([label, count]) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const number = document.createElement("strong");
    name.textContent = label;
    number.textContent = count;
    item.append(name, number);
    listEl.append(item);
  });
}

function renderProofs(proofs) {
  els.proofsList.replaceChildren();
  els.proofsMeta.textContent = `${proofs.length} affichées`;

  if (!proofs.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune preuve ne correspond aux filtres sélectionnés.";
    els.proofsList.append(empty);
    return;
  }

  proofs.forEach((proof) => {
    const card = document.createElement("article");
    card.className = "proof-card";

    const title = document.createElement("h3");
    title.textContent = text(proof.titre) || text(proof.preuve) || "Preuve sans titre";

    const meta = document.createElement("p");
    meta.className = "proof-meta";
    meta.textContent = [proof.source, proof.date_publication].map(text).filter(Boolean).join(" · ");

    const tags = document.createElement("div");
    tags.className = "tags";
    [proof.ton, proof.echelle, proof.secteur_principal, ...asArray(proof.evenements).slice(0, 1)]
      .map(text)
      .filter(Boolean)
      .forEach((value) => {
        const tag = document.createElement("span");
        tag.textContent = value;
        tags.append(tag);
      });

    card.append(title, meta, tags);
    els.proofsList.append(card);
  });
}

function render() {
  const filtered = state.proofs.filter(proofMatchesFilters);
  els.resultCount.textContent = `${filtered.length} preuves sur ${state.proofs.length}`;

  const events = countByProof(filtered, "evenements");
  const lexical = countByProof(filtered, "champs_lexicaux");
  els.eventsMeta.textContent = events.length ? `${Math.min(events.length, DISPLAY_LIMITS.events)} principaux` : "";
  els.lexicalMeta.textContent = lexical.length ? `${Math.min(lexical.length, DISPLAY_LIMITS.lexical)} principaux` : "";

  renderRankList(els.eventsList, events, DISPLAY_LIMITS.events);
  renderRankList(els.lexicalList, lexical, DISPLAY_LIMITS.lexical);
  renderRankList(els.nounsList, countByProof(filtered, "noms"), DISPLAY_LIMITS.terms);
  renderRankList(els.adjectivesList, countByProof(filtered, "adjectifs"), DISPLAY_LIMITS.terms);
  renderRankList(els.verbsList, countByProof(filtered, "verbes"), DISPLAY_LIMITS.terms);
  renderRankList(els.expressionsList, countByProof(filtered, "expressions"), DISPLAY_LIMITS.terms);
  renderRankList(els.associationsList, countByProof(filtered, "associations_lexicales"), DISPLAY_LIMITS.terms);
  renderProofs(filtered);
}

function bindFilters() {
  els.toneFilter.addEventListener("change", (event) => {
    state.filters.ton = event.target.value;
    render();
  });
  els.scaleFilter.addEventListener("change", (event) => {
    state.filters.echelle = event.target.value;
    render();
  });
  els.sectorFilter.addEventListener("change", (event) => {
    state.filters.secteur = event.target.value;
    render();
  });
}

async function init() {
  try {
    setStatus("Chargement des données...");
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Impossible de charger ${DATA_URL}`);
    }
    const data = await response.json();
    state.proofs = Array.isArray(data) ? data : [];
    buildSectorFilter(state.proofs);
    bindFilters();
    setStatus("");
    render();
  } catch (error) {
    console.error(error);
    els.resultCount.textContent = "Aucune donnée chargée";
    setStatus("Le fichier data/data.json n'a pas pu être chargé. Lancez l'interface avec un petit serveur local.", "error");
  }
}

init();
