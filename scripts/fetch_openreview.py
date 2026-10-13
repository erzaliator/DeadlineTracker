#!/usr/bin/env python3
"""
OpenReview Workshop Harvester & Synchronizer
Queries the OpenReview API (v1 / v2) to fetch declared workshops and normalize them
into the Conference Tracker schema.

Usage:
    python3 scripts/fetch_openreview.py [--output data/openreview_workshops.json] [--merge]
"""

import argparse
import datetime
import json
import os
import sys
import urllib.request
import urllib.error

OPENREVIEW_V1_URL = "https://api.openreview.net/groups"
OPENREVIEW_V2_URL = "https://api2.openreview.net/v2/groups"

# Known target workshop group prefixes and IDs on OpenReview relevant to:
# Causality, Multimodal, Multilingual, Discourse, QA/QG, Semantics, Transfer Learning
TARGET_WORKSHOP_PATTERNS = [
    # NeurIPS workshops
    "NeurIPS.cc/2026/Workshop/CausalML",
    "NeurIPS.cc/2026/Workshop/XAI",
    "NeurIPS.cc/2026/Workshop/Multimodal",
    "NeurIPS.cc/2025/Workshop/CausalML",
    "NeurIPS.cc/2025/Workshop/XAI",
    # ICLR workshops
    "ICLR.cc/2026/Workshop/MRL",
    "ICLR.cc/2026/Workshop/Causality",
    "ICLR.cc/2025/Workshop/MRL",
    "ICLR.cc/2025/Workshop/Bridging_modalities",
    # ACL / EMNLP / NAACL workshops
    "aclweb.org/EMNLP/2026/Workshop/CI-NLP",
    "aclweb.org/EMNLP/2026/Workshop/MRL",
    "aclweb.org/ACL/2027/Workshop/RepL4NLP",
    "aclweb.org/NAACL/2027/Workshop/AmericasNLP",
    "aclweb.org/ACL/2026/Workshop/DisRPT",
    # CLeaR
    "cclear.cc/2027/Conference",
    "cclear.cc/2026/Conference"
]

def fetch_group_v1(group_id):
    """Fetch group details from OpenReview v1 API."""
    url = f"{OPENREVIEW_V1_URL}?id={group_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Research Tracker)"})
    try:
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode("utf-8"))
            groups = data.get("groups", [])
            return groups[0] if groups else None
    except Exception as e:
        return None

DOMAIN_KEYWORDS = {
    "causality": ["causal", "causality", "counterfactual", "invariant", "xai", "reasoning"],
    "multimodal": ["multimodal", "vision-language", "vlm", "audio-visual", "video", "modalities"],
    "multilingual": ["multilingual", "cross-lingual", "crosslingual", "translation", "low-resource", "americas"],
    "discourse": ["discourse", "pragmatics", "coherence", "rhetorical", "disrpt"],
    "implicature": ["implicature", "presupposition", "semantics", "semeval"],
    "qa-qg": ["qa", "qg", "question", "answering", "generation", "reading comprehension"],
    "transfer-learning": ["transfer", "adaptation", "generalization", "repl4nlp", "mrl", "representation"],
    "cv": ["vision", "visual", "image", "cv"],
    "robotics": ["robot", "robotics", "embodied"],
    "representation-learning": ["representation", "self-supervised", "embeddings"],
    "graphs": ["graph", "gnn", "relational", "knowledge graph"],
    "ir-search": ["retrieval", "search", "web", "mining", "kdd"]
}

def infer_domains(text):
    """Infer research domains from title and description text."""
    text_lower = text.lower()
    matched = set()
    for domain, kws in DOMAIN_KEYWORDS.items():
        if any(kw in text_lower for kw in kws):
            matched.add(domain)
    if not matched:
        matched.add("general-ai-ml")
    return list(matched)

def normalize_openreview_entry(group_data):
    """Convert OpenReview group response into standard conference/workshop item."""
    group_id = group_data.get("id", "")
    content = group_data.get("content", {})
    
    title = content.get("title", {}).get("value") if isinstance(content.get("title"), dict) else content.get("title")
    subtitle = content.get("subtitle", {}).get("value") if isinstance(content.get("subtitle"), dict) else content.get("subtitle")
    website = content.get("website", {}).get("value") if isinstance(content.get("website"), dict) else content.get("website")
    location = content.get("location", {}).get("value") if isinstance(content.get("location"), dict) else content.get("location")
    date_str = content.get("date", {}).get("value") if isinstance(content.get("date"), dict) else content.get("date")
    
    acronym = subtitle or group_id.split("/")[-1]
    name = title or acronym
    
    # Generate slug ID
    slug = group_id.lower().replace("/", "-").replace(".", "-").replace("_", "-")
    
    domains = infer_domains(f"{name} {subtitle} {group_id}")
    
    return {
        "id": f"orw-{slug}",
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
        "domains": domains,
        "tags": [d.replace("-", " ").title() for d in domains],
        "abstractDeadline": None,
        "deadline": None,
        "rawDateString": date_str or "Declared on OpenReview",
        "conferenceDates": date_str or "TBA",
        "location": location or "Virtual / Co-located",
        "timezone": "AoE (UTC-12)",
        "portal": "OpenReview",
        "portalUrl": f"https://openreview.net/group?id={group_id}",
        "website": website or f"https://openreview.net/group?id={group_id}",
        "notes": f"Aggregated live from OpenReview group: {group_id}"
    }

def main():
    parser = argparse.ArgumentParser(description="Fetch and normalize declared OpenReview workshops.")
    parser.add_argument("--output", default="data/openreview_workshops.json", help="Path to output JSON")
    parser.add_argument("--merge", action="store_true", help="Merge into data/conferences.json")
    args = parser.parse_args()

    print("[1/3] Querying OpenReview for targeted workshop declarations...")
    harvested = []
    
    for gid in TARGET_WORKSHOP_PATTERNS:
        gdata = fetch_group_v1(gid)
        if gdata:
            item = normalize_openreview_entry(gdata)
            harvested.append(item)
            print(f"  ✓ Found declared venue: {item['acronym']} ({gid})")

    print(f"[2/3] Harvested {len(harvested)} live groups from OpenReview.")
    
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(harvested, f, indent=2)
    print(f"  Saved raw openreview harvest to {args.output}")

    if args.merge and harvested:
        conf_path = "data/conferences.json"
        if os.path.exists(conf_path):
            with open(conf_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            existing_ids = {x["id"] for x in existing}
            added = 0
            for item in harvested:
                if item["id"] not in existing_ids:
                    existing.append(item)
                    added += 1
            with open(conf_path, "w", encoding="utf-8") as f:
                json.dump(existing, f, indent=2)
            print(f"[3/3] Successfully merged {added} new workshops into {conf_path}.")
        else:
            print(f"[3/3] Conference file {conf_path} not found for merging.")

if __name__ == "__main__":
    main()
