/**
 * Local Storage & Cache Manager
 * Provides offline-first persistence for WikiCFP-style lists, custom CFPs,
 * bookmarks, notes, and full JSON export/import.
 */

const STORAGE_KEYS = {
  CUSTOM_VENUES: "research_tracker_custom_venues",
  WIKICFP_LISTS: "research_tracker_wikicfp_lists",
  FAVORITES: "research_tracker_favorites",
  VENUE_NOTES: "research_tracker_venue_notes",
  THEME_PREF: "research_tracker_theme"
};

const ID_ALIASES = {
  "acl-2027": "core-acl",
  "emnlp-2026": "core-emnlp",
  "naacl-2027": "core-naacl",
  "aaai-2027": "core-aaai",
  "ijcai-2027": "core-ijcai",
  "uai-2027": "core-uai",
  "corl-2026": "core-corl",
  "icra-2027": "core-icra",
  "iros-2027": "core-iros",
  "cikm-2026": "core-cikm",
  "cogsci-2027": "core-cogsci",
  "coling-2027": "core-coling",
  "eacl-2027": "core-eacl",
  "conll-2026": "core-conll",
  "bigdata-2026": "core-bigdata",
  "aies-2026": "core-aies",
  "ksem-2026": "core-ksem"
};

const DEFAULT_LISTS = [
  {
    id: "list-phd-core",
    name: "🎯 PhD Priority Target Venues",
    description: "Flagship A* / A conferences targeted for dissertation milestone papers.",
    items: ["neurips-2026", "iclr-2027", "core-acl", "clear-2027", "cvpr-2027"]
  },
  {
    id: "list-causal-implicature",
    name: "🧠 Causality & Implicature Focus",
    description: "Specialized venues for causal NLP, scalar implicature, and semantic evaluation.",
    items: ["clear-2027", "core-uai", "star-sem-2027", "core-cogsci", "ws-semeval-2027", "ws-causality-nlp-2026"]
  },
  {
    id: "list-workshops-fall",
    name: "💡 Declared Workshops & Benchmarks",
    description: "Short paper and shared task tracks for work-in-progress and benchmarks.",
    items: ["ws-semeval-2027", "ws-mrl-2026", "ws-causality-nlp-2026", "ws-repl4nlp-2027", "ws-disrpt-2027"]
  }
];

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    // Seed initial WikiCFP lists if not present
    if (!localStorage.getItem(STORAGE_KEYS.WIKICFP_LISTS)) {
      this.saveLists(DEFAULT_LISTS);
    }
  }

  // --- Conferences & Custom Venues ---
  getCustomVenues() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_VENUES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load custom venues:", e);
      return [];
    }
  }

  saveCustomVenues(venues) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_VENUES, JSON.stringify(venues));
  }

  addCustomVenue(venue) {
    const venues = this.getCustomVenues();
    // Generate clean ID if not provided
    if (!venue.id) {
      venue.id = "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
    }
    venue.isCustom = true;
    venues.unshift(venue);
    this.saveCustomVenues(venues);
    return venue;
  }

  deleteCustomVenue(id) {
    const venues = this.getCustomVenues().filter(v => v.id !== id);
    this.saveCustomVenues(venues);
    // Remove from all lists as well
    const lists = this.getLists();
    lists.forEach(l => {
      l.items = l.items.filter(itemId => itemId !== id);
    });
    this.saveLists(lists);
  }

  getAllVenues() {
    const defaultVenues = (window.RESEARCH_DATA && window.RESEARCH_DATA.DEFAULT_CONFERENCES) || [];
    const customVenues = this.getCustomVenues();
    return [...customVenues, ...defaultVenues];
  }

  getVenueById(id) {
    if (!id) return null;
    const canonicalId = ID_ALIASES[id] || id;
    const all = this.getAllVenues();
    return all.find(v => v.id === canonicalId || v.id === id);
  }

  // --- WikiCFP Lists ---
  getLists() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WIKICFP_LISTS);
      const rawLists = data ? JSON.parse(data) : DEFAULT_LISTS;
      // Remap any deprecated seed IDs to their canonical CORE IDs
      return rawLists.map(list => ({
        ...list,
        items: (list.items || []).map(id => ID_ALIASES[id] || id)
      }));
    } catch (e) {
      console.error("Failed to load WikiCFP lists:", e);
      return DEFAULT_LISTS;
    }
  }

  saveLists(lists) {
    localStorage.setItem(STORAGE_KEYS.WIKICFP_LISTS, JSON.stringify(lists));
  }

  createList(name, description = "") {
    const lists = this.getLists();
    const newList = {
      id: "list-" + Date.now().toString(36),
      name: name.trim(),
      description: description.trim(),
      items: []
    };
    lists.push(newList);
    this.saveLists(lists);
    return newList;
  }

  deleteList(listId) {
    let lists = this.getLists();
    lists = lists.filter(l => l.id !== listId);
    this.saveLists(lists);
  }

  addToList(listId, venueId) {
    const lists = this.getLists();
    const list = lists.find(l => l.id === listId);
    if (list && !list.items.includes(venueId)) {
      list.items.push(venueId);
      this.saveLists(lists);
      return true;
    }
    return false;
  }

  removeFromList(listId, venueId) {
    const lists = this.getLists();
    const list = lists.find(l => l.id === listId);
    if (list) {
      list.items = list.items.filter(id => id !== venueId);
      this.saveLists(lists);
      return true;
    }
    return false;
  }

  getListsContaining(venueId) {
    if (!venueId) return [];
    const canonicalId = ID_ALIASES[venueId] || venueId;
    const lists = this.getLists();
    return lists.filter(l => (l.items || []).includes(canonicalId) || (l.items || []).includes(venueId));
  }

  // --- Favorites / Bookmarks ---
  getFavorites() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  isFavorite(id) {
    if (!id) return false;
    const canonicalId = ID_ALIASES[id] || id;
    const favs = this.getFavorites();
    return favs.includes(canonicalId) || favs.includes(id);
  }

  toggleFavorite(id) {
    if (!id) return false;
    const canonicalId = ID_ALIASES[id] || id;
    let favs = this.getFavorites();
    const hasFav = favs.includes(canonicalId) || favs.includes(id);
    if (hasFav) {
      favs = favs.filter(x => x !== canonicalId && x !== id);
    } else {
      favs.push(canonicalId);
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
    return !hasFav;
  }

  // --- User Notes per Venue ---
  getVenueNotes(venueId) {
    if (!venueId) return { note: "", status: "exploring" };
    const canonicalId = ID_ALIASES[venueId] || venueId;
    try {
      const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.VENUE_NOTES) || "{}");
      return allNotes[canonicalId] || allNotes[venueId] || { note: "", status: "exploring" };
    } catch (e) {
      return { note: "", status: "exploring" };
    }
  }

  saveVenueNote(venueId, note, status = "exploring") {
    if (!venueId) return;
    const canonicalId = ID_ALIASES[venueId] || venueId;
    try {
      const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.VENUE_NOTES) || "{}");
      allNotes[canonicalId] = { note, status, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.VENUE_NOTES, JSON.stringify(allNotes));
    } catch (e) {
      console.error("Failed to save note:", e);
    }
  }

  getListById(id) {
    const lists = this.getLists();
    return lists.find(l => l.id === id);
  }

  saveImportedList(sharedList) {
    if (!sharedList || !sharedList.name) {
      return { success: false, error: "Invalid shared list structure" };
    }

    // Merge any custom venues bundled with the shared list
    if (sharedList.customVenues && Array.isArray(sharedList.customVenues)) {
      const currentCustoms = this.getCustomVenues();
      sharedList.customVenues.forEach(newV => {
        if (!currentCustoms.some(cV => cV.id === newV.id)) {
          currentCustoms.push(newV);
        }
      });
      this.saveCustomVenues(currentCustoms);
    }

    const lists = this.getLists();
    // Unique list id
    const newId = "list-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
    
    // Check for duplicate name
    const nameExists = lists.some(l => l.name.toLowerCase() === sharedList.name.toLowerCase());
    const finalName = nameExists ? `${sharedList.name} (Shared)` : sharedList.name;

    const cleanList = {
      id: newId,
      name: finalName,
      description: sharedList.description || "Shared conference list",
      items: Array.isArray(sharedList.items) ? [...new Set(sharedList.items)] : []
    };

    lists.push(cleanList);
    this.saveLists(lists);
    return { success: true, list: cleanList };
  }

  // --- Export & Backup ---
  exportBackupJSON() {
    const payload = {
      version: "1.0",
      type: "full_cache_backup",
      exportDate: new Date().toISOString(),
      customVenues: this.getCustomVenues(),
      lists: this.getLists(),
      favorites: this.getFavorites(),
      notes: JSON.parse(localStorage.getItem(STORAGE_KEYS.VENUE_NOTES) || "{}")
    };
    return JSON.stringify(payload, null, 2);
  }

  exportSingleListJSON(listId) {
    const list = this.getListById(listId);
    if (!list) return null;

    const customVenues = this.getCustomVenues().filter(v => list.items.includes(v.id));
    const payload = {
      version: "1.0",
      type: "conference_list",
      exportDate: new Date().toISOString(),
      id: list.id,
      name: list.name,
      description: list.description || "",
      items: list.items,
      customVenues: customVenues
    };
    return JSON.stringify(payload, null, 2);
  }

  importBackupJSON(jsonInput) {
    try {
      const parsed = typeof jsonInput === "string" ? JSON.parse(jsonInput) : jsonInput;
      
      // Case 1: Single shared list
      if (parsed.type === "conference_list" || (parsed.name && Array.isArray(parsed.items) && !parsed.lists)) {
        return this.saveImportedList(parsed);
      }

      // Case 2: Full cache backup
      let countImported = 0;
      if (parsed.customVenues && Array.isArray(parsed.customVenues)) {
        const current = this.getCustomVenues();
        const merged = [...parsed.customVenues];
        current.forEach(c => {
          if (!merged.some(m => m.id === c.id)) merged.push(c);
        });
        this.saveCustomVenues(merged);
        countImported++;
      }
      if (parsed.lists && Array.isArray(parsed.lists)) {
        const currentLists = this.getLists();
        const mergedLists = [...currentLists];
        parsed.lists.forEach(newList => {
          const idx = mergedLists.findIndex(l => l.id === newList.id);
          if (idx >= 0) {
            mergedLists[idx] = newList;
          } else {
            mergedLists.push(newList);
          }
        });
        this.saveLists(mergedLists);
        countImported++;
      }
      if (parsed.favorites && Array.isArray(parsed.favorites)) {
        const currentFavs = this.getFavorites();
        const mergedFavs = Array.from(new Set([...currentFavs, ...parsed.favorites]));
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(mergedFavs));
        countImported++;
      }
      if (parsed.notes && typeof parsed.notes === "object") {
        const currentNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.VENUE_NOTES) || "{}");
        const mergedNotes = { ...currentNotes, ...parsed.notes };
        localStorage.setItem(STORAGE_KEYS.VENUE_NOTES, JSON.stringify(mergedNotes));
        countImported++;
      }

      return { success: true, count: countImported };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_VENUES);
    localStorage.removeItem(STORAGE_KEYS.WIKICFP_LISTS);
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    localStorage.removeItem(STORAGE_KEYS.VENUE_NOTES);
    this.init();
  }
}

window.storageManager = new StorageManager();
