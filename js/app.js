/**
 * Main Application Controller
 * Handles filtering, search, WikiCFP lists, modal dialogs, real-time countdown ticking,
 * iCalendar (.ics) exports, and tabs.
 */

const DOMAIN_ALIASES = {
  "cv": ["cv", "computer vision", "vision", "image", "visual"],
  "robotics": ["robotics", "robot", "embodied ai", "embodied"],
  "representation-learning": ["representation learning", "representation-learning", "repr", "self-supervised", "embeddings"],
  "graphs": ["graphs", "graph", "gnn", "gnns", "knowledge graph"],
  "transfer-learning": ["transfer learning", "transfer-learning", "adaptation", "domain adaptation", "peft"],
  "multilingual": ["multilingual", "cross-lingual", "translation", "low-resource"],
  "discourse": ["discourse", "pragmatics", "rst", "dialogue coherence"],
  "implicature": ["implicature", "presupposition", "pragmatic reasoning"],
  "multimodal": ["multimodal", "vision-language", "vlm", "audio-visual"],
  "causality": ["causality", "causal", "counterfactual", "invariant"],
  "qa-qg": ["qa-qg", "qa", "qg", "question answering", "question generation", "rag"],
  "ir-search": ["ir-search", "ir", "search", "information retrieval", "web", "mining"],
  "general-ai-ml": ["general-ai-ml", "machine learning", "ml", "ai", "artificial intelligence"],
  "general-nlp": ["general-nlp", "nlp", "computational linguistics", "cl"],
  "cognitive-science": ["cognitive-science", "cogsci", "cognitive science"]
};

class ConferenceTrackerApp {
  constructor() {
    this.activeTab = "tab-venues";
    this.activeVisualizerSubtab = "yearly";
    this.viewMode = "table"; // 'table' or 'cards'
    this.selectedListId = "all";
    this.searchQuery = "";
    this.filterDeadlineRange = "all";
    this.filterRank = "all";
    this.filterDomain = "all";
    this.filterType = "all";
    this.sortBy = "deadline-asc";
    this.workshopSortBy = "deadline-asc";
    this.countdownInterval = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.populateFilterDropdowns();
    this.renderActiveTab();
    this.startCountdownLoop();
    this.checkForSharedListInUrl();
    window.addEventListener("hashchange", () => this.checkForSharedListInUrl());

    // Dynamically ensure freshest master catalog is loaded
    this.fetchMasterCatalog();
  }

  fetchMasterCatalog() {
    fetch("data/conferences.json?t=" + Date.now())
      .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(catalog => {
        if (Array.isArray(catalog) && catalog.length > 0) {
          window.RESEARCH_DATA = window.RESEARCH_DATA || {};
          window.RESEARCH_DATA.DEFAULT_CONFERENCES = catalog;
          this.populateFilterDropdowns();
          this.renderActiveTab();
        }
      })
      .catch(err => {
        // Fallback already loaded in window.RESEARCH_DATA.DEFAULT_CONFERENCES
      });
  }

  setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.addEventListener("click", e => {
        const target = e.currentTarget.dataset.tab;
        this.switchTab(target);
      });
    });

    // Visualizer Subtabs
    document.querySelectorAll(".viz-subtab").forEach(tab => {
      tab.addEventListener("click", e => {
        const target = e.currentTarget.dataset.viz;
        this.switchVisualizerSubtab(target);
      });
    });

    // View Mode Toggle (Table vs Cards)
    document.querySelectorAll(".view-toggle-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        document.querySelectorAll(".view-toggle-btn").forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.viewMode = e.currentTarget.dataset.view;
        this.renderVenuesList();
      });
    });

    // Search Input
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", e => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderActiveTab();
      });
    }

    // Deadline Range Filter
    const deadlineFilter = document.getElementById("filter-deadline");
    if (deadlineFilter) {
      deadlineFilter.addEventListener("change", e => {
        this.filterDeadlineRange = e.target.value;
        this.renderActiveTab();
      });
    }

    // CORE Rank Filter
    const rankFilter = document.getElementById("filter-rank");
    if (rankFilter) {
      rankFilter.addEventListener("change", e => {
        this.filterRank = e.target.value;
        this.renderActiveTab();
      });
    }

    // Domain Filter
    const domainFilter = document.getElementById("filter-domain");
    if (domainFilter) {
      domainFilter.addEventListener("change", e => {
        this.filterDomain = e.target.value;
        this.renderActiveTab();
      });
    }

    // Venue Type Filter
    const typeFilter = document.getElementById("filter-type");
    if (typeFilter) {
      typeFilter.addEventListener("change", e => {
        this.filterType = e.target.value;
        this.renderActiveTab();
      });
    }

    // Global Sort Filter
    const sortFilter = document.getElementById("filter-sort");
    if (sortFilter) {
      sortFilter.addEventListener("change", e => {
        this.sortBy = e.target.value;
        this.workshopSortBy = e.target.value;
        this.renderActiveTab();
      });
    }

    // List Filter Dropdown
    const listFilter = document.getElementById("filter-list");
    if (listFilter) {
      listFilter.addEventListener("change", e => {
        this.selectedListId = e.target.value;
        this.renderActiveTab();
      });
    }
  }

  populateFilterDropdowns() {
    // Domain Filter Dropdown
    const domainSelect = document.getElementById("filter-domain");
    if (domainSelect) {
      let optionsHtml = `<option value="all">All Research Domains</option>`;
      Object.entries(window.RESEARCH_DATA.DOMAIN_DEFINITIONS).forEach(([key, def]) => {
        optionsHtml += `<option value="${key}">${def.name}</option>`;
      });
      domainSelect.innerHTML = optionsHtml;
    }

    // List Filter Dropdown
    this.refreshListDropdown();
  }

  refreshListDropdown() {
    const listSelect = document.getElementById("filter-list");
    if (listSelect) {
      const lists = window.storageManager.getLists();
      let html = `
        <option value="all">📁 List: All Tracked Venues</option>
        <option value="favorites">★ Favorites</option>
        <optgroup label="My WikiCFP Lists">
      `;
      lists.forEach(l => {
        html += `<option value="${l.id}">${l.name} (${l.items.length})</option>`;
      });
      html += `</optgroup>`;
      listSelect.innerHTML = html;
      listSelect.value = this.selectedListId;
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll(".nav-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.tab === tabId);
    });
    document.querySelectorAll(".tab-pane").forEach(pane => {
      pane.classList.toggle("active", pane.id === tabId);
    });
    this.renderActiveTab();
  }

  switchVisualizerSubtab(subtabId) {
    this.activeVisualizerSubtab = subtabId;
    document.querySelectorAll(".viz-subtab").forEach(t => {
      t.classList.toggle("active", t.dataset.viz === subtabId);
    });
    this.renderActiveVisualizer();
  }

  // Clickable Strategic Matrix Redirects
  filterByRankDirect(rank) {
    this.filterRank = rank;
    const rankSelect = document.getElementById("filter-rank");
    if (rankSelect) rankSelect.value = rank;
    this.switchTab("tab-venues");
  }

  filterByDomainDirect(domainKey) {
    this.filterDomain = domainKey;
    const domainSelect = document.getElementById("filter-domain");
    if (domainSelect) domainSelect.value = domainKey;
    this.switchTab("tab-venues");
  }

  // Clickable Stats Banner Dispatcher
  filterFromStat(statType) {
    if (statType === "all") {
      this.resetFilters();
      this.switchTab("tab-venues");
    } else if (statType === "upcoming") {
      this.resetFilters();
      this.filterDeadlineRange = "upcoming-60";
      const sel = document.getElementById("filter-deadline");
      if (sel) sel.value = "upcoming-60";
      this.renderActiveTab();
      this.switchTab("tab-venues");
    } else if (statType === "urgent") {
      this.resetFilters();
      this.filterDeadlineRange = "urgent";
      const sel = document.getElementById("filter-deadline");
      if (sel) sel.value = "urgent";
      this.renderActiveTab();
      this.switchTab("tab-venues");
    } else if (statType === "lists") {
      this.switchTab("tab-lists");
    }
  }

  getFilteredVenues() {
    let venues = window.storageManager.getAllVenues();

    // 1. Filter by List / Favorites
    if (this.selectedListId === "favorites") {
      const favs = window.storageManager.getFavorites();
      venues = venues.filter(v => favs.includes(v.id));
    } else if (this.selectedListId !== "all") {
      const lists = window.storageManager.getLists();
      const list = lists.find(l => l.id === this.selectedListId);
      if (list) {
        venues = venues.filter(v => list.items.includes(v.id));
      }
    }

    // 2. Filter by Type
    if (this.filterType !== "all") {
      venues = venues.filter(v => v.type === this.filterType);
    }

    // 3. Filter by CORE Rank
    if (this.filterRank !== "all") {
      venues = venues.filter(v => v.coreRank === this.filterRank);
    }

    // 4. Filter by Domain (Robust Alias & Tag Matching)
    if (this.filterDomain !== "all") {
      const targetDomain = this.filterDomain;
      const aliases = DOMAIN_ALIASES[targetDomain] || [targetDomain];
      venues = venues.filter(v => {
        if ((v.domains || []).includes(targetDomain)) return true;
        if ((v.domains || []).some(d => aliases.includes(d.toLowerCase()))) return true;
        if ((v.tags || []).some(t => {
          const tLower = t.toLowerCase();
          return aliases.some(a => tLower.includes(a) || a.includes(tLower));
        })) return true;
        const text = `${v.acronym} ${v.name} ${v.notes || ''}`.toLowerCase();
        if (aliases.some(a => a.length >= 3 && text.includes(a))) return true;
        return false;
      });
    }

    // 5. Filter by Deadline Range
    const now = new Date();
    if (this.filterDeadlineRange === "urgent") {
      venues = venues.filter(v => {
        if (!v.deadline) return false;
        const diff = new Date(v.deadline) - now;
        return diff > 0 && diff <= 14 * 24 * 60 * 60 * 1000;
      });
    } else if (this.filterDeadlineRange === "upcoming-30") {
      venues = venues.filter(v => {
        if (!v.deadline) return false;
        const diff = new Date(v.deadline) - now;
        return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
      });
    } else if (this.filterDeadlineRange === "upcoming-60") {
      venues = venues.filter(v => {
        if (!v.deadline) return false;
        const diff = new Date(v.deadline) - now;
        return diff > 0 && diff <= 60 * 24 * 60 * 60 * 1000;
      });
    } else if (this.filterDeadlineRange === "next-6m") {
      venues = venues.filter(v => {
        if (!v.deadline) return false;
        const diff = new Date(v.deadline) - now;
        return diff > 0 && diff <= 180 * 24 * 60 * 60 * 1000;
      });
    } else if (this.filterDeadlineRange === "past") {
      venues = venues.filter(v => {
        if (!v.deadline) return false;
        return new Date(v.deadline) <= now;
      });
    }

    // 6. Search Query
    if (this.searchQuery) {
      venues = venues.filter(v => {
        const haystack = `${v.acronym} ${v.name} ${(v.tags || []).join(' ')} ${v.location || ''} ${v.notes || ''}`.toLowerCase();
        return haystack.includes(this.searchQuery);
      });
    }

    // 7. Sorting
    venues.sort((a, b) => {
      if (this.sortBy === "deadline-asc") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      if (this.sortBy === "deadline-desc") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(b.deadline) - new Date(a.deadline);
      }
      if (this.sortBy === "rank-desc") {
        const order = { "A*": 7, "A": 6, "B*": 5, "B": 4, "C*": 3, "C": 2, "Workshop": 1 };
        return (order[b.coreRank] || 0) - (order[a.coreRank] || 0);
      }
      if (this.sortBy === "h5-desc") {
        const h5a = a.otherRanks && a.otherRanks.h5Index ? a.otherRanks.h5Index : 0;
        const h5b = b.otherRanks && b.otherRanks.h5Index ? b.otherRanks.h5Index : 0;
        return h5b - h5a;
      }
      if (this.sortBy === "name-asc") {
        return a.acronym.localeCompare(b.acronym);
      }
      return 0;
    });

    return venues;
  }

  renderActiveTab() {
    this.updateStatsBar();

    if (this.activeTab === "tab-venues") {
      this.renderVenuesList();
    } else if (this.activeTab === "tab-lists") {
      this.renderWikiCFPLists();
    } else if (this.activeTab === "tab-visualizer") {
      this.renderActiveVisualizer();
    } else if (this.activeTab === "tab-openreview") {
      this.renderOpenReviewWorkshops();
    } else if (this.activeTab === "tab-roadmap") {
      this.renderRoadmap();
    }
  }

  updateStatsBar() {
    const all = window.storageManager.getAllVenues();
    const now = new Date();
    const upcoming = all.filter(v => v.deadline && new Date(v.deadline) > now);
    const urgent = all.filter(v => {
      if (!v.deadline) return false;
      const d = new Date(v.deadline) - now;
      return d > 0 && d <= 14 * 24 * 60 * 60 * 1000;
    });
    const lists = window.storageManager.getLists();

    const statTotal = document.getElementById("stat-total-venues");
    if (statTotal) statTotal.textContent = all.length;

    const statUpcoming = document.getElementById("stat-upcoming-deadlines");
    if (statUpcoming) statUpcoming.textContent = upcoming.length;

    const statUrgent = document.getElementById("stat-urgent-deadlines");
    if (statUrgent) statUrgent.textContent = urgent.length;

    const statLists = document.getElementById("stat-custom-lists");
    if (statLists) statLists.textContent = lists.length;
  }

  renderVenuesList() {
    const container = document.getElementById("venues-container");
    if (!container) return;

    const venues = this.getFilteredVenues();

    if (venues.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No conferences or workshops match your filters</h3>
          <p>Try clearing some filters or adding a custom conference.</p>
          <button class="btn btn-secondary mt-2" onclick="window.app.resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    if (this.viewMode === "cards") {
      window.visualizer.renderCountdownCards("venues-container", venues);
      return;
    }

    // Render Modern Table View
    const rowsHtml = venues.map(venue => {
      const diffMs = window.visualizer.getDeadlineDiff(venue.deadline);
      const countdown = window.visualizer.formatCountdown(diffMs);
      const isFav = window.storageManager.isFavorite(venue.id);
      const deadlineDate = venue.deadline ? new Date(venue.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
      const notifDate = venue.notification ? new Date(venue.notification).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBA';

      const domainBadgesHtml = (venue.domains || []).map(d => {
        const def = window.RESEARCH_DATA.DOMAIN_DEFINITIONS[d];
        if (!def) return "";
        return `<span class="tag-pill" style="border-color:${def.color}33; color:${def.color};">${def.name}</span>`;
      }).join("");

      return `
        <tr class="venue-row venue-row-${venue.type}" onclick="window.app.openVenueModal('${venue.id}')">
          <td class="col-fav" onclick="event.stopPropagation();">
            <button class="btn-icon-fav ${isFav ? 'active' : ''}" onclick="window.app.toggleFavorite('${venue.id}', this)" title="${isFav ? 'Remove Favorite' : 'Favorite'}">
              ★
            </button>
          </td>
          <td class="col-rank">
            <span class="rank-pill rank-${venue.coreRank.replace('*', '-star').toLowerCase()}">${venue.coreRank}</span>
          </td>
          <td class="col-venue">
            <div class="venue-acronym-line">
              <strong>${venue.acronym}</strong>
            </div>
            <div class="venue-full-title">${venue.name}</div>
            <div class="venue-domains-line">${domainBadgesHtml}</div>
          </td>
          <td class="col-deadline">
            <div class="deadline-date-text highlight">${deadlineDate}</div>
            <div class="countdown-badge status-${countdown.status}">
              ${countdown.text}
            </div>
          </td>
          <td class="col-milestones">
            <div class="milestone-snippet">🔔 Notif: <strong>${notifDate}</strong></div>
            <div class="milestone-snippet">📍 ${venue.location}</div>
          </td>
          <td class="col-h5">
            <span class="metric-chip">${venue.otherRanks ? venue.otherRanks.h5Index || '-' : '-'}</span>
          </td>
          <td class="col-actions" onclick="event.stopPropagation();">
            <button class="btn btn-secondary btn-xs" onclick="window.app.openAssignListModal('${venue.id}')" title="Add to WikiCFP List">
              + List
            </button>
            <a href="${venue.portalUrl || venue.website}" target="_blank" rel="noopener" class="btn btn-outline btn-xs" title="Open Submission Portal">
              Portal &nearr;
            </a>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="table-responsive">
        <table class="venues-table">
          <thead>
            <tr>
              <th style="width: 36px;">★</th>
              <th style="width: 85px;">Rank</th>
              <th>Conference & Domains</th>
              <th style="width: 210px;">Paper Deadline (AoE UTC-12)</th>
              <th style="width: 170px;">Milestones</th>
              <th style="width: 65px;">h5</th>
              <th style="width: 120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Visualizer Render Dispatcher ---
  renderActiveVisualizer() {
    const venues = this.getFilteredVenues();
    const containerId = "visualizer-content";
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.activeVisualizerSubtab === "yearly") {
      window.visualizer.renderYearlyCalendarGrid(containerId, venues);
    } else if (this.activeVisualizerSubtab === "calendar") {
      window.visualizer.renderCalendar(containerId, venues);
    } else if (this.activeVisualizerSubtab === "gantt") {
      window.visualizer.renderGanttChart(containerId, venues);
    } else if (this.activeVisualizerSubtab === "cards") {
      window.visualizer.renderCountdownCards(containerId, venues);
    } else if (this.activeVisualizerSubtab === "matrix") {
      window.visualizer.renderMatrix(containerId, venues);
    }
  }

  // --- WikiCFP Lists Tab ---
  renderWikiCFPLists() {
    const container = document.getElementById("lists-container");
    if (!container) return;

    const lists = window.storageManager.getLists();

    const listsCardsHtml = lists.map(list => {
      const allVenues = window.storageManager.getAllVenues();
      const listVenues = allVenues.filter(v => list.items.includes(v.id));

      const itemsHtml = listVenues.map(v => {
        const diffMs = window.visualizer.getDeadlineDiff(v.deadline);
        const countdown = window.visualizer.formatCountdown(diffMs);
        return `
          <div class="list-venue-item">
            <span class="rank-pill rank-${v.coreRank.replace('*', '-star').toLowerCase()}">${v.coreRank}</span>
            <div class="list-item-title-wrap">
              <strong>${v.acronym}</strong>
              <small>${v.deadline ? new Date(v.deadline).toLocaleDateString() : 'TBA'}</small>
            </div>
            <span class="countdown-badge status-${countdown.status}">${countdown.text}</span>
            <button class="btn-icon-danger" onclick="window.app.removeFromList('${list.id}', '${v.id}')" title="Remove from this list">&times;</button>
          </div>
        `;
      }).join("");

      return `
        <div class="wikicfp-list-card">
          <div class="list-card-header">
            <div>
              <h4 class="list-title">${list.name}</h4>
              <p class="list-desc">${list.description || 'No description provided.'}</p>
            </div>
            <div class="list-header-actions">
              <button class="btn btn-secondary btn-xs" onclick="window.app.exportListICS('${list.id}')" title="Export this list to Calendar (.ics)">
                📅 .ics
              </button>
              <button class="btn btn-outline-danger btn-xs" onclick="window.app.deleteWikiCFPList('${list.id}')" title="Delete list">
                Delete
              </button>
            </div>
          </div>
          <div class="list-items-container">
            ${itemsHtml.length > 0 ? itemsHtml : '<div class="empty-list-notice">No venues in this list yet. Browse tracked venues to add items.</div>'}
          </div>
          <div class="list-card-footer">
            <span>${list.items.length} Tracked Venues</span>
            <button class="btn btn-primary btn-xs" onclick="window.app.filterByListDirect('${list.id}')">
              Filter Dashboard &rarr;
            </button>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="lists-top-toolbar">
        <div>
          <h3>📚 My WikiCFP Tracked Lists</h3>
          <p style="color:var(--text-muted); font-size:0.82rem;">Organize target venues into customized submission cohorts and track them offline.</p>
        </div>
        <div class="toolbar-actions" style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="window.app.exportCache()" title="Export all lists & cached venues">
            📥 Export Cache
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.app.triggerImportCache()" title="Import cache from JSON file">
            📤 Import Cache
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.app.openCreateListModal()">
            + Create New List
          </button>
        </div>
      </div>
      <div class="lists-cards-grid">
        ${listsCardsHtml}
      </div>
    `;
  }

  // --- OpenReview Workshops Tab (Cleaned, Clickable Title, Fixed Sort & Search) ---
  renderOpenReviewWorkshops() {
    const container = document.getElementById("openreview-container");
    if (!container) return;

    const allVenues = window.storageManager.getAllVenues();
    let workshops = allVenues.filter(v => v.type === "workshop" || (v.portal && v.portal.includes("OpenReview")));

    // Apply Search Query if typed
    if (this.searchQuery) {
      workshops = workshops.filter(w => {
        const haystack = `${w.acronym} ${w.name} ${(w.tags || []).join(' ')} ${w.location || ''} ${w.notes || ''}`.toLowerCase();
        return haystack.includes(this.searchQuery);
      });
    }

    // Apply Workshop Sorting
    workshops.sort((a, b) => {
      if (this.workshopSortBy === "deadline-asc") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      if (this.workshopSortBy === "deadline-desc") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(b.deadline) - new Date(a.deadline);
      }
      if (this.workshopSortBy === "name-asc") {
        return a.acronym.localeCompare(b.acronym);
      }
      return 0;
    });

    const workshopsHtml = workshops.map(w => {
      const diffMs = window.visualizer.getDeadlineDiff(w.deadline);
      const countdown = window.visualizer.formatCountdown(diffMs);
      const domainBadgesHtml = (w.domains || []).map(d => {
        const def = window.RESEARCH_DATA.DOMAIN_DEFINITIONS[d];
        if (!def) return "";
        return `<span class="tag-pill" style="border-color:${def.color}33; color:${def.color};">${def.name}</span>`;
      }).join("");

      const targetUrl = w.portalUrl || w.website;

      return `
        <div class="openreview-workshop-card">
          <div class="workshop-header">
            <span class="portal-badge openreview-badge">OpenReview Declared</span>
            <span class="type-indicator-badge">${w.edition || '2026/2027'}</span>
          </div>

          <!-- Clickable Workshop Name (Replaces separate portal button) -->
          <h4 class="workshop-title">
            <a href="${targetUrl}" target="_blank" rel="noopener" class="clickable-workshop-link" title="Open Workshop Portal: ${targetUrl}">
              ${w.acronym}: ${w.name} &nearr;
            </a>
          </h4>

          <div class="workshop-domains" style="margin-bottom: 10px;">${domainBadgesHtml}</div>

          <div class="workshop-meta-grid">
            <div style="display:flex; justify-content:space-between;">
              <span class="meta-label" style="color:var(--text-muted);">Paper Deadline:</span>
              <strong style="color:var(--text-primary);">${w.deadline ? new Date(w.deadline).toLocaleDateString() : 'TBA'}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="meta-label" style="color:var(--text-muted);">Countdown (AoE UTC-12):</span>
              <span class="countdown-badge status-${countdown.status}">${countdown.text}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span class="meta-label" style="color:var(--text-muted);">Location:</span>
              <span>${w.location}</span>
            </div>
          </div>

          <div class="workshop-card-actions">
            <button class="btn btn-secondary btn-xs" onclick="window.app.openAssignListModal('${w.id}')" title="Add to WikiCFP List">
              + Add to List
            </button>
            <button class="btn btn-outline btn-xs" onclick="window.app.openVenueModal('${w.id}')" title="View Milestones">
              Details
            </button>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="openreview-intro-card">
        <div>
          <h3 style="font-family:var(--font-display); font-size:1.15rem; margin-bottom:2px;">🌐 Declared OpenReview Workshops</h3>
          <p style="color:var(--text-muted); font-size:0.8rem;">Click workshop titles directly to visit their OpenReview submission portal.</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <!-- Dedicated Working Sort for Workshops -->
          <select id="workshop-sort-select" class="select-control" onchange="window.app.changeWorkshopSort(this.value)">
            <option value="deadline-asc" ${this.workshopSortBy === 'deadline-asc' ? 'selected' : ''}>Deadline (Earliest First)</option>
            <option value="deadline-desc" ${this.workshopSortBy === 'deadline-desc' ? 'selected' : ''}>Deadline (Latest First)</option>
            <option value="name-asc" ${this.workshopSortBy === 'name-asc' ? 'selected' : ''}>Workshop Name (A-Z)</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="window.app.openAddVenueModal('workshop')">
            + Declare / Add Workshop
          </button>
        </div>
      </div>
      <div class="openreview-grid">
        ${workshopsHtml}
      </div>
    `;
  }

  changeWorkshopSort(sortVal) {
    this.workshopSortBy = sortVal;
    this.renderOpenReviewWorkshops();
  }

  // --- PhD Strategy & Ranking Roadmap Tab ---
  renderRoadmap() {
    const container = document.getElementById("roadmap-container");
    if (!container) return;

    container.innerHTML = `
      <div class="roadmap-dashboard">
        <div class="roadmap-section">
          <h3>🎓 PhD Publication Strategy: Target Venues by Specialization</h3>
          <p style="color:var(--text-muted); font-size:0.82rem;">Calibrated submission roadmap based on CORE 2026 tiers and typical review cycles.</p>

          <div class="strategy-cards-grid">
            <div class="strategy-card">
              <div class="strat-header" style="border-left: 3px solid #059669; padding-left: 8px;">
                <h4 style="font-size:0.92rem;">Causal Understanding & ML</h4>
                <span class="strat-tier">CORE A* & A</span>
              </div>
              <ul class="strat-list" style="list-style:none; padding: 6px 0; font-size:0.78rem;">
                <li><strong>CLeaR (April):</strong> Flagship specialized venue for causal discovery & causal ML.</li>
                <li><strong>NeurIPS / ICML:</strong> Premier venues for invariant risk minimization and out-of-distribution causal transfer.</li>
                <li><strong>UAI (Feb):</strong> Structural causal models (SCMs), causal DAGs, and counterfactual inference.</li>
                <li><strong>CI-NLP Workshop @ EMNLP:</strong> Rapid turnaround for causal probing and mitigating shortcuts in LLMs.</li>
              </ul>
            </div>

            <div class="strategy-card">
              <div class="strat-header" style="border-left: 3px solid #d97706; padding-left: 8px;">
                <h4 style="font-size:0.92rem;">Multimodal Benchmarks</h4>
                <span class="strat-tier">CORE A*</span>
              </div>
              <ul class="strat-list" style="list-style:none; padding: 6px 0; font-size:0.78rem;">
                <li><strong>CVPR / ICCV:</strong> Top venues for multimodal benchmarks, vision-language evaluation, and VQA.</li>
                <li><strong>NeurIPS Datasets & Benchmarks Track:</strong> Dedicated flagship track for comprehensive multimodal benchmark suites.</li>
                <li><strong>ACM MM (April):</strong> Multimodal QA, cross-modal retrieval, and generative multimodal benchmarks.</li>
                <li><strong>MRL Workshop @ EMNLP:</strong> High visibility for emerging multimodal benchmark suites and probes.</li>
              </ul>
            </div>

            <div class="strategy-card">
              <div class="strat-header" style="border-left: 3px solid #0891b2; padding-left: 8px;">
                <h4 style="font-size:0.92rem;">Multilingual Learning</h4>
                <span class="strat-tier">CORE A* & A</span>
              </div>
              <ul class="strat-list" style="list-style:none; padding: 6px 0; font-size:0.78rem;">
                <li><strong>ACL / EMNLP (ARR):</strong> Premier outlets for cross-lingual transfer, zero-shot generalization, and multilingual LLMs.</li>
                <li><strong>COLING / EACL:</strong> Outstanding international venues for cross-lingual datasets and diverse language families.</li>
                <li><strong>AmericasNLP / AfricaNLP:</strong> Focused shared tasks and high impact for low-resource language transfer.</li>
              </ul>
            </div>

            <div class="strategy-card">
              <div class="strat-header" style="border-left: 3px solid #7c3aed; padding-left: 8px;">
                <h4 style="font-size:0.92rem;">Discourse & Implicature</h4>
                <span class="strat-tier">CORE A* & A / B</span>
              </div>
              <ul class="strat-list" style="list-style:none; padding: 6px 0; font-size:0.78rem;">
                <li><strong>NAACL / ACL:</strong> Top conferences with dedicated tracks for Discourse & Pragmatics and Semantics.</li>
                <li><strong>*SEM (Feb):</strong> Exceptional semantic rigor for scalar implicature, presupposition, and formal pragmatic modeling.</li>
                <li><strong>SemEval (Shared Tasks):</strong> Gold-standard evaluation tasks for pragmatic inference, stance, and implicature classification.</li>
                <li><strong>CogSci (Feb):</strong> Ideal for computational modeling of human vs LLM pragmatic reasoning benchmarks.</li>
                <li><strong>DisRPT Workshop:</strong> The primary international venue for discourse parsing (RST / PDTB).</li>
              </ul>
            </div>

            <div class="strategy-card">
              <div class="strat-header" style="border-left: 3px solid #2563eb; padding-left: 8px;">
                <h4 style="font-size:0.92rem;">QA & Information Retrieval</h4>
                <span class="strat-tier">CORE A* & A</span>
              </div>
              <ul class="strat-list" style="list-style:none; padding: 6px 0; font-size:0.78rem;">
                <li><strong>SIGIR / KDD:</strong> Flagship for complex question answering, inquisitive search, dense retrieval, and knowledge mining.</li>
                <li><strong>TheWebConf (WWW):</strong> Web-scale QA, factual question generation, and knowledge-grounded QA.</li>
                <li><strong>WSDM / ECIR / PAKDD:</strong> Premier conferences for conversational question answering and query generation.</li>
                <li><strong>QG Workshop @ INLG:</strong> Dedicated venue for Question Generation, Questions under Discussion (QUD), and clarifying queries.</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="roadmap-section mt-4">
          <h3>⚡ Understanding the ACL Rolling Review (ARR) Engine</h3>
          <div class="arr-explainer-box">
            <p style="font-size:0.85rem; color:var(--text-secondary);">Major computational linguistics conferences (<strong>ACL, EMNLP, NAACL, EACL</strong>) utilize <strong>ACL Rolling Review (ARR)</strong> on OpenReview. Rather than submitting directly to each conference, you submit to ARR's bi-monthly cycles (February, April, June, August, October, December). Once reviews and revisions are complete, you commit your reviewed paper by the conference's commitment deadline.</p>
            <div class="arr-milestones-row">
              <div class="arr-step">
                <span class="step-num">1</span>
                <strong>ARR Submission</strong>
                <span>Submit to bi-monthly ARR cycle</span>
              </div>
              <div class="arr-arrow">&rarr;</div>
              <div class="arr-step">
                <span class="step-num">2</span>
                <strong>Reviews & Rebuttal</strong>
                <span>AE assignment + author response</span>
              </div>
              <div class="arr-arrow">&rarr;</div>
              <div class="arr-step">
                <span class="step-num">3</span>
                <strong>Final Meta-Review</strong>
                <span>Scores & meta-review finalized</span>
              </div>
              <div class="arr-arrow">&rarr;</div>
              <div class="arr-step">
                <span class="step-num">4</span>
                <strong>Commitment</strong>
                <span>Commit paper to target venue</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Real-time Countdown Loop ---
  startCountdownLoop() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      document.querySelectorAll(".countdown-digits").forEach(el => {
        const deadlineStr = el.dataset.deadline;
        if (deadlineStr) {
          const diffMs = window.visualizer.getDeadlineDiff(deadlineStr);
          const c = window.visualizer.formatCountdown(diffMs);
          el.textContent = c.text;
        }
      });
    }, 10000);
  }

  // --- Favorites & List Management ---
  toggleFavorite(id, btnElement) {
    const isNowFav = window.storageManager.toggleFavorite(id);
    if (btnElement) {
      btnElement.classList.toggle("active", isNowFav);
      btnElement.title = isNowFav ? "Remove Favorite" : "Favorite";
    }
    this.updateStatsBar();
    if (this.selectedListId === "favorites") {
      this.renderActiveTab();
    }
  }

  filterByListDirect(listId) {
    this.selectedListId = listId;
    const select = document.getElementById("filter-list");
    if (select) select.value = listId;
    this.switchTab("tab-venues");
  }

  resetFilters() {
    this.searchQuery = "";
    this.filterDeadlineRange = "all";
    this.filterRank = "all";
    this.filterDomain = "all";
    this.filterType = "all";
    this.selectedListId = "all";
    this.sortBy = "deadline-asc";
    this.workshopSortBy = "deadline-asc";

    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";
    const filterDeadline = document.getElementById("filter-deadline");
    if (filterDeadline) filterDeadline.value = "all";
    const filterRank = document.getElementById("filter-rank");
    if (filterRank) filterRank.value = "all";
    const filterDomain = document.getElementById("filter-domain");
    if (filterDomain) filterDomain.value = "all";
    const filterType = document.getElementById("filter-type");
    if (filterType) filterType.value = "all";
    const filterSort = document.getElementById("filter-sort");
    if (filterSort) filterSort.value = "deadline-asc";
    const filterList = document.getElementById("filter-list");
    if (filterList) filterList.value = "all";

    this.renderActiveTab();
  }

  // --- Modals ---
  openVenueModal(venueId) {
    const venue = window.storageManager.getVenueById(venueId);
    if (!venue) return;

    const modal = document.getElementById("venue-detail-modal");
    if (!modal) return;

    const diffMs = window.visualizer.getDeadlineDiff(venue.deadline);
    const countdown = window.visualizer.formatCountdown(diffMs);

    const domainBadgesHtml = (venue.domains || []).map(d => {
      const def = window.RESEARCH_DATA.DOMAIN_DEFINITIONS[d];
      if (!def) return "";
      return `<span class="tag-pill" style="border-color:${def.color}33; color:${def.color}; font-size: 0.8rem;">${def.name}</span>`;
    }).join("");

    const tagsHtml = (venue.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join(" ");

    const titleEl = document.getElementById("modal-venue-title");
    if (venue.website) {
      titleEl.innerHTML = `<a href="${venue.website}" target="_blank" rel="noopener" class="modal-venue-title-link" title="Open official conference website (${venue.website})" style="color:var(--text-primary); text-decoration:none; display:inline-flex; align-items:center; gap:8px;">${venue.acronym}: ${venue.name} <span style="color:var(--primary-color); font-size:0.9rem;" title="External official website link">🔗</span></a>`;
    } else {
      titleEl.textContent = `${venue.acronym}: ${venue.name}`;
    }
    document.getElementById("modal-venue-rank").innerHTML = `<span class="rank-pill rank-${venue.coreRank.replace('*', '-star').toLowerCase()}">${venue.coreRank}</span>`;
    
    document.getElementById("modal-venue-countdown").innerHTML = `
      <div class="countdown-badge status-${countdown.status}" style="font-size: 0.95rem; padding: 4px 12px;">
        ${countdown.text}
      </div>
    `;

    document.getElementById("modal-venue-body").innerHTML = `
      <div class="modal-section">
        <h5>🎯 Focus Areas & Tags</h5>
        <div class="mb-2">${domainBadgesHtml}</div>
        <div>${tagsHtml}</div>
      </div>

      <div class="modal-section">
        <h5>📅 Submission Schedule & Milestones (AoE UTC-12)</h5>
        <div class="schedule-grid">
          <div class="schedule-item">
            <span class="s-label">1. Abstract Registration:</span>
            <span class="s-val">${venue.abstractDeadline ? window.visualizer.formatDateDDMMYY(venue.abstractDeadline) : 'Not applicable / Same as paper'}</span>
          </div>
          <div class="schedule-item">
            <span class="s-label">2. Full Paper Deadline:</span>
            <span class="s-val highlight">${venue.deadline ? window.visualizer.formatDateDDMMYY(venue.deadline) : 'TBA'}</span>
          </div>
          <div class="schedule-item">
            <span class="s-label">3. Reviews Released / Rebuttal:</span>
            <span class="s-val">${venue.reviewsReleased ? window.visualizer.formatDateDDMMYY(venue.reviewsReleased) : 'TBA'}</span>
          </div>
          <div class="schedule-item">
            <span class="s-label">4. Final Acceptance Notification:</span>
            <span class="s-val">${venue.notification ? window.visualizer.formatDateDDMMYY(venue.notification) : 'TBA'}</span>
          </div>
          <div class="schedule-item">
            <span class="s-label">5. Camera-Ready Deadline:</span>
            <span class="s-val">${venue.cameraReady ? window.visualizer.formatDateDDMMYY(venue.cameraReady) : 'TBA'}</span>
          </div>
          <div class="schedule-item">
            <span class="s-label">6. Conference Dates & Location:</span>
            <span class="s-val">${window.visualizer.formatDateDDMMYY(venue.conferenceDates)} (${venue.location})</span>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h5>📊 Ranking & Bibliometric Metrics</h5>
        <div class="metrics-row">
          <div class="metric-box">
            <span class="mb-title">CORE 2026 Rank</span>
            <span class="mb-val">${venue.coreRank}</span>
          </div>
          <div class="metric-box">
            <span class="mb-title">Google Scholar h5</span>
            <span class="mb-val">${venue.otherRanks ? venue.otherRanks.h5Index || '-' : '-'}</span>
          </div>
          <div class="metric-box">
            <span class="mb-title">Acceptance Rate</span>
            <span class="mb-val">${venue.otherRanks ? venue.otherRanks.acceptanceRate || '-' : '-'}</span>
          </div>
          <div class="metric-box">
            <span class="mb-title">CCF Class</span>
            <span class="mb-val">${venue.otherRanks ? venue.otherRanks.ccf || '-' : '-'}</span>
          </div>
        </div>
      </div>

      ${venue.notes ? `
        <div class="modal-section">
          <h5>💡 Notes & Submission Insights</h5>
          <p style="font-size:0.82rem; color:var(--text-secondary);">${venue.notes}</p>
        </div>
      ` : ''}

      <div class="modal-actions-bar">
        <a href="${venue.portalUrl || venue.website}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
          Open Official Portal / OpenReview &nearr;
        </a>
        <button class="btn btn-secondary btn-sm" onclick="window.app.exportSingleVenueICS('${venue.id}')">
          📅 Export .ics
        </button>
        ${venue.isCustom ? `
          <button class="btn btn-outline-danger btn-sm" onclick="window.app.deleteCustomVenue('${venue.id}')">
            Delete Custom CFP
          </button>
        ` : ''}
      </div>
    `;

    modal.classList.add("active");
  }

  closeVenueModal() {
    const modal = document.getElementById("venue-detail-modal");
    if (modal) modal.classList.remove("active");
  }

  openAssignListModal(venueId) {
    const venue = window.storageManager.getVenueById(venueId);
    if (!venue) return;

    const modal = document.getElementById("assign-list-modal");
    if (!modal) return;

    const lists = window.storageManager.getLists();
    const containingLists = window.storageManager.getListsContaining(venueId).map(l => l.id);

    const checkboxesHtml = lists.map(list => {
      const isChecked = containingLists.includes(list.id);
      return `
        <label class="checkbox-item" style="display:flex; align-items:center; gap:8px; font-size:0.85rem; padding: 4px 0;">
          <input type="checkbox" value="${list.id}" ${isChecked ? 'checked' : ''} onchange="window.app.toggleListAssignment('${list.id}', '${venueId}', this.checked)">
          <span>${list.name}</span>
        </label>
      `;
    }).join("");

    document.getElementById("assign-venue-name").textContent = venue.acronym;
    document.getElementById("assign-lists-container").innerHTML = checkboxesHtml || '<p>No lists created yet.</p>';

    modal.classList.add("active");
  }

  closeAssignListModal() {
    const modal = document.getElementById("assign-list-modal");
    if (modal) modal.classList.remove("active");
  }

  toggleListAssignment(listId, venueId, shouldAdd) {
    if (shouldAdd) {
      window.storageManager.addToList(listId, venueId);
    } else {
      window.storageManager.removeFromList(listId, venueId);
    }
    this.refreshListDropdown();
    this.updateStatsBar();
  }

  removeFromList(listId, venueId) {
    window.storageManager.removeFromList(listId, venueId);
    this.refreshListDropdown();
    this.renderWikiCFPLists();
  }

  openCreateListModal() {
    const modal = document.getElementById("create-list-modal");
    if (modal) {
      document.getElementById("new-list-name").value = "";
      document.getElementById("new-list-desc").value = "";
      modal.classList.add("active");
    }
  }

  closeCreateListModal() {
    const modal = document.getElementById("create-list-modal");
    if (modal) modal.classList.remove("active");
  }

  submitCreateList() {
    const nameInput = document.getElementById("new-list-name");
    const descInput = document.getElementById("new-list-desc");
    if (!nameInput || !nameInput.value.trim()) {
      alert("Please provide a list name.");
      return;
    }
    window.storageManager.createList(nameInput.value, descInput.value);
    this.closeCreateListModal();
    this.refreshListDropdown();
    this.renderWikiCFPLists();
  }

  deleteWikiCFPList(listId) {
    if (confirm("Are you sure you want to delete this custom WikiCFP list?")) {
      window.storageManager.deleteList(listId);
      this.refreshListDropdown();
      this.renderWikiCFPLists();
    }
  }

  // Add Custom CFP / Workshop Modal with Smart URL Extraction
  openAddVenueModal(defaultType = "workshop") {
    const modal = document.getElementById("add-venue-modal");
    if (modal) {
      document.getElementById("new-venue-type").value = defaultType;
      const autofillInput = document.getElementById("autofill-url-input");
      if (autofillInput) autofillInput.value = "";
      const statusEl = document.getElementById("autofill-status");
      if (statusEl) statusEl.innerHTML = "";
      modal.classList.add("active");
    }
  }

  closeAddVenueModal() {
    const modal = document.getElementById("add-venue-modal");
    if (modal) modal.classList.remove("active");
  }

  // URL Extraction / Autofill logic
  async autofillFromURL() {
    const urlInput = document.getElementById("autofill-url-input");
    const statusEl = document.getElementById("autofill-status");
    if (!urlInput || !urlInput.value.trim()) {
      alert("Please enter a CFP or OpenReview URL first.");
      return;
    }

    const rawUrl = urlInput.value.trim();
    statusEl.innerHTML = `<span style="color:var(--accent-indigo);">🔍 Reading and parsing URL structure...</span>`;

    try {
      const urlObj = new URL(rawUrl);
      const host = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname;
      const searchParams = urlObj.searchParams;

      let extractedAcronym = "";
      let extractedName = "";
      let extractedType = "workshop";
      let extractedPortal = "OpenReview";
      let matchedDomains = new Set();

      // Check if OpenReview
      if (host.includes("openreview.net")) {
        extractedPortal = "OpenReview";
        const groupId = searchParams.get("id") || pathname.replace(/^\//, '');
        const parts = groupId.split("/");
        
        extractedAcronym = parts[parts.length - 1] || "Workshop";
        extractedName = parts.join(" ");

        if (groupId.toLowerCase().includes("workshop")) {
          extractedType = "workshop";
        } else if (groupId.toLowerCase().includes("conference")) {
          extractedType = "conference";
        }
      } else {
        // Generic CFP website (e.g. semeval.github.io, kdd.org, coling2027.org)
        const pathSegments = pathname.split("/").filter(Boolean);
        const hostSegments = host.split(".");
        
        extractedPortal = host.includes("github.io") ? "GitHub Pages / Softconf" : "Conference Portal";
        extractedAcronym = (pathSegments[0] || hostSegments[0] || "Venue").toUpperCase();
        extractedName = `${extractedAcronym} 2027`;

        if (rawUrl.toLowerCase().includes("workshop") || rawUrl.toLowerCase().includes("semeval")) {
          extractedType = "workshop";
        } else {
          extractedType = "conference";
        }
      }

      // Keyword domain matching from URL string
      const urlLower = rawUrl.toLowerCase();
      if (urlLower.includes("causal") || urlLower.includes("causality")) matchedDomains.add("causality");
      if (urlLower.includes("multimodal") || urlLower.includes("mrl") || urlLower.includes("vision")) matchedDomains.add("multimodal");
      if (urlLower.includes("multilingual") || urlLower.includes("crosslingual") || urlLower.includes("americas")) matchedDomains.add("multilingual");
      if (urlLower.includes("discourse") || urlLower.includes("disrpt") || urlLower.includes("pragmatics")) matchedDomains.add("discourse");
      if (urlLower.includes("implicature") || urlLower.includes("semeval") || urlLower.includes("semantics")) matchedDomains.add("implicature");
      if (urlLower.includes("question") || urlLower.includes("qa") || urlLower.includes("qg")) matchedDomains.add("qa-qg");
      if (urlLower.includes("ir") || urlLower.includes("search") || urlLower.includes("kdd") || urlLower.includes("web")) matchedDomains.add("ir-search");
      if (urlLower.includes("transfer") || urlLower.includes("repl4nlp") || urlLower.includes("adaptation")) matchedDomains.add("transfer-learning");

      // Auto-populate form fields
      document.getElementById("new-venue-acronym").value = extractedAcronym;
      document.getElementById("new-venue-name").value = extractedName;
      document.getElementById("new-venue-type").value = extractedType;
      document.getElementById("new-venue-website").value = rawUrl;
      document.getElementById("new-venue-portal").value = extractedPortal;

      // Check matched domain checkboxes
      document.querySelectorAll("#new-venue-domains input").forEach(cb => {
        cb.checked = matchedDomains.has(cb.value);
      });

      statusEl.innerHTML = `<span style="color:#059669; font-weight:600;">✓ Information autofilled! Please review and confirm the deadline and dates below.</span>`;
    } catch (err) {
      statusEl.innerHTML = `<span style="color:#e11d48;">Could not parse URL. You can still fill in the details manually.</span>`;
    }
  }

  submitAddVenue() {
    const acronym = document.getElementById("new-venue-acronym").value.trim();
    const name = document.getElementById("new-venue-name").value.trim();
    const type = document.getElementById("new-venue-type").value;
    const rank = document.getElementById("new-venue-rank").value;
    const deadline = document.getElementById("new-venue-deadline").value;
    const notif = document.getElementById("new-venue-notif").value;
    const location = document.getElementById("new-venue-location").value.trim() || "TBA";
    const website = document.getElementById("new-venue-website").value.trim() || "#";
    const portal = document.getElementById("new-venue-portal").value.trim() || "OpenReview";
    const notes = document.getElementById("new-venue-notes").value.trim();

    // Collect selected domains
    const domainCheckboxes = document.querySelectorAll("#new-venue-domains input:checked");
    const domains = Array.from(domainCheckboxes).map(cb => cb.value);

    if (!acronym || !name) {
      alert("Please enter at least the Conference Acronym and Name.");
      return;
    }

    const newVenue = {
      acronym,
      name,
      type,
      edition: "2026/2027",
      coreRank: rank,
      otherRanks: { h5Index: 40, acceptanceRate: "25%" },
      domains: domains.length > 0 ? domains : ["general-ai-ml"],
      tags: [acronym, type],
      deadline: deadline ? `${deadline}T23:59:59-12:00` : null,
      notification: notif ? `${notif}T23:59:59-12:00` : null,
      conferenceDates: "2027",
      location,
      timezone: "AoE UTC-12",
      portal,
      portalUrl: website,
      website,
      notes: notes || "User-added custom CFP"
    };

    window.storageManager.addCustomVenue(newVenue);
    this.closeAddVenueModal();
    this.renderActiveTab();
    alert(`✅ ${acronym} successfully added to your tracker!`);
  }

  deleteCustomVenue(venueId) {
    if (confirm("Delete this custom conference from your browser cache?")) {
      window.storageManager.deleteCustomVenue(venueId);
      this.closeVenueModal();
      this.renderActiveTab();
    }
  }

  // --- iCalendar (.ics) Generation ---
  exportListICS(listId) {
    const lists = window.storageManager.getLists();
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const allVenues = window.storageManager.getAllVenues();
    const targetVenues = allVenues.filter(v => list.items.includes(v.id));

    this.downloadICS(targetVenues, `${list.name.replace(/[^a-zA-Z0-9]/g, '_')}_deadlines.ics`);
  }

  exportSingleVenueICS(venueId) {
    const venue = window.storageManager.getVenueById(venueId);
    if (!venue) return;
    this.downloadICS([venue], `${venue.acronym}_deadline.ics`);
  }

  exportAllFilteredICS() {
    const venues = this.getFilteredVenues();
    this.downloadICS(venues, "research_conference_deadlines.ics");
  }

  downloadICS(venues, filename = "deadlines.ics") {
    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PhD Research Conference Tracker//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    venues.forEach(v => {
      if (!v.deadline) return;

      const d = new Date(v.deadline);
      const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dtstart = d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      // 1 hour event
      const dEnd = new Date(d.getTime() + 60 * 60 * 1000);
      const dtend = dEnd.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:deadline-${v.id}-${Date.now()}@tracker.phd`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:🔥 [${v.coreRank}] ${v.acronym} Paper Submission Deadline`,
        `DESCRIPTION:${v.name}\\nWebsite: ${v.website}\\nPortal: ${v.portalUrl || v.portal}\\nLocation: ${v.location}\\nTimezone: ${v.timezone}`,
        `LOCATION:${v.location}`,
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "TRIGGER:-P7D",
        "DESCRIPTION:1 Week Deadline Reminder",
        "ACTION:DISPLAY",
        "END:VALARM",
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "DESCRIPTION:1 Day Final Submission Alert (AoE UTC-12)",
        "ACTION:DISPLAY",
        "END:VALARM",
        "END:VEVENT"
      );
    });

    icsContent.push("END:VCALENDAR");

    const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Simplified 1-Click Cache Export & Import ---
  exportCache() {
    const jsonStr = window.storageManager.exportBackupJSON();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `deadline_tracker_cache_${dateStr}.json`;
    
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    this.showToast("📥 Browser cache successfully exported as JSON file!", "success");
  }

  triggerImportCache() {
    const input = document.getElementById("cache-file-picker");
    if (input) {
      input.value = ""; // Clear existing selection to allow re-selecting same file
      input.click();
    }
  }

  handleCacheFileImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const res = window.storageManager.importBackupJSON(content);
        if (res.success) {
          this.populateFilterDropdowns();
          this.renderActiveTab();
          if (res.list) {
            this.showToast(`📤 Shared list "${res.list.name}" successfully imported!`, "success");
          } else {
            this.showToast("📤 Cache successfully imported and refreshed!", "success");
          }
        } else {
          alert("❌ Error importing cache: " + (res.error || "Invalid file format"));
        }
      } catch (err) {
        alert("❌ Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  // --- Advanced Cache Backup Modal (Optional Inspection) ---
  openImportExportModal() {
    const modal = document.getElementById("backup-modal");
    if (modal) {
      document.getElementById("backup-json-textarea").value = window.storageManager.exportBackupJSON();
      modal.classList.add("active");
    }
  }

  closeBackupModal() {
    const modal = document.getElementById("backup-modal");
    if (modal) modal.classList.remove("active");
  }

  downloadBackupFile() {
    this.exportCache();
  }

  restoreBackupData() {
    const textarea = document.getElementById("backup-json-textarea");
    if (!textarea || !textarea.value.trim()) return;

    if (confirm("Restore this data? It will merge with your current lists and custom CFPs.")) {
      const res = window.storageManager.importBackupJSON(textarea.value.trim());
      if (res.success) {
        this.showToast("✅ Backup successfully restored!", "success");
        this.closeBackupModal();
        this.populateFilterDropdowns();
        this.renderActiveTab();
      } else {
        alert("❌ Error parsing JSON: " + res.error);
      }
    }
  }

  // --- Serverless Conference List Sharing (Zero-Server URL Hash Encoding) ---
  encodeSharePayload(data) {
    try {
      const jsonStr = JSON.stringify(data);
      return encodeURIComponent(btoa(encodeURIComponent(jsonStr)));
    } catch (e) {
      console.error("Payload encoding error:", e);
      return "";
    }
  }

  decodeSharePayload(hashStr) {
    try {
      let raw = (hashStr || "").replace(/^#/, "");
      if (raw.startsWith("shared_list=")) {
        raw = raw.replace(/^shared_list=/, "");
      } else if (raw.startsWith("share=")) {
        raw = raw.replace(/^share=/, "");
      }
      if (!raw) return null;
      const b64 = decodeURIComponent(raw);
      const jsonStr = decodeURIComponent(atob(b64));
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Payload decoding error:", e);
      return null;
    }
  }

  shareList(listId) {
    const list = window.storageManager.getListById(listId);
    if (!list) return;

    this.currentSharingListId = listId;
    const allVenues = window.storageManager.getAllVenues();
    const listVenues = allVenues.filter(v => list.items.includes(v.id));
    const customVenues = window.storageManager.getCustomVenues().filter(v => list.items.includes(v.id));

    const payload = {
      type: "conference_list",
      v: 1,
      id: list.id,
      name: list.name,
      description: list.description || "",
      items: list.items,
      customVenues: customVenues
    };

    const encoded = this.encodeSharePayload(payload);
    const baseUrl = window.location.href.split("#")[0];
    const shareUrl = `${baseUrl}#shared_list=${encoded}`;

    this.openShareModal(list, shareUrl, listVenues);
  }

  openShareModal(list, shareUrl, venues) {
    const modal = document.getElementById("share-modal");
    if (!modal) return;

    document.getElementById("share-modal-title").textContent = `🔗 Share: ${list.name}`;
    const linkInput = document.getElementById("share-link-input");
    if (linkInput) linkInput.value = shareUrl;

    const countBadge = document.getElementById("share-modal-count-badge");
    if (countBadge) countBadge.textContent = `${venues.length} Venues`;

    const previewContainer = document.getElementById("share-modal-venues-preview");
    if (previewContainer) {
      if (venues.length === 0) {
        previewContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.75rem;">This list is currently empty. Add venues to this list to share.</span>`;
      } else {
        previewContainer.innerHTML = venues.map(v => {
          const rankClass = v.coreRank ? v.coreRank.replace('*', '-star').toLowerCase() : 'other';
          const deadlineText = v.deadline ? new Date(v.deadline).toLocaleDateString() : 'TBA';
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1px solid var(--border-color); padding:4px 8px; border-radius:4px;">
              <div>
                <span class="rank-pill rank-${rankClass}" style="margin-right:6px; font-size:0.68rem; padding:1px 5px;">${v.coreRank || 'N/A'}</span>
                <strong>${v.acronym}</strong> - <span style="color:var(--text-muted);">${v.name}</span>
              </div>
              <span style="font-family:var(--font-mono); font-size:0.72rem; color:var(--text-secondary);">${deadlineText}</span>
            </div>
          `;
        }).join("");
      }
    }

    modal.classList.add("active");
  }

  closeShareModal() {
    const modal = document.getElementById("share-modal");
    if (modal) modal.classList.remove("active");
  }

  async copyShareLink() {
    const linkInput = document.getElementById("share-link-input");
    if (!linkInput) return;

    const btn = document.getElementById("btn-copy-share-link");
    const originalText = btn ? btn.innerHTML : "📋 Copy Link";

    try {
      await navigator.clipboard.writeText(linkInput.value);
      if (btn) btn.innerHTML = "✅ Link Copied!";
      this.showToast("📋 Shareable URL copied to clipboard! Anyone opening this link can view & import the list.", "success");
      setTimeout(() => {
        if (btn) btn.innerHTML = originalText;
      }, 2500);
    } catch (e) {
      // Fallback
      linkInput.select();
      document.execCommand("copy");
      if (btn) btn.innerHTML = "✅ Link Copied!";
      this.showToast("📋 Link copied to clipboard!", "success");
      setTimeout(() => {
        if (btn) btn.innerHTML = originalText;
      }, 2500);
    }
  }

  copyListMarkdown() {
    if (!this.currentSharingListId) return;
    const list = window.storageManager.getListById(this.currentSharingListId);
    if (!list) return;

    const allVenues = window.storageManager.getAllVenues();
    const listVenues = allVenues.filter(v => list.items.includes(v.id));

    let md = `### 📚 ${list.name}\n`;
    if (list.description) md += `*${list.description}*\n\n`;
    md += `| Acronym | Conference Name | CORE Rank | Submission Deadline (AoE) | Location | Official CFP |\n`;
    md += `| :--- | :--- | :---: | :--- | :--- | :--- |\n`;

    listVenues.forEach(v => {
      const deadlineStr = v.deadline ? new Date(v.deadline).toLocaleDateString() : 'TBA';
      const link = v.website ? `[CFP Link](${v.website})` : '-';
      md += `| **${v.acronym}** | ${v.name} | **${v.coreRank || '-'}** | \`${deadlineStr}\` | ${v.location || '-'} | ${link} |\n`;
    });

    md += `\n*Exported from PhD Deadline Tracker (IIIT-H)*\n`;

    navigator.clipboard.writeText(md).then(() => {
      this.showToast("📝 Markdown table copied! Paste directly into Notion, Overleaf, or GitHub.", "info");
    }).catch(() => {
      alert("Failed to copy markdown to clipboard.");
    });
  }

  downloadListJSON() {
    if (!this.currentSharingListId) return;
    const jsonStr = window.storageManager.exportSingleListJSON(this.currentSharingListId);
    if (!jsonStr) return;

    const list = window.storageManager.getListById(this.currentSharingListId);
    const cleanName = (list.name || "list").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const filename = `${cleanName}_conference_list.json`;

    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    this.showToast(`💾 List exported as "${filename}"!`, "success");
  }

  exportCurrentShareICS() {
    if (this.currentSharingListId) {
      this.exportListICS(this.currentSharingListId);
    }
  }

  // --- Incoming Shared List Detector (Client-Side Serverless Auto-Import) ---
  checkForSharedListInUrl() {
    const hash = window.location.hash;
    if (!hash || (!hash.includes("shared_list=") && !hash.includes("share="))) {
      return;
    }

    const payload = this.decodeSharePayload(hash);
    if (!payload || !payload.name) {
      console.warn("Invalid or unparseable shared list payload in URL hash.");
      return;
    }

    this.incomingSharedData = payload;
    this.openIncomingShareModal(payload);
  }

  openIncomingShareModal(payload) {
    const modal = document.getElementById("incoming-share-modal");
    if (!modal) return;

    document.getElementById("incoming-list-name").textContent = payload.name;
    document.getElementById("incoming-list-desc").textContent = payload.description || "Shared by a collaborator via serverless link.";
    
    // Resolve venues (including any custom ones bundled in the payload)
    const allKnown = [
      ...(payload.customVenues || []),
      ...window.storageManager.getAllVenues()
    ];
    
    const venues = (payload.items || []).map(id => allKnown.find(v => v.id === id)).filter(Boolean);
    document.getElementById("incoming-list-count").textContent = `${venues.length} Venues`;

    const listEl = document.getElementById("incoming-venues-list");
    if (listEl) {
      if (venues.length === 0) {
        listEl.innerHTML = `<span style="color:var(--text-muted); font-size:0.75rem;">This list currently has no tracked venues.</span>`;
      } else {
        listEl.innerHTML = venues.map(v => {
          const rankClass = v.coreRank ? v.coreRank.replace('*', '-star').toLowerCase() : 'other';
          const deadlineText = v.deadline ? new Date(v.deadline).toLocaleDateString() : 'TBA';
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1px solid var(--border-color); padding:5px 8px; border-radius:4px; font-size:0.75rem;">
              <div>
                <span class="rank-pill rank-${rankClass}" style="margin-right:6px; font-size:0.65rem; padding:1px 5px;">${v.coreRank || 'N/A'}</span>
                <strong>${v.acronym}</strong> - <span style="color:var(--text-muted);">${v.name}</span>
              </div>
              <span style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-secondary);">${deadlineText}</span>
            </div>
          `;
        }).join("");
      }
    }

    modal.classList.add("active");
  }

  closeIncomingShareModal() {
    const modal = document.getElementById("incoming-share-modal");
    if (modal) modal.classList.remove("active");
    // Clean hash without page reload
    if (window.history && window.history.replaceState) {
      history.replaceState(null, null, window.location.pathname + window.location.search);
    }
  }

  confirmSaveSharedList() {
    if (!this.incomingSharedData) return;

    const res = window.storageManager.saveImportedList(this.incomingSharedData);
    if (res.success) {
      this.closeIncomingShareModal();
      this.populateFilterDropdowns();
      this.switchTab("tab-lists");
      this.renderActiveTab();
      this.showToast(`🎉 List "${res.list.name}" saved to your browser cache!`, "success");
    } else {
      alert("❌ Could not save shared list: " + res.error);
    }
  }

  // --- Interactive Floating Toast Notification System ---
  showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `app-toast toast-${type}`;
    
    let icon = "✅";
    if (type === "info") icon = "ℹ️";
    if (type === "error") icon = "❌";

    toast.innerHTML = `
      <span style="font-size:1.1rem; line-height:1;">${icon}</span>
      <span style="flex:1;">${message}</span>
      <button style="background:transparent; border:none; color:rgba(255,255,255,0.7); cursor:pointer; font-size:1rem; padding:0 0 0 6px;" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hiding");
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
  window.app = new ConferenceTrackerApp();
});
