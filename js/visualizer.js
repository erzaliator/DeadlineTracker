/**
 * Interactive Visualizer Module
 * Provides:
 * 1. Horizontal Gantt / Timeline Visualizer with Academic Quarter Navigation & Today Pointer
 * 2. Monthly Interactive Submission Calendar
 * 3. Live Urgency Countdown Cards with AoE UTC-12 clocks
 * 4. Clickable Domain & CORE Rank Strategic Matrix
 */

class ConferenceVisualizer {
  constructor() {
    this.currentCalendarDate = new Date();
    this.currentYear = 2027;
    // 0 = Full Academic Cycle (Late 2026 - Late 2027)
    // 1 = Q4 2026, 2 = Q1 2027, 3 = Q2 2027, 4 = Q3 2027, 5 = Q4 2027
    this.activeQuarterMode = 0;
  }

  // Calculate milliseconds until AoE deadline
  getDeadlineDiff(deadlineStr) {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const now = new Date();
    return deadline - now;
  }

  formatCountdown(diffMs) {
    if (diffMs === null) return { status: "TBA", text: "Date TBA" };
    if (diffMs <= 0) return { status: "passed", text: "Deadline Passed" };

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let status = "planned";
    if (days < 14) status = "urgent";
    else if (days < 45) status = "upcoming";

    // Strict format without seconds: DDd HHh MMm
    return {
      status,
      days,
      hours,
      minutes,
      text: `${days}d ${hours}h ${minutes}m`
    };
  }

