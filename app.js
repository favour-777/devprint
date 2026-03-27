    const GITHUB_TOKEN = ''; 
    const $ = id => document.getElementById(id);
    let lastReport = null;

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const toBase64Url = (value) => {
      const bytes = encoder.encode(value);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };

    const fromBase64Url = (value) => {
      const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
      const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
      const binary = atob(normalized + pad);
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
      return decoder.decode(bytes);
    };

    const encodeReport = (payload) => toBase64Url(JSON.stringify(payload));
    const decodeReport = (payload) => JSON.parse(fromBase64Url(payload));

    const clampText = (value, max = 180) => {
      if (!value) return '';
      const text = String(value).trim();
      return text.length > max ? `${text.slice(0, max - 1)}...` : text;
    };

    const formatAt = (value) => {
      if (!value) return '';
      const cleaned = String(value).replace(/\s*@\s*/g, '@');
      const idx = cleaned.indexOf('@');
      if (idx === -1) return cleaned;
      const before = cleaned.slice(0, idx);
      const after = cleaned.slice(idx + 1);
      const left = before ? `<span class="at-text">${before}</span>` : '';
      const right = after ? `<span class="at-text">${after}</span>` : '';
      return `<span class="at-wrap">${left}<span class="at-mark">@</span>${right}</span>`;
    };

    const normalizePronounText = (value) => String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\u00a0/g, ' ')
      .replace(/[\u2044\u2215\uFF0F]/g, '/')
      .replace(/\s*[\|\u00b7\u2022]\s*/g, '/')
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s+/g, ' ')
      .trim();

    const PRONOUNS = [
      { match: /(^|[^a-z])(he\/him(\/his)?)(?=$|[^a-z])/i, subject: 'he', object: 'him', possessive: 'his', label: 'he/him' },
      { match: /(^|[^a-z])(she\/her(\/hers)?)(?=$|[^a-z])/i, subject: 'she', object: 'her', possessive: 'her', label: 'she/her' },
      { match: /(^|[^a-z])(they\/them(\/their(s)?)?)(?=$|[^a-z])/i, subject: 'they', object: 'them', possessive: 'their', label: 'they/them' },
      { match: /(^|[^a-z])(he\/they)(?=$|[^a-z])/i, subject: 'they', object: 'them', possessive: 'their', label: 'he/they' },
      { match: /(^|[^a-z])(she\/they)(?=$|[^a-z])/i, subject: 'they', object: 'them', possessive: 'their', label: 'she/they' },
      { match: /(^|[^a-z])(xe\/xem|xe\/xyr)(?=$|[^a-z])/i, subject: 'xe', object: 'xem', possessive: 'xyr', label: 'xe/xem' },
      { match: /(^|[^a-z])(ze\/zir|ze\/hir)(?=$|[^a-z])/i, subject: 'ze', object: 'zir', possessive: 'zir', label: 'ze/zir' },
      { match: /(^|[^a-z])(any pronouns|any\/all)(?=$|[^a-z])/i, subject: 'they', object: 'them', possessive: 'their', label: 'any' },
    ];

    const getPronouns = (bio) => {
      if (!bio) return null;
      const text = normalizePronounText(bio);
      const found = PRONOUNS.find(p => p.match.test(text));
      return found ? { subject: found.subject, object: found.object, possessive: found.possessive, label: found.label } : null;
    };

    const getUserPronouns = (user) => {
      if (!user) return null;
      const source = [user.pronouns, user.bio].filter(Boolean).join(' ');
      return getPronouns(source);
    };
    
    const themeToggle = $('themeToggle');
    const sunIcon = $('sunIcon');
    const moonIcon = $('moonIcon');

    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const isLight = html.getAttribute('data-theme') === 'light';
      if (isLight) {
        html.setAttribute('data-theme', 'dark');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        html.setAttribute('data-theme', 'light');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    });

    
    function getHistory() {
      try { return JSON.parse(localStorage.getItem('devprint_history') || '[]'); } catch { return []; }
    }

    function saveToHistory(username) {
      const h = getHistory().filter(u => u.toLowerCase() !== username.toLowerCase());
      h.unshift(username);
      localStorage.setItem('devprint_history', JSON.stringify(h.slice(0, 5)));
      renderHistory();
    }

    function clearHistory() {
      localStorage.removeItem('devprint_history');
      renderHistory();
    }

    function renderHistory() {
      const wrap = $('historyWrap');
      if (!wrap) return;
      const h = getHistory();
      if (!h.length) { wrap.innerHTML = ''; return; }
      wrap.innerHTML = `<span class="history-label">Recent</span>
        <button class="history-clear" onclick="clearHistory()" aria-label="Clear recent searches">CLEAR</button>` +
        h.map(u => `<button class="history-chip" onclick="quickSearch('${u}')">${formatAt(`@${u}`)}</button>`).join('');
    }

    function quickSearch(username) {
      $('usernameInput').value = username;
      analyze();
    }

    const LOAD_STEPS = [
      'Fetching profile...',
      'Scanning repositories...',
      'Analyzing patterns...',
      'Calculating impact...',
      'Preparing report...'
    ];
    let loadStepIndex = 0;
    let loadStepTimer = null;

    const setLoading = (msg) => {
      $('loading').classList.add('active');
      $('loadingText').textContent = msg || LOAD_STEPS[0];
      $('results').classList.remove('active');
      $('errorBox').classList.remove('active');
      loadStepIndex = 0;
      clearInterval(loadStepTimer);
      loadStepTimer = setInterval(() => {
        loadStepIndex = (loadStepIndex + 1) % LOAD_STEPS.length;
        const el = $('loadingText');
        if (el) el.textContent = LOAD_STEPS[loadStepIndex];
      }, 1200);
    };

    const stopLoading = () => {
      clearInterval(loadStepTimer);
      $('loading').classList.remove('active');
    };

    const showError = (msg, suggestions = []) => {
      stopLoading();
      const box = $('errorBox');
      box.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'error-title';
      title.textContent = msg;
      box.appendChild(title);

      if (suggestions.length) {
        const hint = document.createElement('div');
        hint.className = 'error-hint';
        hint.textContent = 'Did you mean:';
        box.appendChild(hint);

        const list = document.createElement('div');
        list.className = 'error-suggestions';
        suggestions.forEach(user => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'error-suggestion';
          btn.textContent = user;
          btn.addEventListener('click', () => quickSearch(user));
          list.appendChild(btn);
        });
        box.appendChild(list);
      }

      box.classList.add('active');
    };

    function typewrite(el, text, speed = 18) {
      el.textContent = '';
      el.classList.remove('loading-text');
      let i = 0;
      const tick = () => {
        if (i < text.length) {
          el.textContent += text[i++];
          setTimeout(tick, speed);
        }
      };
      tick();
    }

    async function ghFetch(path) {
      const headers = { 'Accept': 'application/vnd.github.v3+json' };
      if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;
      const res = await fetch(`https://api.github.com${path}`, { headers });
      if (!res.ok) {
        if (res.status === 403) throw new Error("API rate limit exceeded. Try adding a token or wait an hour.");
        if (res.status === 404) throw new Error("User not found.");
        throw new Error(`GitHub error: ${res.status}`);
      }
      return res.json();
    }

    async function fetchPronouns(login) {
      if (!login) return null;
      try {
        const res = await fetch(`/api/pronouns?user=${encodeURIComponent(login)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.pronouns || null;
      } catch {
        return null;
      }
    }

    async function getUserSuggestions(query) {
      if (!query || query.length < 2) return [];
      try {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;
        const url = `https://api.github.com/search/users?q=${encodeURIComponent(query)}+in:login&type=Users&per_page=5`;
        const res = await fetch(url, { headers });
        if (!res.ok) return [];
        const data = await res.json();
        const logins = (data.items || []).map(item => item.login).filter(Boolean);
        return Array.from(new Set(logins)).slice(0, 5);
      } catch {
        return [];
      }
    }

    function getDevType(user, repos) {
      const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
      const forkedCount = repos.filter(r => r.fork).length;
      const originalCount = repos.length - forkedCount;
      const accountAgeDays = Math.max(1, (Date.now() - new Date(user.created_at)) / 86400000);
      const reposPerYear = (repos.length / accountAgeDays) * 365;
      const hasDetailedReadmes = repos.filter(r => !r.fork && r.description && r.description.length > 40).length;

      if (totalStars > 100) return { name: "The Star Architect", desc: "Your work earns real attention. People star it because it solves a problem they feel." };
      if (forkedCount > originalCount * 1.5) return { name: "The Adapter", desc: "You learn fast by remixing what works. You move with speed and practical judgment." };
      if (reposPerYear > 20) return { name: "The Binge Builder", desc: "You ship a lot. Ideas do not sit still for long before they turn into repos." };
      if (hasDetailedReadmes > originalCount * 0.5 && originalCount > 5) return { name: "The Documentation Champion", desc: "You make your work easy to follow. That clarity helps teams move faster." };
      if (originalCount > 10 && totalStars < 10) return { name: "The Silent Craftsman", desc: "You build without chasing attention. The consistency still shows." };
      if (repos.length < 5) return { name: "The Emerging Dev", desc: "You are early in the journey. The story is just getting started." };
      return { name: "The Steady Builder", desc: "Consistent, grounded, and deliberate. You value quality over quick wins." };
    }

    async function getLanguages(repos) {
      const langCount = {};
      const sample = repos.filter(r => !r.fork && r.language).slice(0, 30);
      for (const repo of sample) {
        if (repo.language) langCount[repo.language] = (langCount[repo.language] || 0) + 1;
      }
      return Object.entries(langCount).sort((a,b) => b[1]-a[1]).slice(0, 5);
    }

    function getActivityLevel(repos) {
      return getActivityFromCount(getRecentRepoCount(repos));
    }

    function getTopRepo(repos) {
      const owned = repos.filter(r => !r.fork);
      if (!owned.length) return null;
      return owned.sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
    }

    function getRecentRepoCount(repos, days = 90) {
      const now = Date.now();
      return repos.filter(r => {
        const diff = (now - new Date(r.pushed_at)) / (1000 * 60 * 60 * 24);
        return diff <= days;
      }).length;
    }

    function getActivityFromCount(recentPushes) {
      if (recentPushes >= 8) return { label: 'Highly Active', color: '#00f0a0' };
      if (recentPushes >= 4) return { label: 'Active', color: '#7ee8a2' };
      if (recentPushes >= 1) return { label: 'Occasional Pushes', color: '#f0a500' };
      return { label: 'Quiet Lately', color: '#8b949e' };
    }

    function computeImpact(user, totalStars, totalForks, recentPushes) {
      const starScore = Math.log10(totalStars + 1) * 28;
      const forkScore = Math.log10(totalForks + 1) * 18;
      const followerScore = Math.log10((user.followers || 0) + 1) * 24;
      const activityScore = Math.min(22, recentPushes * 2.5);
      const score = Math.min(100, Math.round(starScore + forkScore + followerScore + activityScore));
      return {
        score,
        starScore,
        forkScore,
        followerScore,
        activityScore,
        recentPushes,
        totalStars,
        totalForks,
        followers: user.followers || 0
      };
    }

    function buildSummary(user, repos, topLangs) {
      const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
      const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
      const accountYears = Math.max(1, Math.floor((Date.now() - new Date(user.created_at)) / 31536000000));
      const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const recentPushes = getRecentRepoCount(repos);
      const activity = getActivityFromCount(recentPushes);
      const topRepo = getTopRepo(repos);
      const impact = computeImpact(user, totalStars, totalForks, recentPushes);
      return {
        totalStars,
        totalForks,
        accountYears,
        joinDate,
        recentPushes,
        activity,
        topRepo,
        impact,
        topLangs
      };
    }

    function buildReportSnapshot(user, devType, topLangs, summary) {
      const topRepo = summary.topRepo ? {
        name: summary.topRepo.name,
        description: clampText(summary.topRepo.description, 140),
        stargazers_count: summary.topRepo.stargazers_count,
        forks_count: summary.topRepo.forks_count,
        language: summary.topRepo.language,
        html_url: summary.topRepo.html_url
      } : null;
      const summaryLite = {
        ...summary,
        topRepo
      };
      return {
        user: {
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
          bio: clampText(user.bio, 220),
          company: user.company,
          location: user.location,
          created_at: user.created_at,
          followers: user.followers,
          following: user.following,
          public_repos: user.public_repos,
          public_gists: user.public_gists,
          html_url: user.html_url
        },
        devType,
        topLangs,
        summary: summaryLite,
      };
    }


    async function getRecruiterSummary(user, repos, devType, topLangs) {
      const pronouns = getUserPronouns(user);
      const pronounLine = pronouns ? `Pronouns: ${pronouns.label}.` : '';
      const bioLine = user.bio ? `Bio: ${user.bio}` : '';
      const prompt = `You are writing a recruiter brief for a developer profile. Output plain text only. No markdown, no bullet points, no headers, no bold, no italics, no dashes, no em dashes, no hyphens between thoughts. Just three clean sentences that flow naturally.

      Sentence 1: Summarize their technical identity and core stack.
      Sentence 2: Describe their activity pattern or project style.
      Sentence 3: Call out one standout trait that makes them memorable.
      
      Rules:
      - Never use buzzwords like "passionate", "innovative", "leverage", or "utilize"
      - Never use em dashes or markdown formatting of any kind
      - Use pronouns from the profile if present. If name, bio or profile README strongly implies a gender, use he/she. Otherwise default to they/them
      - Write like a sharp recruiter who has seen a thousand profiles and knows what actually matters
      - Avoid overly complex phrasing, let your points come across seamlessly, and let them bear just the right length - for this reason you are free to exceed 3 sentences, but you can't go above 5.

      Developer: ${user.name || user.login}
      Public Repos: ${user.public_repos}
      Developer Type: ${devType.name}
      Top Languages: ${topLangs.map(l => l[0]).join(', ')}
      ${pronounLine}
      ${bioLine}`;
      try {
        const res = await fetch('/api/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        return data.summary || null;
      } catch (e) {
        const subject = pronouns ? pronouns.subject : 'they';
        const subjectCap = subject.charAt(0).toUpperCase() + subject.slice(1);
        const verb = (base) => subject === 'they' ? base : `${base}s`;
        const langs = topLangs.map(l => l[0]).join(', ') || 'multiple languages';
        return `${user.name || user.login} comes across as "${devType.name}" based on public GitHub activity. ${subjectCap} ${verb('maintain')} ${user.public_repos} public repos and ${verb('work')} most in ${langs}. Recent activity and community patterns suggest steady momentum.`;
      }
    }

    async function getReadmeContact(username) {
      try {
        const readme = await ghFetch(`/repos/${username}/${username}/readme`);
        if (!readme.content) return {};
        const text = atob(readme.content.replace(/\s+/g, ''));

        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const twitterMatch = text.match(/https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/i);
        const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s"')>]+/i);
        const instagramMatch = text.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{1,30})/i);
        const telegramMatch = text.match(/https?:\/\/t\.me\/([a-zA-Z0-9_]{3,32})/i);
        const whatsappMatch = text.match(/(?:https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=))(\d{7,15})/i);
        const websiteMatch = text.match(/https?:\/\/(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:[\w\-._~:\/?#[\]@!$&'()*+,;=]*)?/i);

        return {
          email: emailMatch ? emailMatch[0] : null,
          twitter: twitterMatch ? twitterMatch[1] : null,
          linkedin: linkedinMatch ? linkedinMatch[0] : null,
          instagram: instagramMatch ? instagramMatch[1] : null,
          telegram: telegramMatch ? telegramMatch[1] : null,
          whatsapp: whatsappMatch ? whatsappMatch[1] : null,
          website: websiteMatch ? websiteMatch[0] : null,
        };
      } catch { return {}; }
    }

    function shareProfile() {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const username = lastReport?.data?.user?.login || $('usernameInput')?.value?.trim();
      const url = username ? `${baseUrl}?user=${encodeURIComponent(username)}` : baseUrl;
      navigator.clipboard.writeText(url).then(() => {
        const btn = $('shareBtn');
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
        setTimeout(() => {
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share Report`;
        }, 2000);
      }).catch(() => {
        window.prompt('Copy shareable profile link:', url);
      });
    }

    function copySummary() {
      const text = $('recruiterText')?.textContent;
      if (!text || text === 'Generating summary...') return;
      const onCopied = () => {
        const btn = $('copySummaryBtn');
        if (!btn) return;
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
        setTimeout(() => {
          btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
        }, 2000);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(onCopied).catch(() => {
          window.prompt('Copy recruiter summary:', text);
        });
      } else {
        window.prompt('Copy recruiter summary:', text);
      }
    }

    function renderSharedReport(payload) {
      if (!payload || !payload.data) return;
      const report = payload.data;
      $('usernameInput').value = report.user.login || '';
      render(report.user, [], report.devType, report.topLangs || [], {}, report.summary);
      stopLoading();
      const el = $('recruiterText');
      if (el) {
        el.classList.remove('loading-text');
        el.textContent = 'Shared report loaded. Run a fresh analysis to generate an updated recruiter summary.';
      }
    }

    function loadSharedReport() {
      if (!window.location.hash.startsWith('#report=')) return false;
      try {
        const encoded = window.location.hash.replace('#report=', '');
        const payload = decodeReport(encoded);
        renderSharedReport(payload);
        return true;
      } catch (err) {
        console.warn('Failed to load shared report', err);
        return false;
      }
    }

    const ICONS = {
      email:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
      twitter:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
      linkedin:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
      instagram: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
      telegram:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
      whatsapp:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
      link:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    };

    function buildContactCard(user, rc) {
      const links = [];
      const seen = new Set();

      const add = (href, icon, label) => {
        if (!href || seen.has(href)) return;
        seen.add(href);
        links.push({ href, icon, label });
      };

      const email = user.email || rc.email;
      if (email) {
        const cleanedEmail = email.replace(/\s*@\s*/g, '@');
        add(`mailto:${cleanedEmail}`, ICONS.email, formatAt(cleanedEmail));
      }

      if (user.twitter_username) add(`https://x.com/${user.twitter_username}`, ICONS.twitter, formatAt(`@${user.twitter_username}`));

      const liUrl = (user.blog && user.blog.includes('linkedin')) ? (user.blog.startsWith('http') ? user.blog : 'https://' + user.blog) : rc.linkedin;
      if (liUrl) add(liUrl, ICONS.linkedin, 'LinkedIn');

      if (rc.instagram) add(`https://instagram.com/${rc.instagram}`, ICONS.instagram, formatAt(`@${rc.instagram}`));

      if (rc.telegram) add(`https://t.me/${rc.telegram}`, ICONS.telegram, formatAt(`@${rc.telegram}`));

      if (rc.whatsapp) add(`https://wa.me/${rc.whatsapp}`, ICONS.whatsapp, 'WhatsApp');

      const blog = user.blog && !user.blog.includes('linkedin') ? (user.blog.startsWith('http') ? user.blog : 'https://' + user.blog) : null;
      if (blog) add(blog, ICONS.link, blog.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''));

      const skipDomains = ['linkedin.com','twitter.com','x.com','instagram.com','t.me','wa.me','whatsapp.com','shields.io','travis-ci','circleci'];
      if (rc.website && !skipDomains.some(d => rc.website.includes(d))) {
        const label = rc.website.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
        add(rc.website, ICONS.link, label);
      }

      if (!links.length) return '';
      return `<div class="contact-card">${links.map(l =>
        `<a class="contact-link" href="${l.href}" target="_blank" rel="noopener">${l.icon}${l.label}</a>`
      ).join('')}</div>`;
    }

    function render(user, repos, devType, topLangs, readmeContact = {}, summaryOverride = null) {
      const summary = summaryOverride || buildSummary(user, repos, topLangs);
      const { totalStars, accountYears, joinDate, activity, topRepo, impact } = summary;
      const topLangTotal = topLangs.reduce((s, l) => s + l[1], 0) || 1;

      const pronouns = getUserPronouns(user);
      const langBars = topLangs.length ? topLangs.map(([name, count]) => `
        <div class="lang-item">
          <span class="lang-name">${name}</span>
          <div class="lang-bar-wrap">
            <div class="lang-bar" data-pct="${Math.round((count/topLangTotal)*100)}"></div>
          </div>
          <span class="lang-pct numeric">${Math.round((count/topLangTotal)*100)}%</span>
        </div>
      `).join('') : '<div class="lang-item"><span class="lang-name">Not enough data</span></div>';

      const impactHTML = `
        <div class="impact-card solid-panel">
          <div class="section-title">Impact Breakdown</div>
          <div class="impact-grid">
            <div class="impact-item"><span>Impact Score</span><strong>${impact.score}</strong></div>
            <div class="impact-item"><span>Stars Earned</span><strong>${impact.totalStars}</strong></div>
            <div class="impact-item"><span>Forks</span><strong>${impact.totalForks}</strong></div>
            <div class="impact-item"><span>Recent Activity</span><strong>${impact.recentPushes} repos / 90d</strong></div>
          </div>
          <div class="impact-note">Impact score blends stars, forks, followers, and recent activity. It is a guide, not a verdict.</div>
        </div>
      `;

      const topRepoHTML = topRepo ? `
        <div class="top-repo-card solid-panel">
          <div class="top-repo-left">
          <div class="top-repo-eyebrow">Top Repository</div>
            <div class="top-repo-name">${topRepo.name}</div>
            ${topRepo.description ? `<div class="top-repo-desc">${topRepo.description}</div>` : ''}
            <div class="top-repo-meta">
              <span class="top-repo-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                ${topRepo.stargazers_count}
              </span>
              ${topRepo.language ? `<span class="top-repo-badge">${topRepo.language}</span>` : ''}
              <span class="top-repo-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>
                ${topRepo.forks_count} forks
              </span>
            </div>
          </div>
          <a class="top-repo-link" href="${topRepo.html_url}" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            View
          </a>
        </div>
      ` : '';

      lastReport = {
        v: 1,
        type: 'single',
        generatedAt: new Date().toISOString(),
        data: buildReportSnapshot(user, devType, topLangs, summary)
      };

      $('results').innerHTML = `
        <div class="profile-card solid-panel">
          <button id="shareBtn" class="share-btn" onclick="shareProfile()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            Share Report
          </button>
          <img src="${user.avatar_url}" alt="${user.login}" />
          <div class="profile-info">
            <h2>${user.name || user.login}</h2>
            <div class="handle">${formatAt(`@${user.login}`)}</div>
            ${user.bio ? `<div class="bio">${user.bio}</div>` : ''}
            <div class="profile-meta">
              ${user.company ? `<div class="meta-item"><strong>Company</strong> ${user.company}</div>` : ''}
              ${user.location ? `<div class="meta-item"><strong>Location</strong> ${user.location}</div>` : ''}
              ${pronouns ? `<div class="meta-item"><strong>Pronouns</strong> ${pronouns.label}</div>` : ''}
              <div class="meta-item"><strong>Followers</strong> ${user.followers}</div>
              <div class="meta-item"><strong>Following</strong> ${user.following}</div>
              <div class="meta-item"><strong>Joined</strong> ${joinDate}</div>
            </div>
            ${buildContactCard(user, readmeContact)}
          </div>
        </div>

        <div class="dev-type-card solid-panel">
          <div class="dev-type-label">Developer Type</div>
          <div class="dev-type-name">${devType.name}</div>
          <div class="dev-type-desc">${devType.desc}</div>
          <div class="activity-badge">
            <span class="activity-dot" style="background:${activity.color}"></span>
            ${activity.label}
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card solid-panel"><div class="stat-label">Public Repos</div><div class="stat-value numeric">${user.public_repos}</div></div>
          <div class="stat-card solid-panel"><div class="stat-label">Public Gists</div><div class="stat-value numeric">${user.public_gists}</div></div>
          <div class="stat-card solid-panel"><div class="stat-label">Years Active</div><div class="stat-value numeric">${accountYears}</div></div>
        </div>

        ${impactHTML}
        ${topRepoHTML}

        <div class="section-card solid-panel">
          <div class="section-title">Language Mix</div>
          <div class="lang-list">${langBars}</div>
        </div>

        <div class="section-card solid-panel" id="recruiterCard">
          <div class="section-head">
            <div class="section-title">Recruiter Overview</div>
            <button id="copySummaryBtn" class="copy-summary-btn" onclick="copySummary()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
            <div class="claude-badge">Powered by Claude AI</div>
          </div>
          <div class="recruiter-text loading-text" id="recruiterText">Drafting the summary...</div>
        </div>
      `;

      const resultsEl = $('results');
      resultsEl.classList.add('active');

      requestAnimationFrame(() => {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      setTimeout(() => {
        document.querySelectorAll('.lang-bar').forEach(bar => {
          bar.style.width = bar.dataset.pct + '%';
        });
      }, 100);
    }

    async function analyze(targetUser = null) {
      const rawUser = targetUser || $('usernameInput').value.trim();
      if (!rawUser) return;
      const username = rawUser.replace(/^https?:\/\/github\.com\//i, '').replace(/^@/, '').split('/')[0];

      $('usernameInput').value = username;
      $('analyzeBtn').disabled = true;

      const params = new URLSearchParams();
      params.set('user', username);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      if (window.location.hash) window.location.hash = '';

      try {
        setLoading('Fetching profile...');
        const user = await ghFetch(`/users/${username}`);
        const pronouns = await fetchPronouns(username);
        if (pronouns && !user.pronouns) user.pronouns = pronouns;
        const repos = await ghFetch(`/users/${username}/repos?per_page=100&sort=updated`);
        const readmeContact = await getReadmeContact(username);

        const devType = getDevType(user, repos);
        const topLangs = await getLanguages(repos);
        const summaryData = buildSummary(user, repos, topLangs);

        render(user, repos, devType, topLangs, readmeContact, summaryData);
        stopLoading();
        saveToHistory(username);

        getRecruiterSummary(user, repos, devType, topLangs).then(summary => {
          const el = $('recruiterText');
          if (el && summary) typewrite(el, summary);
        });

      } catch (err) {
        if (err && err.message === 'User not found.') {
          const suggestions = await getUserSuggestions(username);
          const msg = `Couldn't find a GitHub user named "${username}".`;
          showError(msg, suggestions);
        } else {
          showError(err.message || 'Something went wrong. Try again.');
        }
      } finally {
        $('analyzeBtn').disabled = false;
      }
    }

    $('usernameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') analyze();
    });

    window.addEventListener('DOMContentLoaded', () => {
      renderHistory();
      if (loadSharedReport()) return;
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get('user');
      if (userParam) analyze(userParam);
    });

