const DATA_URL = "data/data.json";
const LEXICAL_URL = "data/champs_lexicaux.json";
const DISPLAY_LIMITS = {
  events: 12,
  lexical: 12,
  terms: 15,
};

const state = {
  proofs: [],
  lexicalAnalyses: new Map(),
  filters: {
    ton: "",
    echelle: "",
    secteur: "",
    champLexical: "",
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
  lexicalDetail: document.querySelector("#lexicalDetail"),
  lexicalDetailTitle: document.querySelector("#lexicalDetailTitle"),
  lexicalDetailBody: document.querySelector("#lexicalDetailBody"),
  clearLexicalFilter: document.querySelector("#clearLexicalFilter"),
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
  if (state.filters.champLexical && !asArray(proof.champs_lexicaux).map(text).includes(state.filters.champLexical)) {
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

function renderLexicalList(rows, limit) {
  els.lexicalList.replaceChildren();
  const visibleRows = rows.slice(0, limit);

  if (!visibleRows.length) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "Aucune donnée";
    els.lexicalList.append(item);
    return;
  }

  visibleRows.forEach(([label, count]) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const number = document.createElement("strong");

    button.type = "button";
    button.className = "rank-button";
    if (state.filters.champLexical === label) {
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }
    button.textContent = label;
    button.addEventListener("click", () => {
      state.filters.champLexical = state.filters.champLexical === label ? "" : label;
      render();
    });

    number.textContent = count;
    item.append(button, number);
    els.lexicalList.append(item);
  });
}

function createParagraphs(textValue) {
  const fragment = document.createDocumentFragment();
  text(textValue)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((paragraph) => {
      const p = document.createElement("p");
      p.className = "detail-text";
      p.textContent = paragraph;
      fragment.append(p);
    });
  return fragment;
}

function createValueList(values) {
  const list = document.createElement("ul");
  list.className = "detail-list";
  asArray(values).forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  });
  if (!list.children.length) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "Non renseigné";
    list.append(item);
  }
  return list;
}

function createCountList(values) {
  const list = document.createElement("ul");
  list.className = "detail-counts";

  if (Array.isArray(values)) {
    values.forEach((entry) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const count = document.createElement("strong");
      name.textContent = text(entry.nom);
      count.textContent = Number(entry.nb_sources) || 0;
      item.append(name, count);
      list.append(item);
    });
  } else if (values && typeof values === "object") {
    Object.entries(values).forEach(([nameValue, countValue]) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const count = document.createElement("strong");
      name.textContent = nameValue;
      count.textContent = Number(countValue) || 0;
      item.append(name, count);
      list.append(item);
    });
  }

  if (!list.children.length) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "Non renseigné";
    list.append(item);
  }
  return list;
}

function appendDetailSection(parent, title, content, wide = false) {
  const section = document.createElement("section");
  section.className = wide ? "detail-section full" : "detail-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading, content);
  parent.append(section);
}

function renderLexicalDetail() {
  const selected = state.filters.champLexical;
  const analysis = state.lexicalAnalyses.get(selected);

  if (!selected || !analysis) {
    els.lexicalDetail.classList.add("is-hidden");
    els.lexicalDetailTitle.textContent = "";
    els.lexicalDetailBody.replaceChildren();
    return;
  }

  els.lexicalDetail.classList.remove("is-hidden");
  els.lexicalDetailTitle.textContent = selected;
  els.lexicalDetailBody.replaceChildren();

  const lead = document.createElement("p");
  lead.className = "detail-lede";
  lead.textContent = text(analysis.description_courte) || "Description non renseignée.";

  const analysisText = document.createElement("section");
  analysisText.className = "detail-analysis";
  analysisText.append(createParagraphs(analysis.analyse));

  const grid = document.createElement("div");
  grid.className = "detail-grid";
  appendDetailSection(grid, "Points clés", createValueList(analysis.points_cles), true);
  appendDetailSection(grid, "Tons", createCountList(analysis.repartition_ton));
  appendDetailSection(grid, "Échelles", createCountList(analysis.echelles));
  appendDetailSection(grid, "Secteurs", createCountList(analysis.secteurs_principaux));
  appendDetailSection(grid, "Événements", createCountList(analysis.evenements_principaux));
  appendDetailSection(grid, "Noms", createValueList(analysis.termes_caracteristiques?.noms));
  appendDetailSection(grid, "Adjectifs", createValueList(analysis.termes_caracteristiques?.adjectifs));
  appendDetailSection(grid, "Verbes", createValueList(analysis.termes_caracteristiques?.verbes));
  appendDetailSection(grid, "Expressions", createValueList(analysis.expressions_caracteristiques));
  appendDetailSection(grid, "Associations lexicales", createValueList(analysis.associations_lexicales_caracteristiques), true);

  if (text(analysis.limites)) {
    appendDetailSection(grid, "Limites", createParagraphs(analysis.limites), true);
  }

  els.lexicalDetailBody.append(lead, analysisText, grid);
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
    const titleText = text(proof.titre) || text(proof.preuve) || "Preuve sans titre";
    const url = text(proof.url);
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = titleText;
      title.append(link);
    } else {
      title.textContent = titleText;
    }

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
  renderLexicalList(lexical, DISPLAY_LIMITS.lexical);
  renderLexicalDetail();
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
  els.clearLexicalFilter.addEventListener("click", () => {
    state.filters.champLexical = "";
    render();
  });
}

async function init() {
  try {
    setStatus("Chargement des données...");
    const [proofsResponse, lexicalResponse] = await Promise.all([fetch(DATA_URL), fetch(LEXICAL_URL)]);
    if (!proofsResponse.ok) {
      throw new Error(`Impossible de charger ${DATA_URL}`);
    }
    if (!lexicalResponse.ok) {
      throw new Error(`Impossible de charger ${LEXICAL_URL}`);
    }
    const data = await proofsResponse.json();
    const lexicalData = await lexicalResponse.json();
    state.proofs = Array.isArray(data) ? data : [];
    state.lexicalAnalyses = new Map(
      (Array.isArray(lexicalData) ? lexicalData : [])
        .map((analysis) => [text(analysis.nom), analysis])
        .filter(([name]) => Boolean(name)),
    );
    buildSectorFilter(state.proofs);
    bindFilters();
    setStatus("");
    render();
  } catch (error) {
    console.error(error);
    els.resultCount.textContent = "Aucune donnée chargée";
    setStatus("Les fichiers de données n'ont pas pu être chargés. Lancez l'interface avec un petit serveur local.", "error");
  }
}

init();