  formatDateDDMMYY(dateStr) {
    if (!dateStr) return "";
    if (typeof dateStr !== "string") {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    }

    // Range like "YYYY-MM-DD to YYYY-MM-DD"
    if (dateStr.includes("to")) {
      return dateStr.replace(/(\d{4})-(\d{2})-(\d{2})/g, (match, y, m, d) => {
        return `${d}-${m}-${y.slice(-2)}`;
      });
    }

    // Single YYYY-MM-DD pattern
    if (/\b\d{4}-\d{2}-\d{2}\b/.test(dateStr)) {
      return dateStr.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match, y, m, d) => {
        return `${d}-${m}-${y.slice(-2)}`;
      });
    }

    // ISO timestamp or standard date string
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    }

    return dateStr;
  }

  // --- 0. Interactive Yearly Calendar Grid (12-Month Academic View) ---
  renderYearlyCalendarGrid(containerId, venues) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!this.currentYear) {
      this.currentYear = 2027;
    }

    const year = this.currentYear;
    const now = new Date();

    // Group deadlines by month (0..11) and day (1..31)
    const monthData = Array.from({ length: 12 }, () => ({
      venues: [],
      deadlinesByDay: {}
    }));

    venues.forEach(v => {
      if (!v.deadline) return;
      const d = new Date(v.deadline);
      if (d.getFullYear() === year) {
        const m = d.getMonth();
        const day = d.getDate();
        monthData[m].venues.push(v);
        if (!monthData[m].deadlinesByDay[day]) {
          monthData[m].deadlinesByDay[day] = [];
        }
        monthData[m].deadlinesByDay[day].push(v);
      }
    });

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
    const dayHeadersHtml = dayLabels.map(d => `<div>${d}</div>`).join("");

    const monthCardsHtml = monthNames.map((mName, mIdx) => {
      const data = monthData[mIdx];
      const count = data.venues.length;
      const firstDay = new Date(year, mIdx, 1).getDay();
      const daysInMonth = new Date(year, mIdx + 1, 0).getDate();

      let daysHtml = "";
      for (let i = 0; i < firstDay; i++) {
        daysHtml += `<div class="mini-day-cell empty"></div>`;
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const isToday = now.getFullYear() === year && now.getMonth() === mIdx && now.getDate() === day;
        const dayVenues = data.deadlinesByDay[day] || [];
        const hasVenues = dayVenues.length > 0;

        let dotsHtml = "";
        if (hasVenues) {
          const dots = dayVenues.slice(0, 3).map(v => {
            const tier = window.RESEARCH_DATA.CORE_RANK_TIERS[v.coreRank] || { color: "#2563eb" };
            return `<span class="mini-dot" style="background-color: ${tier.color};" title="${v.acronym} (${v.coreRank})"></span>`;
          }).join("");
          dotsHtml = `<div class="mini-dots-row">${dots}</div>`;
        }

        const clickAttr = hasVenues ? `onclick="window.app.openVenueModal('${dayVenues[0].id}')" title="${dayVenues.map(v => v.acronym + ' (' + v.coreRank + ')').join(', ')}"` : '';

        daysHtml += `
          <div class="mini-day-cell ${isToday ? 'today' : ''} ${hasVenues ? 'has-events' : ''}" ${clickAttr}>
            <span>${day}</span>
            ${dotsHtml}
          </div>
        `;
      }

      // Mini events list for month
      let eventsListHtml = "";
      if (count > 0) {
        const sorted = [...data.venues].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        eventsListHtml = `
          <div class="mini-month-events-list">
            ${sorted.map(v => {
              const d = new Date(v.deadline);
              const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return `
                <div class="mini-event-item" onclick="window.app.openVenueModal('${v.id}')" title="View ${v.name}">
                  <div class="mini-event-left">
                    <span class="rank-pill rank-${v.coreRank.replace('*', '-star').toLowerCase()}">${v.coreRank}</span>
                    <span class="mini-event-name">${v.acronym}</span>
                  </div>
                  <span class="mini-event-date">${dateStr}</span>
                </div>
              `;
            }).join("")}
          </div>
        `;
      } else {
        eventsListHtml = `<div style="font-size:0.65rem; color:var(--text-muted); text-align:center; padding: 12px 0;">No deadlines</div>`;
      }

      return `
        <div class="mini-month-card">
          <div class="mini-month-header">
            <span class="mini-month-title">${mName}</span>
            <span class="mini-month-count ${count > 0 ? 'active' : ''}">${count} deadline${count === 1 ? '' : 's'}</span>
          </div>
          <div class="mini-day-headers">
            ${dayHeadersHtml}
          </div>
          <div class="mini-days-grid">
            ${daysHtml}
          </div>
          ${eventsListHtml}
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="yearly-calendar-wrapper">
        <div class="yearly-nav-bar">
          <div class="yearly-year-title">
            <span>🗓️ Academic Year ${year} Calendar Grid</span>
          </div>
          <div style="display:flex; gap: 8px;">
            <button class="btn ${year === 2026 ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="window.visualizer.setYear(2026)">2026 Grid</button>
            <button class="btn ${year === 2027 ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="window.visualizer.setYear(2027)">2027 Grid</button>
            <button class="btn ${year === 2028 ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="window.visualizer.setYear(2028)">2028 Grid</button>
          </div>
        </div>

        <div class="yearly-legend-bar">
          <span style="font-weight:700; color:var(--text-primary); margin-right:4px;">Rank Legend:</span>
          <div class="yearly-legend-item"><span class="yearly-legend-dot" style="background:#9333ea;"></span> <strong>A*</strong> (Purple)</div>
          <div class="yearly-legend-item"><span class="yearly-legend-dot" style="background:#dc2626;"></span> <strong>A</strong> (Red)</div>
          <div class="yearly-legend-item"><span class="yearly-legend-dot" style="background:#ea580c;"></span> <strong>B*</strong> (Orange)</div>
          <div class="yearly-legend-item"><span class="yearly-legend-dot" style="background:#ca8a04;"></span> <strong>B</strong> (Yellow)</div>
          <div class="yearly-legend-item"><span class="yearly-legend-dot" style="background:#16a34a;"></span> <strong>C*</strong> (Green)</div>
          <div class="yearly-legend-item"><span class="yearly-legend-dot" style="background:#78350f;"></span> <strong>C</strong> (Brown)</div>
          <div class="yearly-legend-item"><span class="yearly-legend-dot" style="background:#2563eb;"></span> <strong>Workshop</strong> (Blue)</div>
          <div class="yearly-legend-item"><span style="display:inline-block; width:10px; height:10px; border:2px solid #e11d48; border-radius:3px;"></span> Today</div>
        </div>

        <div class="yearly-grid">
          ${monthCardsHtml}
        </div>
      </div>
    `;
  }

  setYear(yr) {
    this.currentYear = yr;
    if (window.app) window.app.renderActiveVisualizer();
  }

  // --- 1. Gantt / Timeline Chart Renderer ---
  renderGanttChart(containerId, venues) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!venues || venues.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No conferences match the current filter</h3>
          <p>Try adjusting your search, rank, or domain filters above.</p>
        </div>
      `;
      return;
    }

    // Determine time window based on activeQuarterMode
    const now = new Date();
    let minDate, maxDate, quarterTitle;

    switch (this.activeQuarterMode) {
      case 1: // Q4 2026
        minDate = new Date(2026, 9, 1); // Oct 1, 2026
        maxDate = new Date(2026, 11, 31); // Dec 31, 2026
        quarterTitle = "Q4 2026 (Oct – Dec 2026)";
        break;
      case 2: // Q1 2027
        minDate = new Date(2027, 0, 1); // Jan 1, 2027
        maxDate = new Date(2027, 2, 31); // Mar 31, 2027
        quarterTitle = "Q1 2027 (Jan – Mar 2027)";
        break;
      case 3: // Q2 2027
        minDate = new Date(2027, 3, 1); // Apr 1, 2027
        maxDate = new Date(2027, 5, 30); // Jun 30, 2027
        quarterTitle = "Q2 2027 (Apr – Jun 2027)";
        break;
      case 4: // Q3 2027
        minDate = new Date(2027, 6, 1); // Jul 1, 2027
        maxDate = new Date(2027, 8, 30); // Sep 30, 2027
        quarterTitle = "Q3 2027 (Jul – Sep 2027)";
        break;
      case 5: // Q4 2027
        minDate = new Date(2027, 9, 1); // Oct 1, 2027
        maxDate = new Date(2027, 11, 31); // Dec 31, 2027
        quarterTitle = "Q4 2027 (Oct – Dec 2027)";
        break;
      default: // Full Academic Cycle
        minDate = new Date(2026, 7, 1); // Aug 2026
        maxDate = new Date(2027, 11, 31); // Dec 2027
        quarterTitle = "Full Academic Cycle (2026 – 2027)";
    }

    const totalTimeSpan = maxDate - minDate;

    // Filter venues that fall within or near this window
    const validVenues = venues.filter(v => {
      if (!v.deadline) return false;
      const d = new Date(v.deadline);
      // In quarter mode, show venues with deadline or conference date in this range
      if (this.activeQuarterMode > 0) {
        return d >= minDate && d <= maxDate;
      }
      return true;
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    // Calculate Today pointer position
    const todayLeft = ((now - minDate) / totalTimeSpan) * 100;
    const isTodayInWindow = todayLeft >= 0 && todayLeft <= 100;

    // Generate Month markers for header
    const months = [];
    let curMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (curMonth <= maxDate) {
      months.push(new Date(curMonth));
      curMonth.setMonth(curMonth.getMonth() + 1);
    }

    const monthHeadersHtml = months.map(m => {
      const label = m.toLocaleString("default", { month: "short", year: "2-digit" });
      const leftPct = ((m - minDate) / totalTimeSpan) * 100;
      return `<div class="gantt-month-label" style="left: ${leftPct}%;">${label}</div>`;
    }).join("");

    const rowsHtml = validVenues.length > 0 ? validVenues.map(venue => {
      const deadlineDate = new Date(venue.deadline);
      const notifDate = venue.notification ? new Date(venue.notification) : null;
      const abstractDate = venue.abstractDeadline ? new Date(venue.abstractDeadline) : null;

      // Position calculations
      const deadlineLeft = Math.max(0, Math.min(100, ((deadlineDate - minDate) / totalTimeSpan) * 100));
      const notifLeft = notifDate ? Math.max(0, Math.min(100, ((notifDate - minDate) / totalTimeSpan) * 100)) : null;
      const abstractLeft = abstractDate ? Math.max(0, Math.min(100, ((abstractDate - minDate) / totalTimeSpan) * 100)) : null;

      const rankTier = window.RESEARCH_DATA.CORE_RANK_TIERS[venue.coreRank] || { color: "#4f46e5" };
      const countdown = this.formatCountdown(this.getDeadlineDiff(venue.deadline));

      // Bar from abstract (or deadline - 30 days) to notification
      const barStart = abstractLeft !== null ? abstractLeft : Math.max(0, deadlineLeft - 4);
      const barEnd = notifLeft !== null ? notifLeft : Math.min(100, deadlineLeft + 6);
      const barWidth = Math.max(2, barEnd - barStart);

      return `
        <div class="gantt-row" onclick="window.app.openVenueModal('${venue.id}')" title="Click to view details for ${venue.acronym}">
          <div class="gantt-venue-info">
            <span class="rank-pill rank-${venue.coreRank.replace('*', '-star').toLowerCase()}">${venue.coreRank}</span>
            <strong class="gantt-venue-name">${venue.acronym}</strong>
            <span class="gantt-deadline-date">${deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
          <div class="gantt-bar-track">
            <!-- Review Window Bar -->
            <div class="gantt-window-bar" style="left: ${barStart}%; width: ${barWidth}%; background-color: ${rankTier.color}18; border-left: 2px solid ${rankTier.color}; border-right: 2px solid ${rankTier.color};">
              <span class="gantt-window-label">Review Window</span>
            </div>
            
            <!-- Deadline Marker: Note name is NOT duplicated here -->
            <div class="gantt-deadline-marker" style="left: ${deadlineLeft}%; background-color: ${rankTier.color};" title="${venue.acronym} Paper Deadline: ${deadlineDate.toDateString()}">
            </div>

            ${notifLeft ? `
              <!-- Notification Marker -->
              <div class="gantt-notif-marker" style="left: ${notifLeft}%;" title="${venue.acronym} Notification: ${notifDate.toDateString()}">
                🔔
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }).join("") : `
      <div style="text-align:center; padding: 32px 0; color: var(--text-muted);">
        No paper deadlines fall within ${quarterTitle}. Use the quarter buttons above to explore other quarters.
      </div>
    `;

    container.innerHTML = `
      <div class="gantt-wrapper">
        <!-- Quarter Navigation Toolbar -->
        <div class="gantt-nav-toolbar">
          <div style="display:flex; align-items:center; gap: 8px;">
            <button class="btn btn-secondary btn-xs" onclick="window.visualizer.prevQuarter()" title="Previous Academic Quarter">&larr; Prev Quarter</button>
            <span class="gantt-quarter-label">${quarterTitle}</span>
            <button class="btn btn-secondary btn-xs" onclick="window.visualizer.nextQuarter()" title="Next Academic Quarter">Next Quarter &rarr;</button>
          </div>
          <div style="display:flex; gap: 6px;">
            <button class="btn ${this.activeQuarterMode === 0 ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="window.visualizer.setQuarterMode(0)">Full 2026–2027</button>
            <button class="btn ${this.activeQuarterMode === 1 ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="window.visualizer.setQuarterMode(1)">Q4 2026</button>
            <button class="btn ${this.activeQuarterMode === 2 ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="window.visualizer.setQuarterMode(2)">Q1 2027</button>
            <button class="btn ${this.activeQuarterMode === 3 ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="window.visualizer.setQuarterMode(3)">Q2 2027</button>
            <button class="btn ${this.activeQuarterMode === 4 ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="window.visualizer.setQuarterMode(4)">Q3 2027</button>
          </div>
        </div>

        <div class="gantt-header-track">
          <div class="gantt-venue-header">Venue & CORE Rank</div>
          <div class="gantt-timeline-header">
            ${monthHeadersHtml}
          </div>
        </div>

        <div class="gantt-body">
          ${isTodayInWindow ? `
            <!-- Vertical Today Indicator Line -->
            <div class="gantt-today-line" style="left: ${todayLeft}%;">
              <span class="today-marker-label">Today</span>
            </div>
          ` : ''}
          ${rowsHtml}
        </div>

        <div class="gantt-legend">
          <span><span class="legend-dot" style="background:#9333ea;"></span> A* (Purple)</span>
          <span><span class="legend-dot" style="background:#dc2626;"></span> A (Red)</span>
          <span><span class="legend-dot" style="background:#ea580c;"></span> B* (Orange)</span>
          <span><span class="legend-dot" style="background:#ca8a04;"></span> B (Yellow)</span>
          <span><span class="legend-dot" style="background:#16a34a;"></span> C* (Green)</span>
          <span><span class="legend-dot" style="background:#78350f;"></span> C (Brown)</span>
          <span><span class="legend-dot" style="background:#2563eb;"></span> Workshop (Blue)</span>
          <span><span class="legend-dot" style="background:#ef4444;"></span> Vertical Red Line = Today</span>
          <span>🔔 Notification</span>
        </div>
      </div>
    `;
  }

  prevQuarter() {
    if (this.activeQuarterMode <= 1) {
      this.activeQuarterMode = 5;
    } else {
      this.activeQuarterMode--;
    }
    if (window.app) window.app.renderActiveVisualizer();
  }

  nextQuarter() {
    if (this.activeQuarterMode >= 5) {
      this.activeQuarterMode = 1;
    } else {
      this.activeQuarterMode++;
    }
    if (window.app) window.app.renderActiveVisualizer();
  }

  setQuarterMode(mode) {
    this.activeQuarterMode = mode;
    if (window.app) window.app.renderActiveVisualizer();
  }

  // --- 2. Interactive Monthly Calendar Renderer ---
  renderCalendar(containerId, venues) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = this.currentCalendarDate.toLocaleString("default", { month: "long", year: "numeric" });

    // Group venue deadlines by day of current month
    const deadlinesByDay = {};
    venues.forEach(v => {
      if (!v.deadline) return;
      const d = new Date(v.deadline);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayNum = d.getDate();
        if (!deadlinesByDay[dayNum]) deadlinesByDay[dayNum] = [];
        deadlinesByDay[dayNum].push(v);
      }
    });

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayHeadersHtml = dayLabels.map(d => `<div class="calendar-day-header">${d}</div>`).join("");

    let gridHtml = "";
    // Empty cells before month starts
    for (let i = 0; i < firstDay; i++) {
      gridHtml += `<div class="calendar-cell empty"></div>`;
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const dayDeadlines = deadlinesByDay[day] || [];
      const hasDeadlines = dayDeadlines.length > 0;

      const eventsHtml = dayDeadlines.map(v => {
        const rankTier = window.RESEARCH_DATA.CORE_RANK_TIERS[v.coreRank] || { color: "#4f46e5" };
        return `
          <div class="calendar-event-pill" style="border-left: 3px solid ${rankTier.color};" onclick="window.app.openVenueModal('${v.id}')" title="${v.name}">
            <span class="cal-rank">${v.coreRank}</span>
            <span class="cal-name">${v.acronym}</span>
          </div>
        `;
      }).join("");

      gridHtml += `
        <div class="calendar-cell ${isToday ? 'today' : ''} ${hasDeadlines ? 'has-events' : ''}">
          <div class="calendar-date-number">${day}</div>
          <div class="calendar-events-container">${eventsHtml}</div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="calendar-wrapper">
        <div class="calendar-nav-bar">
          <button class="btn btn-secondary btn-xs" onclick="window.visualizer.prevCalendarMonth()">&larr; Prev Month</button>
          <h3 class="calendar-title">${monthName}</h3>
          <button class="btn btn-secondary btn-xs" onclick="window.visualizer.nextCalendarMonth()">Next Month &rarr;</button>
        </div>
        <div class="calendar-grid">
          ${dayHeadersHtml}
          ${gridHtml}
        </div>
      </div>
    `;
  }

  prevCalendarMonth() {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
    if (window.app) window.app.renderActiveVisualizer();
  }

  nextCalendarMonth() {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
    if (window.app) window.app.renderActiveVisualizer();
  }

  // --- 3. Urgency Countdown Cards Grid Renderer ---
  renderCountdownCards(containerId, venues) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!venues || venues.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⏳</div>
          <h3>No conferences to display</h3>
          <p>Try resetting filters or adding a conference.</p>
        </div>
      `;
      return;
    }

    const cardsHtml = venues.map(venue => {
      const diffMs = this.getDeadlineDiff(venue.deadline);
      const countdown = this.formatCountdown(diffMs);
      const isFav = window.storageManager.isFavorite(venue.id);

      // Domain tag badges
      const domainBadgesHtml = (venue.domains || []).map(d => {
        const def = window.RESEARCH_DATA.DOMAIN_DEFINITIONS[d];
        if (!def) return "";
        return `<span class="tag-pill" style="border-color:${def.color}33; color:${def.color};">${def.name}</span>`;
      }).join("");

      const tagsHtml = (venue.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join(" ");

      return `
        <div class="countdown-card card-urgency-${countdown.status}" id="card-${venue.id}" onclick="window.app.openVenueModal('${venue.id}')" style="cursor: pointer;" title="Click conference card to view full profile">
          <div class="card-header">
            <div class="rank-pill rank-${venue.coreRank.replace('*', '-star').toLowerCase()}">
              ${venue.coreRank}
            </div>
            <div class="card-title-group">
              <h4 class="card-acronym">${venue.acronym}</h4>
              <p class="card-full-name">${venue.name}</p>
            </div>
            <button class="btn-icon-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); window.app.toggleFavorite('${venue.id}', this)" title="${isFav ? 'Remove Favorite' : 'Add Favorite'}">
              ★
            </button>
          </div>

          <div class="card-body">
            <!-- Ticking Countdown Block (Strictly No Seconds) -->
            <div class="countdown-clock-box">
              <div class="countdown-status-badge status-${countdown.status}">
                ${countdown.status === 'urgent' ? '🔥 URGENT DEADLINE' : countdown.status === 'upcoming' ? '⏳ UPCOMING' : countdown.status === 'passed' ? '🏁 PASSED' : '📅 PLANNED'}
              </div>
              <div class="countdown-digits" data-deadline="${venue.deadline || ''}">
                ${countdown.text}
              </div>
              <div class="countdown-subtext">
                AoE UTC-12
              </div>
            </div>

            <!-- Migrated Bibliometrics & Rankings from Details Modal -->
            <div class="card-metrics-strip">
              <span class="c-metric"><strong>CORE:</strong> ${venue.coreRank}</span>
              <span class="c-metric"><strong>h5:</strong> ${venue.otherRanks ? venue.otherRanks.h5Index || '-' : '-'}</span>
              <span class="c-metric"><strong>Accept:</strong> ${venue.otherRanks ? venue.otherRanks.acceptanceRate || '-' : '-'}</span>
              ${venue.otherRanks && venue.otherRanks.ccf ? `<span class="c-metric"><strong>CCF:</strong> ${venue.otherRanks.ccf}</span>` : ''}
            </div>

            <!-- Milestone dates: Ordered chronologically, NO ICONS, all dates strictly in DD-MM-YY format -->
            <div class="card-milestones">
              ${venue.abstractDeadline ? `
                <div class="milestone-row">
                  <span class="m-label">Abstract Reg:</span>
                  <span class="m-val">${this.formatDateDDMMYY(venue.abstractDeadline)}</span>
                </div>
              ` : ''}
              <div class="milestone-row">
                <span class="m-label">Paper Deadline:</span>
                <span class="m-val highlight">${venue.deadline ? this.formatDateDDMMYY(venue.deadline) : 'TBA'}</span>
              </div>
              ${venue.reviewsReleased ? `
                <div class="milestone-row">
                  <span class="m-label">Reviews/Rebuttal:</span>
                  <span class="m-val">${this.formatDateDDMMYY(venue.reviewsReleased)}</span>
                </div>
              ` : ''}
              ${venue.notification ? `
                <div class="milestone-row">
                  <span class="m-label">Notification:</span>
                  <span class="m-val">${this.formatDateDDMMYY(venue.notification)}</span>
                </div>
              ` : ''}
              ${venue.cameraReady ? `
                <div class="milestone-row">
                  <span class="m-label">Camera-Ready:</span>
                  <span class="m-val">${this.formatDateDDMMYY(venue.cameraReady)}</span>
                </div>
              ` : ''}
              <div class="milestone-row">
                <span class="m-label">Dates & Venue:</span>
                <span class="m-val">${this.formatDateDDMMYY(venue.conferenceDates)} (${venue.location})</span>
              </div>
            </div>

            <!-- Focus Domains & Tags -->
            <div class="card-domains-wrap">
              ${domainBadgesHtml}
              ${tagsHtml}
            </div>
          </div>

          <div class="card-footer">
            <a href="${venue.portalUrl || venue.website}" target="_blank" rel="noopener" class="portal-badge" onclick="event.stopPropagation()" title="Open submission portal: ${venue.portal}">
              ${venue.portal} &nearr;
            </a>
            <div class="card-actions">
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); window.app.openAssignListModal('${venue.id}')" title="Assign to WikiCFP List">
                + List
              </button>
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); window.app.exportSingleVenueICS('${venue.id}')" title="Export .ics Calendar">
                📅 .ics
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `<div class="countdown-cards-grid">${cardsHtml}</div>`;
  }

  // --- 4. Clickable Domain & Rank Matrix Analytics Renderer ---
  renderMatrix(containerId, venues) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Rank Distribution - 7 Tiers
    const rankCounts = { "A*": 0, "A": 0, "B*": 0, "B": 0, "C*": 0, "C": 0, "Workshop": 0 };
    venues.forEach(v => {
      if (rankCounts[v.coreRank] !== undefined) rankCounts[v.coreRank]++;
    });

    // Domain Counts
    const domainCounts = {};
    Object.keys(window.RESEARCH_DATA.DOMAIN_DEFINITIONS).forEach(k => domainCounts[k] = 0);
    venues.forEach(v => {
      (v.domains || []).forEach(d => {
        if (domainCounts[d] !== undefined) domainCounts[d]++;
      });
    });

    const rankBarsHtml = Object.entries(rankCounts).map(([rank, count]) => {
      const pct = venues.length > 0 ? ((count / venues.length) * 100).toFixed(0) : 0;
      const tier = window.RESEARCH_DATA.CORE_RANK_TIERS[rank] || { color: "#4f46e5" };
      return `
        <div class="matrix-bar-item" onclick="window.app.filterByRankDirect('${rank}')" title="Click to filter by ${rank}">
          <div class="matrix-bar-label">
            <span><strong>${rank}</strong> (${count} venues) <span class="matrix-click-hint">&rarr; Filter</span></span>
            <span class="pct-span">${pct}%</span>
          </div>
          <div class="matrix-bar-track">
            <div class="matrix-bar-fill" style="width: ${pct}%; background-color: ${tier.color};"></div>
          </div>
        </div>
      `;
    }).join("");

    const domainBarsHtml = Object.entries(domainCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([domKey, count]) => {
        const def = window.RESEARCH_DATA.DOMAIN_DEFINITIONS[domKey];
        const pct = venues.length > 0 ? ((count / venues.length) * 100).toFixed(0) : 0;
        return `
          <div class="matrix-bar-item" onclick="window.app.filterByDomainDirect('${domKey}')" title="Click to filter by ${def ? def.name : domKey}">
            <div class="matrix-bar-label">
              <span>${def ? def.name : domKey} (${count}) <span class="matrix-click-hint">&rarr; Filter</span></span>
              <span class="pct-span">${pct}%</span>
            </div>
            <div class="matrix-bar-track">
              <div class="matrix-bar-fill" style="width: ${pct}%; background-color: ${def ? def.color : '#4f46e5'};"></div>
            </div>
          </div>
        `;
      }).join("");

    container.innerHTML = `
      <div class="matrix-dashboard-grid">
        <div class="matrix-card">
          <div class="matrix-header">
            <h4>🏆 CORE Rank Tier Breakdown</h4>
            <p>Click any tier below to filter your tracked venues</p>
          </div>
          <div class="matrix-body">
            ${rankBarsHtml}
          </div>
        </div>

        <div class="matrix-card">
          <div class="matrix-header">
            <h4>🔬 Research Domain Coverage</h4>
            <p>Click any research area below to filter your target venues</p>
          </div>
          <div class="matrix-body">
            ${domainBarsHtml}
          </div>
        </div>
      </div>
    `;
  }
}

window.visualizer = new ConferenceVisualizer();
