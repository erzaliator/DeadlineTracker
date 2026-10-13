#!/usr/bin/env python3
"""
Seed Catalog Compiler & Pipeline Aggregator
Curated specifically for PhD Research in:
- Transfer Learning & Domain Adaptation
- Multilingual Learning
- Discourse, Pragmatics & Implicature
- Multimodal Benchmarks
- Causal Understanding & Reasoning
- Question Answering (QA) & Question Generation (QG)
- Information Retrieval & Web (KDD, WWW, SIGIR, WSDM, PAKDD, ECIR)
- Computer Vision (CV), Robotics, Representation Learning, Graphs

DEDUPLICATION RULE:
Conferences in Field of Research 4602 (Natural Language Processing) are harvested
directly via scripts/fetch_core.py from the ICORE 2026 portal.
Static seeds below are strictly non-CORE-4602 conferences, systems venues, and workshops.
"""

import json
import os

domains_def = {
  "cv": {
    "name": "Computer Vision (CV)",
    "badgeClass": "badge-cv",
    "color": "#ea580c",
    "desc": "Visual perception, object detection, segmentation, 3D vision, video analysis, vision-language."
  },
  "robotics": {
    "name": "Robotics & Embodied AI",
    "badgeClass": "badge-robotics",
    "color": "#0284c7",
    "desc": "Robot learning, policy optimization, manipulation, embodied agents, simulation-to-real transfer."
  },
  "representation-learning": {
    "name": "Representation Learning",
    "badgeClass": "badge-repr",
    "color": "#9333ea",
    "desc": "Feature learning, self-supervised learning, foundation representations, disentanglement, latent spaces."
  },
  "graphs": {
    "name": "Graphs & GNNs",
    "badgeClass": "badge-graphs",
    "color": "#16a34a",
    "desc": "Graph neural networks, knowledge graphs, link prediction, relational reasoning, topological ML."
  },
  "transfer-learning": {
    "name": "Transfer Learning & Adaptation",
    "badgeClass": "badge-transfer",
    "color": "#4f46e5",
    "desc": "Domain adaptation, parameter-efficient fine-tuning (PEFT), cross-domain transfer, out-of-distribution generalization."
  },
  "multilingual": {
    "name": "Multilingual & Cross-Lingual",
    "badgeClass": "badge-multilingual",
    "color": "#0891b2",
    "desc": "Cross-lingual transfer, low-resource NLP, multilingual benchmarks, machine translation, linguistic typologies."
  },
  "discourse": {
    "name": "Discourse & Pragmatics",
    "badgeClass": "badge-discourse",
    "color": "#7c3aed",
    "desc": "Discourse parsing (RST, PDTB), dialogue coherence, rhetorical structure, conversational flow, Questions under Discussion (QUD)."
  },
  "implicature": {
    "name": "Implicature & Pragmatics",
    "badgeClass": "badge-implicature",
    "color": "#db2777",
    "desc": "Scalar implicature, presupposition, conversational implicature, pragmatic reasoning, natural language inference."
  },
  "multimodal": {
    "name": "Multimodal Benchmarks",
    "badgeClass": "badge-multimodal",
    "color": "#d97706",
    "desc": "Vision-language evaluation benchmarks, multimodal QA, cross-modal alignment, audio-visual understanding."
  },
  "causality": {
    "name": "Causal Understanding",
    "badgeClass": "badge-causality",
    "color": "#059669",
    "desc": "Causal inference in NLP/ML, invariant risk minimization, counterfactual reasoning, causal discovery, shortcut learning mitigations."
  },
  "qa-qg": {
    "name": "QA & Question Generation",
    "badgeClass": "badge-qa",
    "color": "#2563eb",
    "desc": "Extractive & generative QA, multi-hop reasoning, question generation (QG), inquisitive QA, retrieval-augmented generation (RAG)."
  },
  "ir-search": {
    "name": "Information Retrieval & Web",
    "badgeClass": "badge-ir",
    "color": "#0284c7",
    "desc": "Search, dense retrieval, question answering, web mining, knowledge discovery."
  },
  "general-ai-ml": {
    "name": "General AI / Machine Learning",
    "badgeClass": "badge-ml",
    "color": "#0d9488",
    "desc": "Foundation machine learning theory, representation learning, deep generative models, optimization."
  },
  "general-nlp": {
    "name": "General NLP / CL",
    "badgeClass": "badge-nlp",
    "color": "#65a30d",
    "desc": "Computational linguistics, language modeling, parsing, tokenization, semantic representations."
  },
  "cognitive-science": {
    "name": "Cognitive Science",
    "badgeClass": "badge-cogsci",
    "color": "#c026d3",
    "desc": "Human cognitive modeling, psycholinguistics, human reasoning patterns vs neural models."
  }
}

rank_tiers = {
  "A*": {
    "title": "CORE A* (Flagship)",
    "color": "#9333ea",
    "badgeBg": "#f3e8ff",
    "badgeText": "#7e22ce",
    "border": "#d8b4fe",
    "description": "Highest international prestige (top ~4-7%). Low acceptance rates, trendsetting research agendas."
  },
  "A": {
    "title": "CORE A (Excellent)",
    "color": "#dc2626",
    "badgeBg": "#fee2e2",
    "badgeText": "#b91c1c",
    "border": "#fca5a5",
    "description": "Highly competitive and globally respected. Premier credentials for research and careers."
  },
  "B*": {
    "title": "CORE B* (Very Good)",
    "color": "#ea580c",
    "badgeBg": "#ffedd5",
    "badgeText": "#c2410c",
    "border": "#fdba74",
    "description": "Highly reputable and competitive outlet with rigorous peer standards."
  },
  "B": {
    "title": "CORE B (Good / Specialized)",
    "color": "#ca8a04",
    "badgeBg": "#fef9c3",
    "badgeText": "#a16207",
    "border": "#fde047",
    "description": "Respected international outlet. Often specialized in specific subfields or domains."
  },
  "C*": {
    "title": "CORE C* (Recognized)",
    "color": "#16a34a",
    "badgeBg": "#dcfce7",
    "badgeText": "#15803d",
    "border": "#86efac",
    "description": "Solid international venue with peer review standards."
  },
  "C": {
    "title": "CORE C (Standard / Regional)",
    "color": "#78350f",
    "badgeBg": "#f5ebe0",
    "badgeText": "#78350f",
    "border": "#d7ccc8",
    "description": "Peer-reviewed venue with specialized or regional scope."
  },
  "Workshop": {
    "title": "Declared Workshop",
    "color": "#2563eb",
    "badgeBg": "#dbeafe",
    "badgeText": "#1d4ed8",
    "border": "#93c5fd",
    "description": "Specialized venue co-located with top conferences or standalone OpenReview track."
  }
}

