# ☕ Deadline Tracker — Academic Research Portal

An offline-first academic deadline tracking system, visualizer, and WikiCFP-style list manager tailored for PhD researchers across **Transfer Learning, Multilingual Learning, Discourse, Multimodal Benchmarks, Causal Understanding, Implicature, Question Answering (QA/QG), Computer Vision (CV), Robotics, Representation Learning, and Graphs & GNNs**.

This README provides a **rigorous, faithful algorithmic specification and pseudocode reference** for collecting, normalizing, ranking, filtering, and scoring conferences and workshops based directly on the active codebase.

---

## 🏛️ System Architecture Overview

```
                                                [ Data Ingestion & Harvesting ]
                                                               │
              ┌─────────────────────────────────┬──────────────┴──────────────────┬─────────────────────────────────┐
              ▼                                 ▼                                 ▼                                 ▼
   [ scripts/fetch_core.py ]      [ scripts/fetch_openreview.py ]      [ scripts/build_data.py ]        [ In-Browser URL Harvester ]
   CORE FoR 4602 (NLP) Scraper    OpenReview API v1/v2 Harvester       Curated Non-CORE Seed Catalog       autofillFromURL()
   (portal.core.edu.au)           (NeurIPS, ICLR, ACL Workshops)       (NeurIPS, CVPR, Systems, etc.)   (Custom CFPs / Workshops)
              │                                 │                                 │                                 │
              └─────────────────────────────────┴──────────────┬──────────────────┴─────────────────────────────────┘
                                                               ▼
                                                   [ data/conferences.json ]
                                                   [      js/data.js       ]
                                                               │
                                                               ▼
                                                    [ js/storage.js ]
                                             Offline-First Browser Cache
                                                  (localStorage API)
                                                       │        ▲
                               (User Custom CFPs & URL)│        │ (1-Click JSON Import/Export & URL Hash)
                                                       ▼        │
                                                    [ js/app.js ]
                                     Multi-Criteria Ranking, Filtering & Sorting
                                                       │
                                                       ▼
                                                [ js/visualizer.js ]
                               Gantt Timeline • 12-Month Calendar • Urgency Cards • Matrix
```

---

## Part I: Conference & Workshop Collection Pipelines