# Curated Non-CORE-4602 Seeds (General ML, Vision, Data Mining, Systems, Declared Workshops)
non_core_seeds = [
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
      "multimodal",
      "representation-learning",
      "causality",
      "robotics"
    ],
    "tags": [
      "Representation Learning",
      "Transfer Learning",
      "Multimodal",
      "Causal ML",
      "Robotics"
    ],
    "abstractDeadline": "2026-05-15T23:59:59-12:00",
    "deadline": "2026-05-22T23:59:59-12:00",
    "reviewsReleased": "2026-08-05T23:59:59-12:00",
    "notification": "2026-09-25T23:59:59-12:00",
    "cameraReady": "2026-10-25T23:59:59-12:00",
    "conferenceDates": "2026-12-06 to 2026-12-12",
    "location": "Sydney, Australia",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://neurips.cc/Conferences/2026",
    "website": "https://neurips.cc",
    "notes": "Includes primary track and dedicated Datasets & Benchmarks track."
  },
  {
    "id": "iclr-2027",
    "acronym": "ICLR 2027",
    "name": "International Conference on Learning Representations",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 272,
      "acceptanceRate": "30.8%"
    },
    "domains": [
      "representation-learning",
      "transfer-learning",
      "multimodal",
      "causality",
      "general-ai-ml"
    ],
    "tags": [
      "Representation Learning",
      "Transfer Learning",
      "Causal Representations"
    ],
    "abstractDeadline": "2026-09-18T23:59:59-12:00",
    "deadline": "2026-09-25T23:59:59-12:00",
    "reviewsReleased": "2026-11-10T23:59:59-12:00",
    "notification": "2027-01-22T23:59:59-12:00",
    "cameraReady": "2027-03-05T23:59:59-12:00",
    "conferenceDates": "2027-04-26 to 2027-04-30",
    "location": "California, USA",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://iclr.cc/Conferences/2027/CallForPapers",
    "website": "https://iclr.cc",
    "notes": "Premier venue for representation learning, foundation model transfer, and multimodal reasoning."
  },
  {
    "id": "icml-2027",
    "acronym": "ICML 2027",
    "name": "International Conference on Machine Learning",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 224,
      "acceptanceRate": "27.5%"
    },
    "domains": [
      "general-ai-ml",
      "transfer-learning",
      "representation-learning",
      "causality"
    ],
    "tags": [
      "Representation Learning",
      "Domain Adaptation",
      "Transfer Learning",
      "Causal ML"
    ],
    "abstractDeadline": "2027-01-16T23:59:59-12:00",
    "deadline": "2027-01-22T23:59:59-12:00",
    "reviewsReleased": "2027-03-24T23:59:59-12:00",
    "notification": "2027-05-02T23:59:59-12:00",
    "cameraReady": "2027-06-08T23:59:59-12:00",
    "conferenceDates": "2027-07-11 to 2027-07-17",
    "location": "Seoul, South Korea",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://icml.cc",
    "website": "https://icml.cc",
    "notes": "Core venue for machine learning theory, domain adaptation, and invariant representation learning."
  },
  {
    "id": "cvpr-2027",
    "acronym": "CVPR 2027",
    "name": "IEEE/CVF Conference on Computer Vision and Pattern Recognition",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 356,
      "acceptanceRate": "23.6%"
    },
    "domains": [
      "cv",
      "multimodal",
      "representation-learning",
      "qa-qg",
      "robotics"
    ],
    "tags": [
      "CV",
      "Multimodal",
      "Representation Learning",
      "VQA",
      "Robotics"
    ],
    "abstractDeadline": "2026-11-04T23:59:59-12:00",
    "deadline": "2026-11-11T23:59:59-12:00",
    "reviewsReleased": "2027-01-20T23:59:59-12:00",
    "notification": "2027-02-26T23:59:59-12:00",
    "cameraReady": "2027-04-05T23:59:59-12:00",
    "conferenceDates": "2027-06-19 to 2027-06-26",
    "location": "Seattle, WA, USA",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview / CMT",
    "portalUrl": "https://cvpr.thecvf.com/",
    "website": "https://cvpr.thecvf.com",
    "notes": "Top computer vision and multimodal conference worldwide (h5-index: 356)."
  },
  {
    "id": "iccv-2027",
    "acronym": "ICCV 2027",
    "name": "IEEE/CVF International Conference on Computer Vision",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 239,
      "acceptanceRate": "25.8%"
    },
    "domains": [
      "cv",
      "multimodal",
      "representation-learning"
    ],
    "tags": [
      "CV",
      "Multimodal",
      "Representation Learning"
    ],
    "abstractDeadline": "2027-03-03T23:59:59-12:00",
    "deadline": "2027-03-10T23:59:59-12:00",
    "reviewsReleased": "2027-05-15T23:59:59-12:00",
    "notification": "2027-07-02T23:59:59-12:00",
    "cameraReady": "2027-08-10T23:59:59-12:00",
    "conferenceDates": "2027-10-02 to 2027-10-08",
    "location": "Hong Kong",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview / CMT",
    "portalUrl": "https://www.thecvf.com/",
    "website": "https://thecvf.com",
    "notes": "Premier biennial vision conference alternating with ECCV."
  },
  {
    "id": "eccv-2026",
    "acronym": "ECCV 2026",
    "name": "European Conference on Computer Vision",
    "type": "conference",
    "edition": "2026",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "B",
      "h5Index": 185,
      "acceptanceRate": "27.0%"
    },
    "domains": [
      "cv",
      "multimodal",
      "representation-learning"
    ],
    "tags": [
      "CV",
      "Multimodal",
      "Representation Learning"
    ],
    "abstractDeadline": "2026-02-27T23:59:59-12:00",
    "deadline": "2026-03-06T23:59:59-12:00",
    "reviewsReleased": "2026-05-20T23:59:59-12:00",
    "notification": "2026-07-01T23:59:59-12:00",
    "cameraReady": "2026-07-25T23:59:59-12:00",
    "conferenceDates": "2026-09-08 to 2026-09-13",
    "location": "Malm\u00f6, Sweden",
    "timezone": "AoE UTC-12",
    "portal": "CMT",
    "portalUrl": "https://eccv.ecva.net/Conferences/2026",
    "website": "https://eccv.ecva.net",
    "notes": "Premier European biennial computer vision conference."
  },
  {
    "id": "kdd-2027",
    "acronym": "KDD 2027 (SIGKDD)",
    "name": "ACM SIGKDD Conference on Knowledge Discovery and Data Mining",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 125,
      "acceptanceRate": "19.8%"
    },
    "domains": [
      "ir-search",
      "graphs",
      "transfer-learning",
      "causality"
    ],
    "tags": [
      "Graphs",
      "Data Mining",
      "Transfer Learning",
      "Causal Discovery"
    ],
    "abstractDeadline": "2027-01-26T23:59:59-12:00",
    "deadline": "2027-02-02T23:59:59-12:00",
    "reviewsReleased": "2027-04-10T23:59:59-12:00",
    "notification": "2027-05-16T23:59:59-12:00",
    "cameraReady": "2027-06-15T23:59:59-12:00",
    "conferenceDates": "2027-08-08 to 2027-08-12",
    "location": "San Jose, California, USA",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview / CMT",
    "portalUrl": "https://kdd2027.kdd.org/",
    "website": "https://kdd.org",
    "notes": "Flagship conference in knowledge discovery, transfer learning across graph structures, and data mining."
  },
  {
    "id": "thewebconf-2027",
    "acronym": "TheWebConf 2027 (WWW)",
    "name": "The Web Conference (formerly International World Wide Web Conference)",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 128,
      "acceptanceRate": "20.2%"
    },
    "domains": [
      "ir-search",
      "qa-qg",
      "causality",
      "graphs",
      "multimodal"
    ],
    "tags": [
      "Web QA",
      "Graphs",
      "Causal Web Mining",
      "Multimodal"
    ],
    "abstractDeadline": "2026-10-07T23:59:59-12:00",
    "deadline": "2026-10-14T23:59:59-12:00",
    "reviewsReleased": "2026-12-15T23:59:59-12:00",
    "notification": "2027-01-25T23:59:59-12:00",
    "cameraReady": "2027-02-28T23:59:59-12:00",
    "conferenceDates": "2027-04-19 to 2027-04-23",
    "location": "Sydney, Australia",
    "timezone": "AoE UTC-12",
    "portal": "EasyChair / OpenReview",
    "portalUrl": "https://www2027.thewebconf.org",
    "website": "https://thewebconf.org",
    "notes": "Premier venue for web-scale Question Answering, knowledge graphs, and causal mining."
  },
  {
    "id": "sigir-2027",
    "acronym": "SIGIR 2027",
    "name": "ACM SIGIR Conference on Research and Development in Information Retrieval",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 108,
      "acceptanceRate": "21.1%"
    },
    "domains": [
      "ir-search",
      "qa-qg",
      "transfer-learning",
      "multimodal"
    ],
    "tags": [
      "Question Answering",
      "Dense Retrieval",
      "Search",
      "Question Generation"
    ],
    "abstractDeadline": "2027-01-18T23:59:59-12:00",
    "deadline": "2027-01-25T23:59:59-12:00",
    "reviewsReleased": "2027-03-20T23:59:59-12:00",
    "notification": "2027-04-14T23:59:59-12:00",
    "cameraReady": "2027-05-15T23:59:59-12:00",
    "conferenceDates": "2027-07-11 to 2027-07-15",
    "location": "Taipei, Taiwan",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview / EasyChair",
    "portalUrl": "https://sigir.org/sigir2027",
    "website": "https://sigir.org",
    "notes": "Gold standard for question answering systems, generative retrieval, and domain transfer in search."
  },
  {
    "id": "wsdm-2027",
    "acronym": "WSDM 2027",
    "name": "ACM International Conference on Web Search and Data Mining",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "B",
      "h5Index": 66,
      "acceptanceRate": "18.5%"
    },
    "domains": [
      "ir-search",
      "qa-qg",
      "transfer-learning",
      "graphs"
    ],
    "tags": [
      "Web Search",
      "Conversational QA",
      "Data Mining",
      "Graphs"
    ],
    "abstractDeadline": "2026-08-17T23:59:59-12:00",
    "deadline": "2026-08-24T23:59:59-12:00",
    "reviewsReleased": "2026-10-18T23:59:59-12:00",
    "notification": "2026-11-06T23:59:59-12:00",
    "cameraReady": "2026-12-05T23:59:59-12:00",
    "conferenceDates": "2027-02-15 to 2027-02-19",
    "location": "Hong Kong SAR, China",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview / EasyChair",
    "portalUrl": "https://wsdm-conference.org/2027/",
    "website": "https://www.wsdm-conference.org",
    "notes": "Highly selective search and data mining venue. Excellent for conversational question answering."
  },
  {
    "id": "icdm-2026",
    "acronym": "ICDM 2026",
    "name": "IEEE International Conference on Data Mining",
    "type": "conference",
    "edition": "2026",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "B",
      "h5Index": 75,
      "acceptanceRate": "19.5%"
    },
    "domains": [
      "ir-search",
      "graphs",
      "general-ai-ml"
    ],
    "tags": [
      "Data Mining",
      "Graphs",
      "Knowledge Discovery"
    ],
    "abstractDeadline": "2026-05-29T23:59:59-12:00",
    "deadline": "2026-06-05T23:59:59-12:00",
    "reviewsReleased": "2026-08-10T23:59:59-12:00",
    "notification": "2026-09-01T23:59:59-12:00",
    "cameraReady": "2026-09-25T23:59:59-12:00",
    "conferenceDates": "2026-11-12 to 2026-11-15",
    "location": "Shenyang, China",
    "timezone": "AoE UTC-12",
    "portal": "CyberChair",
    "portalUrl": "http://icdm2026.neu.edu.cn/",
    "website": "http://icdm2026.neu.edu.cn/",
    "notes": "Leading IEEE conference on data mining and graph analytics."
  },
  {
    "id": "icse-2027",
    "acronym": "ICSE 2027",
    "name": "International Conference on Software Engineering",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 89,
      "acceptanceRate": "21.0%"
    },
    "domains": [
      "general-ai-ml",
      "qa-qg"
    ],
    "tags": [
      "Software Engineering",
      "AI for Code",
      "Automated QA"
    ],
    "abstractDeadline": "2026-06-23T23:59:59-12:00",
    "deadline": "2026-06-30T23:59:59-12:00",
    "reviewsReleased": "2026-09-15T23:59:59-12:00",
    "notification": "2026-11-10T23:59:59-12:00",
    "cameraReady": "2027-01-15T23:59:59-12:00",
    "conferenceDates": "2027-04-25 to 2027-05-01",
    "location": "Dublin, Ireland",
    "timezone": "AoE UTC-12",
    "portal": "Researchr",
    "portalUrl": "https://conf.researchr.org/dates/icse-2027",
    "website": "https://conf.researchr.org",
    "notes": "Flagship international software engineering conference."
  },
  {
    "id": "ase-2026",
    "acronym": "ASE 2026",
    "name": "IEEE/ACM International Conference on Automated Software Engineering",
    "type": "conference",
    "edition": "2026",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 58,
      "acceptanceRate": "22.5%"
    },
    "domains": [
      "general-ai-ml",
      "qa-qg"
    ],
    "tags": [
      "Automated Reasoning",
      "AI for Code"
    ],
    "abstractDeadline": "2026-05-23T23:59:59-12:00",
    "deadline": "2026-05-30T23:59:59-12:00",
    "reviewsReleased": "2026-08-01T23:59:59-12:00",
    "notification": "2026-08-25T23:59:59-12:00",
    "cameraReady": "2026-09-20T23:59:59-12:00",
    "conferenceDates": "2026-11-16 to 2026-11-20",
    "location": "Seoul, South Korea",
    "timezone": "AoE UTC-12",
    "portal": "Researchr",
    "portalUrl": "https://conf.researchr.org/home/ase-2026",
    "website": "https://conf.researchr.org",
    "notes": "Top venue for automated reasoning and software analytics."
  },
  {
    "id": "sc-2026",
    "acronym": "SC 2026",
    "name": "International Conference for High Performance Computing, Networking, Storage and Analysis",
    "type": "conference",
    "edition": "2026",
    "coreRank": "A*",
    "otherRanks": {
      "ccf": "A",
      "h5Index": 64,
      "acceptanceRate": "23.0%"
    },
    "domains": [
      "general-ai-ml"
    ],
    "tags": [
      "High Performance Computing",
      "Distributed ML"
    ],
    "abstractDeadline": "2026-04-01T23:59:59-12:00",
    "deadline": "2026-04-08T23:59:59-12:00",
    "reviewsReleased": "2026-06-15T23:59:59-12:00",
    "notification": "2026-07-01T23:59:59-12:00",
    "cameraReady": "2026-08-15T23:59:59-12:00",
    "conferenceDates": "2026-11-15 to 2026-11-20",
    "location": "Chicago, IL, USA",
    "timezone": "AoE UTC-12",
    "portal": "Linklings",
    "portalUrl": "https://sc26.supercomputing.org/",
    "website": "https://sc26.supercomputing.org/",
    "notes": "Premier venue in high performance computing and large-scale AI infrastructure."
  },
  {
    "id": "clear-2027",
    "acronym": "CLeaR 2027",
    "name": "Conference on Causal Learning and Reasoning",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A",
    "otherRanks": {
      "ccf": "Unranked",
      "h5Index": 42,
      "acceptanceRate": "26.0%"
    },
    "domains": [
      "causality",
      "representation-learning",
      "transfer-learning",
      "general-ai-ml"
    ],
    "tags": [
      "Causal ML",
      "Causal Discovery",
      "Representation Learning"
    ],
    "abstractDeadline": "2026-10-20T23:59:59-12:00",
    "deadline": "2026-10-27T23:59:59-12:00",
    "reviewsReleased": "2026-12-18T23:59:59-12:00",
    "notification": "2027-01-25T23:59:59-12:00",
    "cameraReady": "2027-03-01T23:59:59-12:00",
    "conferenceDates": "2027-04-10 to 2027-04-13",
    "location": "T\u00fcbingen, Germany",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://openreview.net/group?id=cclear.cc/2027/Conference",
    "website": "https://www.cclear.cc",
    "notes": "The premier conference specifically founded for causality in machine learning."
  },
  {
    "id": "pakdd-2027",
    "acronym": "PAKDD 2027",
    "name": "Pacific-Asia Conference on Knowledge Discovery and Data Mining",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A",
    "otherRanks": {
      "ccf": "C",
      "h5Index": 44,
      "acceptanceRate": "24.0%"
    },
    "domains": [
      "ir-search",
      "graphs",
      "transfer-learning",
      "causality"
    ],
    "tags": [
      "Data Mining",
      "Graphs",
      "Domain Adaptation"
    ],
    "abstractDeadline": "2026-11-15T23:59:59-12:00",
    "deadline": "2026-11-22T23:59:59-12:00",
    "reviewsReleased": "2027-01-15T23:59:59-12:00",
    "notification": "2027-02-05T23:59:59-12:00",
    "cameraReady": "2027-03-01T23:59:59-12:00",
    "conferenceDates": "2027-05-25 to 2027-05-28",
    "location": "Auckland, New Zealand",
    "timezone": "AoE UTC-12",
    "portal": "CMT / OpenReview",
    "portalUrl": "https://pakdd2027.org",
    "website": "https://pakdd2027.org",
    "notes": "Premier Asia-Pacific venue for data mining, domain adaptation, and knowledge discovery."
  },
  {
    "id": "ecml-pkdd-2027",
    "acronym": "ECML-PKDD 2027",
    "name": "European Conference on Machine Learning and Principles and Practice of Knowledge Discovery in Databases",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A",
    "otherRanks": {
      "ccf": "B",
      "h5Index": 56,
      "acceptanceRate": "25.0%"
    },
    "domains": [
      "general-ai-ml",
      "ir-search",
      "graphs",
      "representation-learning"
    ],
    "tags": [
      "Machine Learning",
      "Graphs",
      "Representation Learning"
    ],
    "abstractDeadline": "2027-03-15T23:59:59-12:00",
    "deadline": "2027-03-22T23:59:59-12:00",
    "reviewsReleased": "2027-05-20T23:59:59-12:00",
    "notification": "2027-06-15T23:59:59-12:00",
    "cameraReady": "2027-07-10T23:59:59-12:00",
    "conferenceDates": "2027-09-13 to 2027-09-17",
    "location": "Dortmund, Germany",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview / CMT",
    "portalUrl": "https://ecmlpkdd.org",
    "website": "https://ecmlpkdd.org",
    "notes": "The flagship European machine learning and data mining conference."
  },
  {
    "id": "miccai-2027",
    "acronym": "MICCAI 2027",
    "name": "Medical Image Computing and Computer Assisted Intervention",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A",
    "otherRanks": {
      "ccf": "B",
      "h5Index": 74,
      "acceptanceRate": "28.0%"
    },
    "domains": [
      "cv",
      "multimodal",
      "representation-learning"
    ],
    "tags": [
      "CV",
      "Multimodal",
      "Medical AI"
    ],
    "abstractDeadline": "2027-02-19T23:59:59-12:00",
    "deadline": "2027-02-26T23:59:59-12:00",
    "reviewsReleased": "2027-04-20T23:59:59-12:00",
    "notification": "2027-05-28T23:59:59-12:00",
    "cameraReady": "2027-06-25T23:59:59-12:00",
    "conferenceDates": "2027-09-26 to 2027-10-01",
    "location": "Auckland, New Zealand",
    "timezone": "AoE UTC-12",
    "portal": "MICCAI Portal",
    "portalUrl": "https://miccai.org/upcoming-conferences/",
    "website": "https://miccai.org",
    "notes": "Leading international conference on biomedical multimodal representation learning."
  },
  {
    "id": "ipdps-2027",
    "acronym": "IPDPS 2027",
    "name": "IEEE International Parallel and Distributed Processing Symposium",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A",
    "otherRanks": {
      "ccf": "B",
      "h5Index": 49,
      "acceptanceRate": "25.0%"
    },
    "domains": [
      "general-ai-ml"
    ],
    "tags": [
      "Parallel Computing",
      "Distributed AI"
    ],
    "abstractDeadline": "2026-10-01T23:59:59-12:00",
    "deadline": "2026-10-08T23:59:59-12:00",
    "reviewsReleased": "2026-12-10T23:59:59-12:00",
    "notification": "2027-01-05T23:59:59-12:00",
    "cameraReady": "2027-02-15T23:59:59-12:00",
    "conferenceDates": "2027-06-01 to 2027-06-05",
    "location": "Seattle, WA, USA",
    "timezone": "AoE UTC-12",
    "portal": "Linklings",
    "portalUrl": "http://www.ipdps.org/ipdps2027/2027-call-for-papers.html",
    "website": "http://www.ipdps.org",
    "notes": "Premier forum for parallel and distributed computing."
  },
  {
    "id": "ecir-2027",
    "acronym": "ECIR 2027",
    "name": "European Conference on Information Retrieval",
    "type": "conference",
    "edition": "2027",
    "coreRank": "A",
    "otherRanks": {
      "ccf": "C",
      "h5Index": 42,
      "acceptanceRate": "26.5%"
    },
    "domains": [
      "ir-search",
      "qa-qg",
      "transfer-learning",
      "multilingual"
    ],
    "tags": [
      "Search",
      "Question Answering",
      "Cross-lingual Search"
    ],
    "abstractDeadline": "2026-10-05T23:59:59-12:00",
    "deadline": "2026-10-12T23:59:59-12:00",
    "reviewsReleased": "2026-11-28T23:59:59-12:00",
    "notification": "2026-12-18T23:59:59-12:00",
    "cameraReady": "2027-01-20T23:59:59-12:00",
    "conferenceDates": "2027-03-28 to 2027-04-01",
    "location": "Bologna, Italy",
    "timezone": "AoE UTC-12",
    "portal": "EasyChair",
    "portalUrl": "https://ecir2027.org",
    "website": "https://ecir2027.org",
    "notes": "Leading European information retrieval conference with deep coverage of question answering."
  },
  {
    "id": "wacv-2027",
    "acronym": "WACV 2027",
    "name": "IEEE/CVF Winter Conference on Applications of Computer Vision",
    "type": "conference",
    "edition": "2027",
    "coreRank": "B*",
    "otherRanks": {
      "ccf": "C",
      "h5Index": 78,
      "acceptanceRate": "29.0%"
    },
    "domains": [
      "cv",
      "multimodal",
      "representation-learning"
    ],
    "tags": [
      "CV",
      "Multimodal",
      "Vision Applications"
    ],
    "abstractDeadline": "2026-06-17T23:59:59-12:00",
    "deadline": "2026-06-24T23:59:59-12:00",
    "reviewsReleased": "2026-08-20T23:59:59-12:00",
    "notification": "2026-09-15T23:59:59-12:00",
    "cameraReady": "2026-10-15T23:59:59-12:00",
    "conferenceDates": "2027-01-04 to 2027-01-08",
    "location": "Disney Springs, Buena Vista, FL, USA",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview / CMT",
    "portalUrl": "https://wacv.thecvf.com/Conferences/2027",
    "website": "https://wacv.thecvf.com",
    "notes": "Premier winter computer vision application conference with two-round review."
  },
  {
    "id": "mlsys-2027",
    "acronym": "MLSys 2027",
    "name": "Conference on Machine Learning and Systems",
    "type": "conference",
    "edition": "2027",
    "coreRank": "B*",
    "otherRanks": {
      "ccf": "Unranked",
      "h5Index": 61,
      "acceptanceRate": "21.0%"
    },
    "domains": [
      "general-ai-ml",
      "transfer-learning"
    ],
    "tags": [
      "ML Systems",
      "Efficient AI"
    ],
    "abstractDeadline": "2026-10-23T23:59:59-12:00",
    "deadline": "2026-10-30T23:59:59-12:00",
    "reviewsReleased": "2027-01-10T23:59:59-12:00",
    "notification": "2027-02-15T23:59:59-12:00",
    "cameraReady": "2027-03-20T23:59:59-12:00",
    "conferenceDates": "2027-05-17 to 2027-05-22",
    "location": "Bellevue, WA, USA",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://mlsys.org/Conferences/2027",
    "website": "https://mlsys.org",
    "notes": "Premier conference at the intersection of systems and machine learning."
  },
  {
    "id": "icassp-2027",
    "acronym": "ICASSP 2027",
    "name": "IEEE International Conference on Acoustics, Speech and Signal Processing",
    "type": "conference",
    "edition": "2027",
    "coreRank": "B*",
    "otherRanks": {
      "ccf": "B",
      "h5Index": 110,
      "acceptanceRate": "33.0%"
    },
    "domains": [
      "multimodal",
      "general-nlp",
      "representation-learning"
    ],
    "tags": [
      "Speech",
      "Audio-Visual",
      "Representation Learning"
    ],
    "abstractDeadline": "2026-09-08T23:59:59-12:00",
    "deadline": "2026-09-15T23:59:59-12:00",
    "reviewsReleased": "2026-11-20T23:59:59-12:00",
    "notification": "2026-12-18T23:59:59-12:00",
    "cameraReady": "2027-01-25T23:59:59-12:00",
    "conferenceDates": "2027-05-09 to 2027-05-14",
    "location": "Hyderabad, India",
    "timezone": "AoE UTC-12",
    "portal": "IEEE CMS",
    "portalUrl": "https://2027.ieeeicassp.org/",
    "website": "https://ieeeicassp.org",
    "notes": "Flagship signal processing and multimodal speech representation conference."
  },
  {
    "id": "dasfaa-2027",
    "acronym": "DASFAA 2027",
    "name": "International Conference on Database Systems for Advanced Applications",
    "type": "conference",
    "edition": "2027",
    "coreRank": "B",
    "otherRanks": {
      "ccf": "B",
      "h5Index": 35,
      "acceptanceRate": "26.0%"
    },
    "domains": [
      "ir-search",
      "graphs",
      "qa-qg"
    ],
    "tags": [
      "Databases",
      "Knowledge Graphs",
      "Information Retrieval"
    ],
    "abstractDeadline": "2026-11-10T23:59:59-12:00",
    "deadline": "2026-11-17T23:59:59-12:00",
    "reviewsReleased": "2027-01-10T23:59:59-12:00",
    "notification": "2027-01-28T23:59:59-12:00",
    "cameraReady": "2027-02-25T23:59:59-12:00",
    "conferenceDates": "2027-04-19 to 2027-04-22",
    "location": "Fukuoka, Japan",
    "timezone": "AoE UTC-12",
    "portal": "EasyChair",
    "portalUrl": "https://dasfaa2027.org",
    "website": "https://dasfaa.org",
    "notes": "Prestigious database and knowledge discovery venue in the Asia-Pacific region."
  },
  {
    "id": "ijcnn-2027",
    "acronym": "IJCNN 2027",
    "name": "International Joint Conference on Neural Networks",
    "type": "conference",
    "edition": "2027",
    "coreRank": "B",
    "otherRanks": {
      "ccf": "C",
      "h5Index": 55,
      "acceptanceRate": "33.0%"
    },
    "domains": [
      "general-ai-ml",
      "representation-learning"
    ],
    "tags": [
      "Neural Networks",
      "Representation Learning"
    ],
    "abstractDeadline": "2026-12-10T23:59:59-12:00",
    "deadline": "2026-12-15T23:59:59-12:00",
    "reviewsReleased": "2027-02-15T23:59:59-12:00",
    "notification": "2027-03-10T23:59:59-12:00",
    "cameraReady": "2027-04-15T23:59:59-12:00",
    "conferenceDates": "2027-07-18 to 2027-07-23",
    "location": "Rome, Italy",
    "timezone": "AoE UTC-12",
    "portal": "IEEE WCCI / IJCNN Portal",
    "portalUrl": "https://ijcnn.org",
    "website": "https://ijcnn.org",
    "notes": "Premier neural network conference under the IEEE Computational Intelligence Society."
  },
  {
    "id": "star-sem-2027",
    "acronym": "*SEM 2027",
    "name": "Joint Conference on Lexical and Computational Semantics",
    "type": "conference",
    "edition": "2027",
    "coreRank": "B",
    "otherRanks": {
      "ccf": "C",
      "h5Index": 38,
      "acceptanceRate": "27.0%"
    },
    "domains": [
      "implicature",
      "discourse",
      "causality",
      "general-nlp"
    ],
    "tags": [
      "Computational Semantics",
      "Pragmatic Implicature",
      "Presupposition"
    ],
    "abstractDeadline": "2027-02-10T23:59:59-12:00",
    "deadline": "2027-02-18T23:59:59-12:00",
    "reviewsReleased": "2027-04-05T23:59:59-12:00",
    "notification": "2027-04-28T23:59:59-12:00",
    "cameraReady": "2027-05-18T23:59:59-12:00",
    "conferenceDates": "2027-07-09 to 2027-07-10",
    "location": "Co-located with ACL 2027",
    "timezone": "AoE UTC-12",
    "portal": "Softconf START",
    "portalUrl": "https://starsem.org",
    "website": "https://starsem.org",
    "notes": "Dedicated venue for compositional semantics, pragmatic implicature, and formal nuance."
  },
  {
    "id": "nlpcc-2026",
    "acronym": "NLPCC 2026",
    "name": "Conference on Natural Language Processing and Chinese Computing",
    "type": "conference",
    "edition": "2026",
    "coreRank": "C*",
    "otherRanks": {
      "ccf": "C",
      "h5Index": 36,
      "acceptanceRate": "28.0%"
    },
    "domains": [
      "general-nlp",
      "multilingual",
      "qa-qg"
    ],
    "tags": [
      "Multilingual",
      "Question Answering",
      "Chinese NLP"
    ],
    "abstractDeadline": "2026-05-10T23:59:59-12:00",
    "deadline": "2026-05-18T23:59:59-12:00",
    "reviewsReleased": "2026-07-05T23:59:59-12:00",
    "notification": "2026-07-25T23:59:59-12:00",
    "cameraReady": "2026-08-15T23:59:59-12:00",
    "conferenceDates": "2026-10-16 to 2026-10-18",
    "location": "Hangzhou, China",
    "timezone": "AoE UTC-12",
    "portal": "Softconf",
    "portalUrl": "http://tcci.ccf.org.cn/conference/2026/",
    "website": "http://tcci.ccf.org.cn/conference/2026/",
    "notes": "Leading venue for multilingual NLP and Chinese language computation."
  },
  {
    "id": "ws-semeval-2027",
    "acronym": "SemEval 2027",
    "name": "International Workshop on Semantic Evaluation (Co-located with ACL 2027)",
    "type": "workshop",
    "edition": "2027",
    "coreRank": "Workshop",
    "otherRanks": {
      "ccf": "Co-located A*",
      "h5Index": 65,
      "acceptanceRate": "Shared Tasks"
    },
    "domains": [
      "implicature",
      "discourse",
      "causality",
      "qa-qg",
      "multilingual"
    ],
    "tags": [
      "Semantic Evaluation",
      "Scalar Implicature",
      "Causal Reasoning Tasks"
    ],
    "abstractDeadline": "2027-02-15T23:59:59-12:00",
    "deadline": "2027-02-28T23:59:59-12:00",
    "reviewsReleased": "2027-04-02T23:59:59-12:00",
    "notification": "2027-04-18T23:59:59-12:00",
    "cameraReady": "2027-05-10T23:59:59-12:00",
    "conferenceDates": "2027-08-21 to 2027-08-22",
    "location": "Kyoto, Japan (at ACL 2027)",
    "timezone": "AoE UTC-12",
    "portal": "Softconf / OpenReview",
    "portalUrl": "https://semeval.github.io",
    "website": "https://semeval.github.io",
    "notes": "Standard benchmarking venue for semantic inference, scalar implicature, and causal classification."
  },
  {
    "id": "ws-causality-nlp-2026",
    "acronym": "CI-NLP 2026",
    "name": "Workshop on Causal Inference and Natural Language Processing (at EMNLP 2026)",
    "type": "workshop",
    "edition": "2026",
    "coreRank": "Workshop",
    "otherRanks": {
      "ccf": "Co-located A*",
      "h5Index": 28,
      "acceptanceRate": "35.0%"
    },
    "domains": [
      "causality",
      "transfer-learning",
      "discourse"
    ],
    "tags": [
      "Causal ML",
      "Counterfactuals",
      "Spurious Shortcuts"
    ],
    "abstractDeadline": "2026-08-20T23:59:59-12:00",
    "deadline": "2026-08-28T23:59:59-12:00",
    "reviewsReleased": "2026-09-28T23:59:59-12:00",
    "notification": "2026-10-06T23:59:59-12:00",
    "cameraReady": "2026-10-18T23:59:59-12:00",
    "conferenceDates": "2026-10-29",
    "location": "Budapest, Hungary (at EMNLP 2026)",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://causalnlp.github.io",
    "website": "https://causalnlp.github.io",
    "notes": "Premier workshop on bridging causal inference with NLP to mitigate shortcut learning."
  },
  {
    "id": "ws-mrl-2026",
    "acronym": "MRL 2026",
    "name": "Multimodal Representation Learning Workshop (at EMNLP 2026)",
    "type": "workshop",
    "edition": "2026",
    "coreRank": "Workshop",
    "otherRanks": {
      "ccf": "Co-located A*",
      "h5Index": 35,
      "acceptanceRate": "32.0%"
    },
    "domains": [
      "multimodal",
      "representation-learning",
      "transfer-learning",
      "qa-qg"
    ],
    "tags": [
      "Multimodal",
      "Representation Learning",
      "VQA"
    ],
    "abstractDeadline": "2026-08-15T23:59:59-12:00",
    "deadline": "2026-08-25T23:59:59-12:00",
    "reviewsReleased": "2026-09-25T23:59:59-12:00",
    "notification": "2026-10-05T23:59:59-12:00",
    "cameraReady": "2026-10-15T23:59:59-12:00",
    "conferenceDates": "2026-10-29",
    "location": "Budapest, Hungary (at EMNLP 2026)",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://mrl-workshop.github.io",
    "website": "https://mrl-workshop.github.io",
    "notes": "Targeted venue for multimodal foundation models and cross-modality transfer."
  },
  {
    "id": "ws-repl4nlp-2027",
    "acronym": "RepL4NLP 2027",
    "name": "Workshop on Representation Learning for NLP (at ACL 2027)",
    "type": "workshop",
    "edition": "2027",
    "coreRank": "Workshop",
    "otherRanks": {
      "ccf": "Co-located A*",
      "h5Index": 42,
      "acceptanceRate": "30.0%"
    },
    "domains": [
      "representation-learning",
      "transfer-learning",
      "multilingual",
      "discourse"
    ],
    "tags": [
      "Representation Learning",
      "Transfer Learning",
      "In-Context Learning"
    ],
    "abstractDeadline": "2027-04-01T23:59:59-12:00",
    "deadline": "2027-04-10T23:59:59-12:00",
    "reviewsReleased": "2027-05-08T23:59:59-12:00",
    "notification": "2027-05-18T23:59:59-12:00",
    "cameraReady": "2027-05-30T23:59:59-12:00",
    "conferenceDates": "2027-08-21",
    "location": "Kyoto, Japan (at ACL 2027)",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://sites.google.com/view/repl4nlp-2027",
    "website": "https://sites.google.com/view/repl4nlp-2027",
    "notes": "Dedicated representation learning workshop with heavy emphasis on zero-shot transfer."
  },
  {
    "id": "ws-disrpt-2027",
    "acronym": "DisRPT 2027",
    "name": "Workshop on Discourse Relation Parsing and Treebanking",
    "type": "workshop",
    "edition": "2027",
    "coreRank": "Workshop",
    "otherRanks": {
      "ccf": "Co-located A",
      "h5Index": 22,
      "acceptanceRate": "38.0%"
    },
    "domains": [
      "discourse",
      "implicature",
      "multilingual"
    ],
    "tags": [
      "Discourse",
      "RST",
      "PDTB",
      "Pragmatics"
    ],
    "abstractDeadline": "2027-02-20T23:59:59-12:00",
    "deadline": "2027-03-01T23:59:59-12:00",
    "reviewsReleased": "2027-04-10T23:59:59-12:00",
    "notification": "2027-04-25T23:59:59-12:00",
    "cameraReady": "2027-05-15T23:59:59-12:00",
    "conferenceDates": "2027-08-21",
    "location": "Kyoto, Japan (at ACL 2027)",
    "timezone": "AoE UTC-12",
    "portal": "Softconf",
    "portalUrl": "https://disrpt.github.io",
    "website": "https://disrpt.github.io",
    "notes": "The primary international forum for discourse structure parsing across languages (RST, PDTB)."
  },
  {
    "id": "ws-americas-nlp-2027",
    "acronym": "AmericasNLP 2027",
    "name": "Workshop on NLP for Indigenous and Low-Resource Languages of the Americas (at NAACL 2027)",
    "type": "workshop",
    "edition": "2027",
    "coreRank": "Workshop",
    "otherRanks": {
      "ccf": "Co-located A*",
      "h5Index": 20,
      "acceptanceRate": "40.0%"
    },
    "domains": [
      "multilingual",
      "transfer-learning",
      "qa-qg"
    ],
    "tags": [
      "Multilingual",
      "Low-Resource",
      "Transfer Learning"
    ],
    "abstractDeadline": "2027-02-05T23:59:59-12:00",
    "deadline": "2027-02-15T23:59:59-12:00",
    "reviewsReleased": "2027-03-15T23:59:59-12:00",
    "notification": "2027-03-25T23:59:59-12:00",
    "cameraReady": "2027-04-10T23:59:59-12:00",
    "conferenceDates": "2027-06-05",
    "location": "San Francisco, USA (at NAACL 2027)",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://americasnlp.github.io",
    "website": "https://americasnlp.github.io",
    "notes": "Specializes in cross-lingual transfer learning for low-resource languages."
  },
  {
    "id": "ws-causal-ml-neurips-2026",
    "acronym": "CausalML @ NeurIPS",
    "name": "NeurIPS Workshop on Causality and Machine Learning 2026",
    "type": "workshop",
    "edition": "2026",
    "coreRank": "Workshop",
    "otherRanks": {
      "ccf": "Co-located A*",
      "h5Index": 36,
      "acceptanceRate": "33.0%"
    },
    "domains": [
      "causality",
      "representation-learning",
      "transfer-learning",
      "multimodal"
    ],
    "tags": [
      "Causal ML",
      "Representation Learning",
      "Out-of-Distribution"
    ],
    "abstractDeadline": "2026-09-10T23:59:59-12:00",
    "deadline": "2026-09-18T23:59:59-12:00",
    "reviewsReleased": "2026-10-15T23:59:59-12:00",
    "notification": "2026-10-24T23:59:59-12:00",
    "cameraReady": "2026-11-12T23:59:59-12:00",
    "conferenceDates": "2026-12-11",
    "location": "Sydney, Australia (at NeurIPS 2026)",
    "timezone": "AoE UTC-12",
    "portal": "OpenReview",
    "portalUrl": "https://causal-ml-workshop.github.io",
    "website": "https://causal-ml-workshop.github.io",
    "notes": "High prestige ML workshop focused on causality for invariant representations and out-of-distribution transfer."
  }
]