The system aggregates academic venues through five complementary pathways:
1. **Automated CORE Harvester** ([`scripts/fetch_core.py`](file:///Users/kaveri/Documents/Research/Deadlines/scripts/fetch_core.py)): Scrapes all conferences in Field of Research (FoR) 4602 (Natural Language Processing) from the official ICORE 2026 ranking portal.
2. **Automated OpenReview Harvester** ([`scripts/fetch_openreview.py`](file:///Users/kaveri/Documents/Research/Deadlines/scripts/fetch_openreview.py)): Queries OpenReview REST APIs for declared workshops and tracks.
3. **Curated Non-CORE Seed Catalog Compiler** ([`scripts/build_data.py`](file:///Users/kaveri/Documents/Research/Deadlines/scripts/build_data.py)): Maintains foundational seed conferences outside FoR 4602 (e.g., General ML/Theory, Computer Vision, Systems, and Data Mining).
4. **In-Browser Custom CFP URL Harvester** (`autofillFromURL()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)): Real-time metadata extraction from CFP landing pages and OpenReview group URLs.
5. **Client-Side Venue Registration & Deduplicated Aggregator** ([`js/storage.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/storage.js)): Manages offline persistence and unifies custom user CFPs with the master compiled catalog.

> [!IMPORTANT]
> **Deduplication Rule**: Static seeds in `scripts/build_data.py` are strictly filtered against CORE FoR 4602. Any conference already listed by CORE NLP (e.g., ACL, EMNLP, NAACL, AAAI, IJCAI, UAI, CoRL, ICRA, IROS, CIKM, CogSci, COLING, EACL, CoNLL, BigData, AIES, KSEM) is removed from `build_data.py`'s static seeds and ingested exclusively through the CORE scraper.

---

### Algorithm 1.1: Automated CORE 2026 Conference Harvester (Field of Research 4602: NLP)
*Source: [`scripts/fetch_core.py`](file:///Users/kaveri/Documents/Research/Deadlines/scripts/fetch_core.py)*

Scrapes conference rankings, titles, acronyms, and DBLP links for Field of Research (FoR) 4602 (Natural Language Processing) directly from the ICORE 2026 portal:
`https://portal.core.edu.au/conf-ranks/?search=4602&by=for&source=ICORE2026&sort=atitle&page={page}`

```python
ALGORITHM: HarvestCoreFoR4602Conferences(outputPath, mergeDirectly)
INPUT:
    baseURL       ← "https://portal.core.edu.au/conf-ranks/?search=4602&by=for&source=ICORE2026&sort=atitle&page="
    outputPath    ← Target file path (default: "data/core_4602_nlp.json")
    mergeDirectly ← Boolean flag indicating whether to merge directly into "data/conferences.json"

OUTPUT:
    coreCatalog   ← Array of normalized, enriched NLP conference objects

BEGIN
    DOMAIN_KEYWORDS ← {
        "causality":         ["causal", "causality", "counterfactual", "invariant", "reasoning"],
        "multimodal":        ["multimodal", "vision-language", "audio-visual", "speech", "multimedia"],
        "multilingual":      ["multilingual", "cross-lingual", "translation", "low-resource", "asian", "americas"],
        "discourse":         ["discourse", "dialog", "dialogue", "pragmatics", "coherence", "sigdial"],
        "implicature":       ["implicature", "presupposition", "semantics", "pragmatic", "inference"],
        "qa-qg":             ["question", "qa", "qg", "answering", "generation", "reading comprehension"],
        "transfer-learning": ["transfer", "adaptation", "generalization", "representation", "peft"],
        "ir-search":         ["information retrieval", "retrieval", "search", "web", "mining", "cikm"],
        "graphs":            ["graph", "gnn", "relational", "knowledge graph"],
        "cognitive-science": ["cognitive", "psycholinguistics", "human behavior", "cogsci"],
        "general-nlp":       ["language", "linguistics", "natural language", "computational linguistics", "nlp"]
    }

    // Step 1: Query Page 1 to Determine Total Result Count and Number of Pages
    page1HTML ← HTTP_GET(baseURL + "1", headers={"User-Agent": "Mozilla/5.0..."})
    totalCount ← EXTRACT_REGEX(r"Showing results \d+ - \d+ of (\d+)", page1HTML)
    totalPages ← CEIL(totalCount / 50)   // 183 conferences across 4 pages

    coreCatalog ← []

    // Step 2: Traverse All Pages
    FOR pageNum FROM 1 TO totalPages DO:
        pageHTML ← HTTP_GET(baseURL + pageNum)
        tableHTML ← EXTRACT_REGEX(r"<table[^>]*>(.*?)</table>", pageHTML)
        rows ← EXTRACT_ALL_REGEX(r"<tr[^>]*onclick=\"navigate\('([^']+)'\)\"[^>]*>(.*?)</tr>", tableHTML)

        FOR EACH (detailPath, rowHTML) IN rows DO:
            cells ← STRIP_HTML_TAGS(EXTRACT_ALL_REGEX(r"<td[^>]*>(.*?)</td>", rowHTML))
            
            title       ← cells[0]
            acronym     ← STRIP(cells[1])
            source      ← STRIP(cells[2])          // "ICORE2026"
            rawRank     ← STRIP(cells[3])          // "A*", "A", "B", "C", "Australasian B/C", "National"
            primaryFoR  ← STRIP(cells[6])          // "4602" or primary code
            dblpURL     ← EXTRACT_REGEX(r'href="(https?://dblp[^\"]+)"', rowHTML)
            coreID      ← EXTRACT_REGEX(r"/conf-ranks/(\d+)/", detailPath)

            // Rank Normalization
            normalizedRank ← MapCoreRank(rawRank)  // A*, A, B, C

            // PhD Domain Inference
            searchCorpus ← LOWERCASE(acronym + " " + title)
            matchedDomains ← SET(["general-nlp"])  // All items inherently belong to FoR 4602
            FOR EACH (domainKey, keywords) IN DOMAIN_KEYWORDS DO:
                IF ANY (kw IN searchCorpus FOR kw IN keywords) THEN:
                    matchedDomains.ADD(domainKey)
            
            // Check for Known Active Venue Milestones (e.g. ACL, EMNLP, NAACL, CIKM, CogSci)
            enrichment ← CORE_VENUE_ENRICHMENT.GET(acronym, DEFAULT_EMPTY)

            slugId ← "core-" + LOWERCASE(CLEAN_ALPHANUMERIC(acronym))

            venueRecord ← {
                "id": slugId,
                "coreId": coreID,
                "acronym": enrichment.acronym OR (acronym + " 2026/2027"),
                "name": title,
                "type": "conference",
                "edition": enrichment.edition OR "2026/2027",
                "coreRank": normalizedRank,
                "otherRanks": {
                    "source": source,
                    "primaryFoR": primaryFoR,
                    "dblp": dblpURL,
                    "ccf": enrichment.ccf OR normalizedRank,
                    "h5Index": enrichment.h5Index OR (40 IF normalizedRank IN ["A*", "A"] ELSE 25),
                    "acceptanceRate": enrichment.acceptanceRate OR "~25%",
                    "coreDetailUrl": "https://portal.core.edu.au" + detailPath
                },
                "domains": enrichment.domains OR TO_LIST(matchedDomains),
                "tags": enrichment.tags OR [acronym, normalizedRank, "NLP", "CORE2026", "FoR 4602"],
                "abstractDeadline": enrichment.abstractDeadline OR NULL,
                "deadline": enrichment.deadline OR NULL,
                "reviewsReleased": enrichment.reviewsReleased OR NULL,
                "notification": enrichment.notification OR NULL,
                "cameraReady": enrichment.cameraReady OR NULL,
                "conferenceDates": enrichment.conferenceDates OR "2026/2027",
                "location": enrichment.location OR "Global / TBA",
                "timezone": "AoE UTC-12",
                "portal": enrichment.portal OR "CORE Portal",
                "portalUrl": enrichment.portalUrl OR ("https://portal.core.edu.au" + detailPath),
                "website": enrichment.website OR (dblpURL OR ("https://portal.core.edu.au" + detailPath)),
                "notes": enrichment.notes OR ("Harvested from CORE 2026 Portal (FoR 4602: Natural Language Processing). Rank: " + rawRank)
            }

            coreCatalog.APPEND(venueRecord)
        END FOR
    END FOR

    WRITE_JSON(outputPath, coreCatalog, indent=2)

    IF mergeDirectly == TRUE THEN:
        MergeIntoMasterCatalog(coreCatalog, "data/conferences.json")
    END IF

    RETURN coreCatalog
END
```

---

### Algorithm 1.2: Automated OpenReview Workshop Harvester
*Source: [`scripts/fetch_openreview.py`](file:///Users/kaveri/Documents/Research/Deadlines/scripts/fetch_openreview.py)*

Harvests declared workshops from the OpenReview REST API, infers research domains through keyword pattern matching, and normalizes entries into the standard venue schema.

```python
ALGORITHM: HarvestOpenReviewWorkshops(targetPatterns, mergeToFile, outputPath)
INPUT:
    targetPatterns ← List of OpenReview group IDs/prefixes
                     (e.g., "NeurIPS.cc/2026/Workshop/CausalML",
                            "aclweb.org/ACL/2027/Workshop/RepL4NLP",
                            "ICLR.cc/2026/Workshop/MRL",
                            "cclear.cc/2027/Conference")
    mergeToFile    ← Boolean flag indicating whether to merge into data/conferences.json
    outputPath     ← Filepath for raw harvest dump (default: "data/openreview_workshops.json")

OUTPUT:
    harvestedList  ← Array of normalized workshop venue records

BEGIN
    DOMAIN_KEYWORDS ← {
        "causality":               ["causal", "causality", "counterfactual", "invariant", "xai", "reasoning"],
        "multimodal":              ["multimodal", "vision-language", "vlm", "audio-visual", "video", "modalities"],
        "multilingual":            ["multilingual", "cross-lingual", "crosslingual", "translation", "low-resource", "americas"],
        "discourse":               ["discourse", "pragmatics", "coherence", "rhetorical", "disrpt"],
        "implicature":             ["implicature", "presupposition", "semantics", "semeval"],
        "qa-qg":                   ["qa", "qg", "question", "answering", "generation", "reading comprehension"],
        "transfer-learning":       ["transfer", "adaptation", "generalization", "repl4nlp", "mrl", "representation"],
        "cv":                      ["vision", "visual", "image", "cv"],
        "robotics":                ["robot", "robotics", "embodied"],
        "representation-learning": ["representation", "self-supervised", "embeddings"],
        "graphs":                  ["graph", "gnn", "relational", "knowledge graph"],
        "ir-search":               ["retrieval", "search", "web", "mining", "kdd"]
    }

    harvestedList ← []

    FOR EACH groupId IN targetPatterns DO:
        url ← "https://api.openreview.net/groups?id=" + groupId
        requestHeaders ← { "User-Agent": "Mozilla/5.0 (Macintosh; Research Tracker)" }
        response ← HTTP_GET(url, headers=requestHeaders, timeout=6s)
        
        IF response.status == 200 THEN:
            data ← JSON_PARSE(response.body)
            groups ← data.get("groups", [])
            
            IF LENGTH(groups) > 0 THEN:
                groupData ← groups[0]
                content ← groupData.get("content", {})
                
                // Extract scalar values handling both dict-wrapped (.value) and plain strings
                title     ← content.title.value    IF IS_DICT(content.title)    ELSE content.title
                subtitle  ← content.subtitle.value IF IS_DICT(content.subtitle) ELSE content.subtitle
                website   ← content.website.value  IF IS_DICT(content.website)  ELSE content.website
                location  ← content.location.value IF IS_DICT(content.location) ELSE content.location
                dateStr   ← content.date.value     IF IS_DICT(content.date)     ELSE content.date
                
                acronym   ← subtitle OR LAST_ELEMENT(SPLIT(groupId, "/"))
                name      ← title OR acronym
                slugId    ← "orw-" + LOWERCASE(REPLACE_ALL(groupId, ["/", ".", "_"], "-"))
                
                // Domain Inference Subroutine
                searchCorpus ← LOWERCASE(name + " " + (subtitle OR "") + " " + groupId)
                matchedDomains ← SET()
                
                FOR EACH (domainKey, keywords) IN DOMAIN_KEYWORDS DO:
                    IF ANY (kw IN searchCorpus FOR kw IN keywords) THEN:
                        matchedDomains.ADD(domainKey)
                
                IF LENGTH(matchedDomains) == 0 THEN:
                    matchedDomains.ADD("general-ai-ml")
                
                // Normalize Record to Venue Schema
                venueRecord ← {
                    "id": slugId,
                    "acronym": acronym,
                    "name": name,
                    "type": "workshop",
                    "edition": "2026/2027",
                    "coreRank": "Workshop",
                    "otherRanks": {
                        "ccf": "Workshop",
                        "h5Index": 30,
                        "acceptanceRate": "~30-35%"
                    },
                    "domains": TO_LIST(matchedDomains),
                    "tags": [TITLE_CASE(REPLACE(d, "-", " ")) FOR d IN matchedDomains],
                    "abstractDeadline": NULL,
                    "deadline": NULL,
                    "rawDateString": dateStr OR "Declared on OpenReview",
                    "conferenceDates": dateStr OR "TBA",
                    "location": location OR "Virtual / Co-located",
                    "timezone": "AoE UTC-12",
                    "portal": "OpenReview",
                    "portalUrl": "https://openreview.net/group?id=" + groupId,
                    "website": website OR ("https://openreview.net/group?id=" + groupId),
                    "notes": "Aggregated live from OpenReview group: " + groupId
                }
                
                harvestedList.APPEND(venueRecord)
            END IF
        END IF
    END FOR

    WRITE_JSON(outputPath, harvestedList)

    // Deduplicated Merge with Master Catalog
    IF mergeToFile == TRUE AND LENGTH(harvestedList) > 0 THEN:
        confPath ← "data/conferences.json"
        IF FILE_EXISTS(confPath) THEN:
            existingCatalog ← READ_JSON(confPath)
            existingIds ← { item.id FOR item IN existingCatalog }
            
            FOR EACH workshop IN harvestedList DO:
                IF workshop.id NOT IN existingIds THEN:
                    existingCatalog.APPEND(workshop)
                    
            WRITE_JSON(confPath, existingCatalog)
        END IF
    END IF

    RETURN harvestedList
END
```

---

### Algorithm 1.3: Curated Seed Catalog Compilation & Deduplication Pipeline
*Source: [`scripts/build_data.py`](file:///Users/kaveri/Documents/Research/Deadlines/scripts/build_data.py)*

Generates the core database of non-CORE seed conferences (General ML, Vision, Data Mining, Systems, Declared Workshops) and unifies them with the harvested CORE FoR 4602 conferences, ensuring **zero duplicate seeds**.

```python
ALGORITHM: BuildSeedCatalogAndCompile()
INPUT:
    "data/core_4602_nlp.json" ← 183 conferences harvested from CORE 2026 Portal (FoR 4602: NLP)
    non_core_seeds           ← 34 curated seeds outside FoR 4602 (NeurIPS, ICLR, ICML, CVPR, KDD, etc.)
    domains_def              ← 15 domain definitions with color palettes and taxonomies
    rank_tiers               ← 7 CORE rank tiers with visual styles and descriptions

OUTPUT:
    "data/conferences.json"  ← Master JSON database (217 venues)
    "js/data.js"             ← Client browser bundle bound to window.RESEARCH_DATA

BEGIN
    coreVenues ← READ_JSON("data/core_4602_nlp.json")
    coreAcronyms ← { c.acronym.SPLIT()[0].UPPERCASE() FOR c IN coreVenues }

    // Deduplication Subroutine: Filter out seeds already present in CORE 4602
    filteredSeeds ← []
    FOR EACH seed IN non_core_seeds DO:
        seedAcroBase ← seed.acronym.SPLIT()[0].UPPERCASE().REPLACE("*", "")
        IF seedAcroBase NOT IN coreAcronyms THEN:
            filteredSeeds.APPEND(seed)
        ELSE:
            LOG("Removed duplicate seed: " + seed.acronym + " (Ingested via CORE 4602)")
        END IF
    END FOR

    compiledVenues ← [...coreVenues, ...filteredSeeds]

    // 1. Output Master JSON Catalog
    WRITE_JSON("data/conferences.json", compiledVenues, indent=2)

    // 2. Output In-Browser Script Bundle (window.RESEARCH_DATA)
    jsPayload ← FORMAT("""
    const DOMAIN_DEFINITIONS = {domains};
    const CORE_RANK_TIERS = {ranks};
    const DEFAULT_CONFERENCES = {venues};

    window.RESEARCH_DATA = {{
      DOMAIN_DEFINITIONS,
      CORE_RANK_TIERS,
      DEFAULT_CONFERENCES
    }};
    """, domains=JSON(domains_def), ranks=JSON(rank_tiers), venues=JSON(compiledVenues))

    WRITE_FILE("js/data.js", jsPayload)

    RETURN compiledVenues
END
```

---

### Algorithm 1.4: In-Browser Custom CFP URL Harvester & Domain Classifier
*Source: `autofillFromURL()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)*

Extracts structured conference or workshop metadata client-side directly from arbitrary URL inputs (e.g., OpenReview group URLs or CFP landing pages) using hostname routing, pathname parsing, and domain keyword heuristics.

```javascript
ALGORITHM: AutofillVenueFromURL(rawUrl)
INPUT:
    rawUrl ← Target URL string entered by user in the custom CFP modal
             (e.g., "https://openreview.net/group?id=NeurIPS.cc/2026/Workshop/CausalML",
                    "https://semeval.github.io/SemEval2027/")

OUTPUT:
    Directly populates DOM form inputs with extracted conference metadata and toggles domain checkboxes

BEGIN
    IF rawUrl IS EMPTY THEN:
        DISPLAY_ALERT("Please enter a CFP or OpenReview URL first.")
        RETURN
    END IF

    urlObj ← NEW URL(rawUrl)
    host ← LOWERCASE(urlObj.hostname)
    pathname ← urlObj.pathname
    searchParams ← urlObj.searchParams

    extractedAcronym ← ""
    extractedName ← ""
    extractedType ← "workshop"
    extractedPortal ← "Conference Portal"
    matchedDomains ← NEW Set()

    // Branch 1: OpenReview Domain Routing
    IF host CONTAINS "openreview.net" THEN:
        extractedPortal ← "OpenReview"
        groupId ← searchParams.GET("id") OR STRIP_LEADING_SLASH(pathname)
        parts ← SPLIT(groupId, "/")
        
        extractedAcronym ← parts[LENGTH(parts) - 1] OR "Workshop"
        extractedName ← JOIN(parts, " ")

        IF LOWERCASE(groupId) CONTAINS "workshop" THEN:
            extractedType ← "workshop"
        ELSE IF LOWERCASE(groupId) CONTAINS "conference" THEN:
            extractedType ← "conference"
        END IF

    // Branch 2: Generic Academic Conference / CFP Webpages
    ELSE:
        pathSegments ← FILTER(SPLIT(pathname, "/"), s => LENGTH(s) > 0)
        hostSegments ← SPLIT(host, ".")
        
        IF host CONTAINS "github.io" THEN:
            extractedPortal ← "GitHub Pages / Softconf"
        ELSE:
            extractedPortal ← "Conference Portal"
        END IF
        
        baseIdentifier ← pathSegments[0] OR hostSegments[0] OR "Venue"
        extractedAcronym ← UPPERCASE(baseIdentifier)
        extractedName ← extractedAcronym + " 2027"

        IF LOWERCASE(rawUrl) CONTAINS "workshop" OR LOWERCASE(rawUrl) CONTAINS "semeval" THEN:
            extractedType ← "workshop"
        ELSE:
            extractedType ← "conference"
        END IF
    END IF

    // Keyword Heuristics for Automated Domain Classification
    urlLower ← LOWERCASE(rawUrl)
    IF urlLower CONTAINS "causal" OR "causality" THEN matchedDomains.ADD("causality")
    IF urlLower CONTAINS "multimodal" OR "mrl" OR "vision" THEN matchedDomains.ADD("multimodal")
    IF urlLower CONTAINS "multilingual" OR "crosslingual" OR "americas" THEN matchedDomains.ADD("multilingual")
    IF urlLower CONTAINS "discourse" OR "disrpt" OR "pragmatics" THEN matchedDomains.ADD("discourse")
    IF urlLower CONTAINS "implicature" OR "semeval" OR "semantics" THEN matchedDomains.ADD("implicature")
    IF urlLower CONTAINS "question" OR "qa" OR "qg" THEN matchedDomains.ADD("qa-qg")
    IF urlLower CONTAINS "ir" OR "search" OR "kdd" OR "web" THEN matchedDomains.ADD("ir-search")
    IF urlLower CONTAINS "transfer" OR "repl4nlp" OR "adaptation" THEN matchedDomains.ADD("transfer-learning")

    // Bind Extracted Fields to Form Inputs
    DOM.SET_VALUE("#new-venue-acronym", extractedAcronym)
    DOM.SET_VALUE("#new-venue-name", extractedName)
    DOM.SET_VALUE("#new-venue-type", extractedType)
    DOM.SET_VALUE("#new-venue-website", rawUrl)
    DOM.SET_VALUE("#new-venue-portal", extractedPortal)

    // Check Matched Domain Checkboxes in DOM
    FOR EACH checkbox IN DOM.QUERY_ALL("#new-venue-domains input") DO:
        checkbox.checked ← matchedDomains.HAS(checkbox.value)
END
```

---

### Algorithm 1.5: Client-Side Venue Registration & Deduplicated Aggregation
*Source: `submitAddVenue()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js) and `getAllVenues()` in [`js/storage.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/storage.js)*

Validates user input, formats dates with the AoE UTC-12 offset, saves the record into browser `localStorage`, and dynamically unifies custom venues with the default seed catalog.

```javascript
ALGORITHM: RegisterCustomVenue(formData)
INPUT:
    formData ← { acronym, name, type, rank, deadline, notif, location, website, portal, notes, selectedDomains }

OUTPUT:
    Persists new venue in localStorage and triggers UI re-render

BEGIN
    IF formData.acronym IS EMPTY OR formData.name IS EMPTY THEN:
        DISPLAY_ALERT("Please enter at least the Conference Acronym and Name.")
        RETURN
    END IF

    // Generate Unique Collision-Free ID
    uniqueId ← "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6)

    // Construct Venue Record with AoE Timestamps
    newVenue ← {
        "id": uniqueId,
        "isCustom": TRUE,
        "acronym": formData.acronym,
        "name": formData.name,
        "type": formData.type,
        "edition": "2026/2027",
        "coreRank": formData.rank,
        "otherRanks": { "h5Index": 40, "acceptanceRate": "25%" },
        "domains": formData.selectedDomains.length > 0 ? formData.selectedDomains : ["general-ai-ml"],
        "tags": [formData.acronym, formData.type],
        "deadline": formData.deadline ? (formData.deadline + "T23:59:59-12:00") : NULL,
        "notification": formData.notif ? (formData.notif + "T23:59:59-12:00") : NULL,
        "conferenceDates": "2027",
        "location": formData.location OR "TBA",
        "timezone": "AoE UTC-12",
        "portal": formData.portal OR "OpenReview",
        "portalUrl": formData.website,
        "website": formData.website,
        "notes": formData.notes OR "User-added custom CFP"
    }

    // Persist to LocalStorage
    customList ← JSON_PARSE(localStorage.GET("research_tracker_custom_venues") OR "[]")
    customList.UNSHIFT(newVenue)
    localStorage.SET("research_tracker_custom_venues", JSON_STRINGIFY(customList))

    // Unified Aggregation Function (Used Everywhere by UI)
    FUNCTION GetAllVenues():
        defaultVenues ← window.RESEARCH_DATA.DEFAULT_CONFERENCES OR []
        cachedCustom ← JSON_PARSE(localStorage.GET("research_tracker_custom_venues") OR "[]")
        RETURN [...cachedCustom, ...defaultVenues]
END
```

---

## Part II: Conference Ranking, Scoring & Multi-Criteria Sorting

The system evaluates conferences across a multi-tier hierarchy:
1. **CORE 2026 Standard** (Primary Discrete Priority Metric)
2. **Google Scholar Metrics** (`h5-index`) (Citation Velocity Metric)
3. **Acceptance Rates** (Competitiveness Indicator)
4. **CCF Class** (Chinese Computer Federation Classification)

---

### Algorithm 2.1: 7-Tier CORE Integer Priority Space Mapping
*Source: `getFilteredVenues()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)*

Maps non-numeric ranking categories into a strictly ordered discrete integer priority space $\mathcal{R} \in \{1, \dots, 7\}$:

$$\text{Priority}(\text{rank}) = \begin{cases}
7, & \text{if rank} = \text{"A*"} \\
6, & \text{if rank} = \text{"A"} \\
5, & \text{if rank} = \text{"B*"} \\
4, & \text{if rank} = \text{"B"} \\
3, & \text{if rank} = \text{"C*"} \\
2, & \text{if rank} = \text{"C"} \\
1, & \text{if rank} = \text{"Workshop"} \\
0, & \text{otherwise}
\end{cases}$$

| CORE Rank Tier | Priority Score ($\mathcal{R}$) | Badge Style & Color | Tier Description & Acceptance Profile | Representative Venues in Catalog |
| :--- | :---: | :--- | :--- | :--- |
| **CORE A\*** | **7** | `bg: #f3e8ff, text: #7e22ce` | Highest international prestige (top ~4–7%). Highly selective ($15\% - 25\%$). | NeurIPS, ICLR, ICML, ACL, CVPR, AAAI, SIGIR, KDD |
| **CORE A** | **6** | `bg: #fee2e2, text: #b91c1c` | Highly competitive, globally recognized premier outlets. | CLeaR, UAI, CoRL, CIKM, PAKDD, ECML-PKDD, CogSci |
| **CORE B\*** | **5** | `bg: #ffedd5, text: #c2410c` | Very strong international reputation with rigorous peer review. | WACV, MLSys, ICASSP, IEEE Big Data |
| **CORE B** | **4** | `bg: #fef9c3, text: #a16207` | Solid international venue, specialized subfield authority. | DASFAA, IJCNN, *SEM, AIES |
| **CORE C\*** | **3** | `bg: #dcfce7, text: #15803d` | Recognized peer-reviewed conference with specialized impact. | NLPCC |
| **CORE C** | **2** | `bg: #f5ebe0, text: #78350f` | Standard regional or domain-specific outlet. | KSEM |
| **Workshop** | **1** | `bg: #dbeafe, text: #1d4ed8` | Declared workshop or shared task track (co-located or OpenReview). | SemEval, MRL, CI-NLP, RepL4NLP, DisRPT |

---

### Algorithm 2.2: Multi-Criteria Sorting Comparator
*Source: `getFilteredVenues()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)*

Sorts venues dynamically according to the user's selected criteria, handling null deadline values deterministically:

```javascript
ALGORITHM: CompareVenues(venueA, venueB, sortByCriteria)
INPUT:
    venueA, venueB ← Two conference/workshop objects
    sortByCriteria ← String ("deadline-asc" | "deadline-desc" | "rank-desc" | "h5-desc" | "name-asc")

OUTPUT:
    Integer (-1, 0, 1) indicating relative ordering

BEGIN
    // Mode 1: Chronological Deadline (Earliest / Most Urgent First)
    IF sortByCriteria == "deadline-asc" THEN:
        IF venueA.deadline == NULL THEN RETURN 1      // Unset deadlines sink to bottom
        IF venueB.deadline == NULL THEN RETURN -1
        RETURN Date(venueA.deadline) - Date(venueB.deadline)

    // Mode 2: Reverse Chronological Deadline (Furthest Deadline First)
    ELSE IF sortByCriteria == "deadline-desc" THEN:
        IF venueA.deadline == NULL THEN RETURN 1
        IF venueB.deadline == NULL THEN RETURN -1
        RETURN Date(venueB.deadline) - Date(venueA.deadline)

    // Mode 3: CORE Rank Descending (Integer Priority Score)
    ELSE IF sortByCriteria == "rank-desc" THEN:
        rankOrderMap ← { "A*": 7, "A": 6, "B*": 5, "B": 4, "C*": 3, "C": 2, "Workshop": 1 }
        scoreA ← rankOrderMap[venueA.coreRank] OR 0
        scoreB ← rankOrderMap[venueB.coreRank] OR 0
        RETURN scoreB - scoreA

    // Mode 4: Google Scholar h5-Index Descending
    ELSE IF sortByCriteria == "h5-desc" THEN:
        h5A ← (venueA.otherRanks AND venueA.otherRanks.h5Index) OR 0
        h5B ← (venueB.otherRanks AND venueB.otherRanks.h5Index) OR 0
        RETURN h5B - h5A

    // Mode 5: Lexicographical by Acronym (A-Z)
    ELSE IF sortByCriteria == "name-asc" THEN:
        RETURN venueA.acronym.LOCALE_COMPARE(venueB.acronym)

    ELSE:
        RETURN 0
END
```

---

### Algorithm 2.3: Workshop-Specific Sorting Comparator
*Source: `renderOpenReviewWorkshops()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)*

Sorts declared workshops on the OpenReview workshops page by deadline urgency or acronym:

```javascript
ALGORITHM: CompareWorkshops(wA, wB, workshopSortBy)
INPUT:
    wA, wB         ← Two declared workshop records
    workshopSortBy ← String ("deadline-asc" | "deadline-desc" | "name-asc")

OUTPUT:
    Integer (-1, 0, 1)

BEGIN
    IF workshopSortBy == "deadline-asc" THEN:
        IF wA.deadline == NULL THEN RETURN 1
        IF wB.deadline == NULL THEN RETURN -1
        RETURN Date(wA.deadline) - Date(wB.deadline)

    ELSE IF workshopSortBy == "deadline-desc" THEN:
        IF wA.deadline == NULL THEN RETURN 1
        IF wB.deadline == NULL THEN RETURN -1
        RETURN Date(wB.deadline) - Date(wA.deadline)

    ELSE IF workshopSortBy == "name-asc" THEN:
        RETURN wA.acronym.LOCALE_COMPARE(wB.acronym)

    ELSE:
        RETURN 0
END
```

---

## Part III: Multi-Dimensional Filtering Engine

Filtering applies a 6-stage sequential pipeline across list cohort, type, CORE rank tier, domain aliases, temporal deadline window, and search query.

---

### Algorithm 3.1: Master Filtering Pipeline
*Source: `getFilteredVenues()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)*

```javascript
ALGORITHM: GetFilteredAndRankedVenues(state)
INPUT:
    state ← {
        selectedListId:       String ("all" | "favorites" | listId),
        filterType:           String ("all" | "conference" | "workshop"),
        filterRank:           String ("all" | "A*" | "A" | "B*" | "B" | "C*" | "C" | "Workshop"),
        filterDomain:         String ("all" | domainKey),
        filterDeadlineRange:  String ("all" | "urgent" | "upcoming-30" | "upcoming-60" | "next-6m" | "past"),
        searchQuery:          String (case-insensitive substring),
        sortBy:               String ("deadline-asc" | "deadline-desc" | "rank-desc" | "h5-desc" | "name-asc")
    }

OUTPUT:
    filteredVenues ← Ordered array of matching conference and workshop objects

BEGIN
    venues ← window.storageManager.getAllVenues()

    // Stage 1: Cohort / List Filter
    IF state.selectedListId == "favorites" THEN:
        favs ← window.storageManager.getFavorites()
        venues ← FILTER(venues, v => favs.INCLUDES(v.id))
    ELSE IF state.selectedListId != "all" THEN:
        targetList ← FIND(window.storageManager.getLists(), l => l.id == state.selectedListId)
        IF targetList != NULL THEN:
            venues ← FILTER(venues, v => targetList.items.INCLUDES(v.id))
        END IF
    END IF

    // Stage 2: Venue Type Filter
    IF state.filterType != "all" THEN:
        venues ← FILTER(venues, v => v.type == state.filterType)
    END IF

    // Stage 3: CORE Rank Tier Filter
    IF state.filterRank != "all" THEN:
        venues ← FILTER(venues, v => v.coreRank == state.filterRank)
    END IF

    // Stage 4: Domain & Alias Resolution Filter
    IF state.filterDomain != "all" THEN:
        venues ← FILTER(venues, v => MatchesDomain(v, state.filterDomain))
    END IF

    // Stage 5: Temporal Deadline Range Filter
    now ← CURRENT_DATE()
    IF state.filterDeadlineRange == "urgent" THEN:
        venues ← FILTER(venues, v => v.deadline != NULL AND (0 < (Date(v.deadline) - now) <= 14 days))
    ELSE IF state.filterDeadlineRange == "upcoming-30" THEN:
        venues ← FILTER(venues, v => v.deadline != NULL AND (0 < (Date(v.deadline) - now) <= 30 days))
    ELSE IF state.filterDeadlineRange == "upcoming-60" THEN:
        venues ← FILTER(venues, v => v.deadline != NULL AND (0 < (Date(v.deadline) - now) <= 60 days))
    ELSE IF state.filterDeadlineRange == "next-6m" THEN:
        venues ← FILTER(venues, v => v.deadline != NULL AND (0 < (Date(v.deadline) - now) <= 180 days))
    ELSE IF state.filterDeadlineRange == "past" THEN:
        venues ← FILTER(venues, v => v.deadline != NULL AND (Date(v.deadline) <= now))
    END IF

    // Stage 6: Free-Text Search Query Filter
    IF state.searchQuery != "" THEN:
        q ← LOWERCASE(state.searchQuery)
        venues ← FILTER(venues, v => {
            haystack ← LOWERCASE(v.acronym + " " + v.name + " " + JOIN(v.tags, " ") + " " + (v.location OR "") + " " + (v.notes OR ""))
            RETURN haystack.CONTAINS(q)
        })
    END IF

    // Stage 7: Sort by Selected Criteria
    SORT(venues, (a, b) => CompareVenues(a, b, state.sortBy))

    RETURN venues
END
```

---

### Algorithm 3.2: Alias-Aware Domain Resolution Engine
*Source: `DOMAIN_ALIASES` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)*

Resolves user-selected domain filters against an ontological alias dictionary:

```javascript
ALGORITHM: MatchesDomain(venue, selectedDomain)
INPUT:
    venue          ← Conference venue record
    selectedDomain ← Domain key (e.g., "cv", "robotics", "discourse", "causality")

OUTPUT:
    Boolean (true if venue matches the domain or any of its ontological aliases)

BEGIN
    IF selectedDomain == "all" THEN RETURN TRUE

    // 1. Direct Domain Key Match
    IF (venue.domains OR []).INCLUDES(selectedDomain) THEN RETURN TRUE

    // 2. Ontological Alias Map
    DOMAIN_ALIASES ← {
        "cv":                      ["cv", "computer vision", "vision", "image", "visual"],
        "robotics":                ["robotics", "robot", "embodied ai", "embodied"],
        "representation-learning": ["representation learning", "representation-learning", "repr", "self-supervised", "embeddings"],
        "graphs":                  ["graphs", "graph", "gnn", "gnns", "knowledge graph"],
        "transfer-learning":       ["transfer learning", "transfer-learning", "adaptation", "domain adaptation", "peft"],
        "multilingual":            ["multilingual", "cross-lingual", "translation", "low-resource"],
        "discourse":               ["discourse", "pragmatics", "rst", "dialogue coherence"],
        "implicature":             ["implicature", "presupposition", "pragmatic reasoning"],
        "multimodal":              ["multimodal", "vision-language", "vlm", "audio-visual"],
        "causality":               ["causality", "causal", "counterfactual", "invariant"],
        "qa-qg":                   ["qa-qg", "qa", "qg", "question answering", "question generation", "rag"],
        "ir-search":               ["ir-search", "ir", "search", "information retrieval", "web", "mining"],
        "general-ai-ml":           ["general-ai-ml", "machine learning", "ml", "ai", "artificial intelligence"],
        "general-nlp":             ["general-nlp", "nlp", "computational linguistics", "cl"],
        "cognitive-science":       ["cognitive-science", "cogsci", "cognitive science"]
    }

    aliases ← DOMAIN_ALIASES[selectedDomain] OR [selectedDomain]

    // 3. Check for Alias in Venue's Domain Array
    IF ANY (d IN (venue.domains OR []) SATISFIES (aliases.INCLUDES(LOWERCASE(d)))) THEN RETURN TRUE

    // 4. Check for Substring Overlap in Tags
    FOR EACH tag IN (venue.tags OR []) DO:
        tLower ← LOWERCASE(tag)
        IF ANY (a IN aliases SATISFIES (tLower.CONTAINS(a) OR a.CONTAINS(tLower))) THEN RETURN TRUE
    END FOR

    // 5. Search Across Concatenated Text Corpus
    corpus ← LOWERCASE(venue.acronym + " " + venue.name + " " + (venue.notes OR ""))
    FOR EACH alias IN aliases DO:
        IF LENGTH(alias) >= 3 AND corpus.CONTAINS(alias) THEN RETURN TRUE
    END FOR

    RETURN FALSE
END
```

---

### Algorithm 3.3: Temporal Deadline Window Filtering
*Source: `getFilteredVenues()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)*

Filters venues according to their remaining time until deadline ($\Delta t = t_{\text{deadline}} - t_{\text{now}}$) normalized to Any Time on Earth (AoE UTC-12):

$$\text{FilterWindow}(\Delta t, \text{mode}) = \begin{cases}
0 < \Delta t \le 14 \text{ days}, & \text{if mode} = \text{"urgent"} \\
0 < \Delta t \le 30 \text{ days}, & \text{if mode} = \text{"upcoming-30"} \\
0 < \Delta t \le 60 \text{ days}, & \text{if mode} = \text{"upcoming-60"} \\
0 < \Delta t \le 180 \text{ days}, & \text{if mode} = \text{"next-6m"} \\
\Delta t \le 0, & \text{if mode} = \text{"past"} \\
\text{TRUE}, & \text{if mode} = \text{"all"}
\end{cases}$$

---

## Part IV: Date Normalization & Countdown Precision

All academic deadlines are normalized to **AoE (Any Time on Earth, UTC-12)** to guarantee that a deadline remains valid as long as the calendar day has not concluded anywhere in the world.

---

### Algorithm 4.1: DD-MM-YY Date Normalizer
*Source: `formatDateDDMMYY()` in [`js/visualizer.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/visualizer.js)*

Transforms arbitrary ISO timestamps, single dates, or date ranges into uniform `DD-MM-YY` format:

```javascript
ALGORITHM: FormatDateDDMMYY(dateInput)
INPUT:
    dateInput ← Date string (e.g., "2026-12-06 to 2026-12-12", "2027-04-26T23:59:59-12:00")

OUTPUT:
    Normalized string in DD-MM-YY format (e.g., "06-12-26 to 12-12-26", "26-04-27")

BEGIN
    IF dateInput == NULL OR dateInput == "" THEN RETURN ""

    // Pattern 1: Date Range "YYYY-MM-DD to YYYY-MM-DD"
    IF dateInput CONTAINS "to" THEN:
        RETURN REGEX_REPLACE(dateInput, /(\d{4})-(\d{2})-(\d{2})/g, 
                             (match, y, m, d) => d + "-" + m + "-" + y.SLICE(-2))

    // Pattern 2: Single ISO Date "YYYY-MM-DD"
    IF dateInput MATCHES /\b\d{4}-\d{2}-\d{2}\b/ THEN:
        RETURN REGEX_REPLACE(dateInput, /\b(\d{4})-(\d{2})-(\d{2})\b/g, 
                             (match, y, m, d) => d + "-" + m + "-" + y.SLICE(-2))

    // Pattern 3: Fallback Date Object Parsing
    d ← NEW Date(dateInput)
    IF NOT IS_NAN(d.getTime()) THEN:
        day   ← PAD_ZERO(d.getDate(), 2)
        month ← PAD_ZERO(d.getMonth() + 1, 2)
        year  ← String(d.getFullYear()).SLICE(-2)
        RETURN day + "-" + month + "-" + year
    END IF

    RETURN String(dateInput)
END
```

---

### Algorithm 4.2: Ticking Countdown Engine (Strict Minutes Precision)
*Source: `formatCountdown()` in [`js/visualizer.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/visualizer.js)*

> [!IMPORTANT]
> **Architectural Directive**: Countdowns strictly omit seconds across all cards, badges, and modals. The output format is always `DDd HHh MMm`.

```javascript
ALGORITHM: CalculateCountdown(deadlineStr)
INPUT:
    deadlineStr ← ISO timestamp string in AoE UTC-12 (e.g. "2026-09-25T23:59:59-12:00")

OUTPUT:
    Object { status, days, hours, minutes, text }

BEGIN
    IF deadlineStr == NULL OR deadlineStr == "" THEN:
        RETURN { status: "TBA", text: "Date TBA" }
    END IF

    diffMs ← NEW Date(deadlineStr).getTime() - CURRENT_TIME_MS()

    IF diffMs <= 0 THEN:
        RETURN { status: "passed", text: "Deadline Passed" }
    END IF

    // Decompose into Days, Hours, Minutes (NO SECONDS)
    days    ← FLOOR(diffMs / (1000 * 60 * 60 * 24))
    hours   ← FLOOR((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    minutes ← FLOOR((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    // Urgency Classification
    IF days < 14 THEN:
        status ← "urgent"
    ELSE IF days < 45 THEN:
        status ← "upcoming"
    ELSE:
        status ← "planned"
    END IF

    RETURN {
        status:  status,
        days:    days,
        hours:   hours,
        minutes: minutes,
        text:    days + "d " + hours + "h " + minutes + "m"
    }
END
```

---

## Part V: Offline-First Storage & Serverless Sharing Engine

All data persistence operates entirely in browser `localStorage` with zero backend server dependencies.

---

### Algorithm 5.1: Storage Manager Lifecycle & 1-Click Backup Export/Import
*Source: [`js/storage.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/storage.js)*

```javascript
ALGORITHM: StorageManagerPipeline

// 1. Unified Venue Aggregator
FUNCTION GetAllVenues():
    customVenues ← JSON_PARSE(localStorage.GET("research_tracker_custom_venues") OR "[]")
    defaultVenues ← window.RESEARCH_DATA.DEFAULT_CONFERENCES OR []
    RETURN [...customVenues, ...defaultVenues]

// 2. 1-Click Cache Export
FUNCTION ExportCacheJSON():
    payload ← {
        "version": "1.0",
        "type": "full_cache_backup",
        "exportDate": CURRENT_ISO_TIMESTAMP(),
        "customVenues": GetCustomVenues(),
        "lists": GetWikiCFPLists(),
        "favorites": GetFavorites(),
        "notes": JSON_PARSE(localStorage.GET("research_tracker_venue_notes") OR "{}")
    }
    TRIGGER_FILE_DOWNLOAD("deadline_tracker_cache_YYYY-MM-DD.json", JSON_STRINGIFY(payload, indent=2))

// 3. 1-Click Cache Import with Conflict Resolution
FUNCTION ImportCacheJSON(filePayload):
    parsed ← JSON_PARSE(filePayload)

    // Sub-case A: Single Shared List Import
    IF parsed.type == "conference_list" OR (parsed.name AND parsed.items AND NOT parsed.lists) THEN:
        RETURN SaveImportedList(parsed)

    // Sub-case B: Full Backup Cache Merge
    IF parsed.customVenues IS ARRAY THEN:
        mergedVenues ← MERGE_BY_ID(GetCustomVenues(), parsed.customVenues)
        SaveCustomVenues(mergedVenues)
    END IF

    IF parsed.lists IS ARRAY THEN:
        mergedLists ← MERGE_BY_ID(GetWikiCFPLists(), parsed.lists)
        SaveWikiCFPLists(mergedLists)
    END IF

    IF parsed.favorites IS ARRAY THEN:
        mergedFavs ← DEDUPLICATE([...GetFavorites(), ...parsed.favorites])
        SaveFavorites(mergedFavs)
    END IF

    IF parsed.notes IS OBJECT THEN:
        mergedNotes ← { ...GetNotes(), ...parsed.notes }
        SaveNotes(mergedNotes)
    END IF

    RETURN { success: true }
```

---

### Algorithm 5.2: Zero-Server List Sharing via URL Hash Encoding
*Source: `shareList()`, `decodeSharePayload()`, and `checkForSharedListInUrl()` in [`js/app.js`](file:///Users/kaveri/Documents/Research/Deadlines/js/app.js)*

Allows researchers to share custom conference lists with collaborators using pure client-side URL hash fragments:

```javascript
ALGORITHM: ServerlessListSharing

// Step 1: Encode List into Shareable URL
FUNCTION GenerateShareURL(listId):
    list ← window.storageManager.getListById(listId)
    allVenues ← window.storageManager.getAllVenues()
    customVenuesInList ← window.storageManager.getCustomVenues().filter(v => list.items.includes(v.id))

    payload ← {
        "type": "conference_list",
        "v": 1,
        "id": list.id,
        "name": list.name,
        "description": list.description OR "",
        "items": list.items,
        "customVenues": customVenuesInList
    }

    jsonStr ← JSON_STRINGIFY(payload)
    b64Encoded ← btoa(encodeURIComponent(jsonStr))
    urlFragment ← "#shared_list=" + encodeURIComponent(b64Encoded)
    
    RETURN window.location.origin + window.location.pathname + urlFragment

// Step 2: Auto-Detect and Import Shared List on Page Load
FUNCTION DetectAndImportSharedList():
    hash ← window.location.hash
    IF hash CONTAINS "shared_list=" THEN:
        raw ← hash.REPLACE("#shared_list=", "")
        b64 ← decodeURIComponent(raw)
        jsonStr ← decodeURIComponent(atob(b64))
        payload ← JSON_PARSE(jsonStr)

        IF payload.name AND payload.items THEN:
            PROMPT_USER_MODAL(
                title: "Import Shared List: " + payload.name,
                venues: payload.items,
                onConfirm: () => window.storageManager.saveImportedList(payload)
            )
        END IF
    END IF
```

---

## Part VI: Standard Venue Data Schema Reference

Every conference and workshop record stored in `data/conferences.json` or custom-added in browser cache adheres to this schema:

```json
{
  "id": "neurips-2026",
  "acronym": "NeurIPS 2026",
  "name": "Conference on Neural Information Processing Systems",
  "type": "conference",
  "edition": "2026",
  "coreRank": "A*",
  "otherRanks": {
    "ccf": "A",
    "h5Index": 285,
    "acceptanceRate": "25.6%"
  },
  "domains": [
    "general-ai-ml",
    "transfer-learning",
    "causality",
    "multimodal",
    "representation-learning"
  ],
  "tags": [
    "NeurIPS",
    "Machine Learning",
    "Deep Learning",
    "Transfer Learning",
    "Representation Learning"
  ],
  "abstractDeadline": "2026-05-15T23:59:59-12:00",
  "deadline": "2026-05-22T23:59:59-12:00",
  "reviewsReleased": "2026-08-04T23:59:59-12:00",
  "notification": "2026-09-25T23:59:59-12:00",
  "cameraReady": "2026-10-23T23:59:59-12:00",
  "conferenceDates": "2026-12-06 to 2026-12-12",
  "location": "Sydney, Australia",
  "timezone": "AoE UTC-12",
  "portal": "OpenReview",
  "portalUrl": "https://openreview.net/group?id=NeurIPS.cc/2026/Conference",
  "website": "https://neurips.cc/Conferences/2026",
  "notes": "Flagship international venue for foundation models, representation learning, causal ML, and multimodal benchmarks."
}
```

---

## Part VII: Local & Vercel Deployment

### 1. Local Execution (Strict No-Cache Server)

To run the application locally without external servers:

```bash
python3 server.py 8088
```

Open your browser at `http://localhost:8088`.

### 2. Vercel Cloud Deployment

The repository is configured for turnkey static deployment to Vercel via [`vercel.json`](file:///Users/kaveri/Documents/Research/Deadlines/vercel.json):

- **Option A (GitHub Integration — Recommended)**: Push the repository to GitHub, go to [vercel.com](https://vercel.com), and click **Add New Project > Import**. Vercel will automatically build and assign a permanent `*.vercel.app` URL with automated HTTPS and continuous deployment.
- **Option B (Vercel CLI)**: Run `npx vercel` directly in your terminal to authenticate securely and deploy immediately.

*Made at [IIIT-H](https://www.iiit.ac.in/).*