def load_harvested_core_nlp():
    core_file = "data/core_4602_nlp.json"
    if os.path.exists(core_file):
        with open(core_file, "r", encoding="utf-8") as f:
            return json.load(f)
    print("Warning: data/core_4602_nlp.json not found. Run scripts/fetch_core.py first.")
    return []

def main():
    core_venues = load_harvested_core_nlp()
    print(f"Loaded {len(core_venues)} harvested conferences from CORE FoR 4602.")
    print(f"Loaded {len(non_core_seeds)} curated non-CORE seeds.")
    
    # Merge CORE 4602 venues + non-CORE seeds (CORE NLP takes priority for 4602)
    core_acronyms = {c['acronym'].split()[0].upper() for c in core_venues}
    filtered_seeds = [s for s in non_core_seeds if s['acronym'].split()[0].upper().replace('*', '') not in core_acronyms]
    
    compiled_venues = core_venues + filtered_seeds
    print(f"Total unified venues in catalog: {len(compiled_venues)}")

    # 1. Output Master JSON Catalog
    os.makedirs("data", exist_ok=True)
    with open("data/conferences.json", "w", encoding="utf-8") as f:
        json.dump(compiled_venues, f, indent=2)
    print("Saved unified catalog to data/conferences.json")

    # 2. Output In-Browser JavaScript Bundle
    js_content = f"""/**
 * Conference Database & Domain Taxonomy
 * Curated for PhD Research in NLP, ML, Vision, Robotics, and Information Retrieval.
 * Sourced from ICORE 2026 (FoR 4602), OpenReview, and Curated Outlets.
 */

const DOMAIN_DEFINITIONS = {json.dumps(domains_def, indent=2)};

const CORE_RANK_TIERS = {json.dumps(rank_tiers, indent=2)};

const DEFAULT_CONFERENCES = {json.dumps(compiled_venues, indent=2)};

window.RESEARCH_DATA = {{
  DOMAIN_DEFINITIONS,
  CORE_RANK_TIERS,
  DEFAULT_CONFERENCES
}};
"""

    with open("js/data.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    print("Saved window.RESEARCH_DATA bundle to js/data.js")

if __name__ == "__main__":
    main()
