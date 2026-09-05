const state = {
  data: null,
  currentUser: null,
  csrfToken: null,
  navOpen: false,
  wheelRotation: 0,
  currentClue: null,
  adminDashboard: null
};

const app = document.getElementById("app");
const header = document.getElementById("site-header");
const toastEl = document.getElementById("toast");

const routes = {
  "/": renderHome,
  "/games": renderGames,
  "/premium": renderPremium,
  "/quizzes": renderQuizzes,
  "/quiz": renderQuiz,
  "/challenges": renderChallenges,
  "/polls": renderPolls,
  "/lifestyle": renderLifestyle,
  "/article": renderArticle,
  "/entertainment": renderEntertainment,
  "/community": renderCommunity,
  "/search": renderSearch,
  "/login": renderLogin,
  "/register": renderRegister,
  "/profile": renderProfile,
  "/notifications": renderNotifications,
  "/admin": renderAdmin,
  "/guidelines": renderGuidelines,
  "/privacy": renderPrivacy,
  "/terms": renderTerms
};

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("hashchange", () => {
  state.navOpen = false;
  renderRoute();
});

document.addEventListener("click", handleClick);
document.addEventListener("submit", handleSubmit);

async function init() {
  await refresh();
  renderRoute();
}

async function refresh() {
  const data = await api("/api/bootstrap");
  applyBootstrap(data);
}

function applyBootstrap(data) {
  state.data = data;
  state.currentUser = data.currentUser;
  state.csrfToken = data.csrfToken;
}

function getRoute() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  return {
    path: path || "/",
    params: new URLSearchParams(query)
  };
}

async function renderRoute() {
  if (!state.data) return;
  const route = getRoute();
  renderNav(route.path);
  const renderer = routes[route.path] || renderNotFound;
  try {
    await renderer(route.params);
    app.focus({ preventScroll: true });
  } catch (error) {
    setPage(errorView("Something went wrong.", error.message));
  }
}

function renderNav(activePath) {
  const links = [
    ["/", "Home"],
    ["/games", "Mind Games"],
    ["/premium", "Premium"],
    ["/quizzes", "Quizzes"],
    ["/challenges", "Challenges"],
    ["/polls", "Polls"],
    ["/lifestyle", "Lifestyle"],
    ["/entertainment", "Entertainment"],
    ["/community", "Community"]
  ];

  const user = state.currentUser;
  const authLinks = user
    ? `
      <a href="#/profile">${escapeHtml(user.username || "Profile")}</a>
      <a href="#/notifications">Notifications${state.data.notifications.length ? ` (${state.data.notifications.length})` : ""}</a>
      ${user.role === "admin" ? '<a href="#/admin">Admin</a>' : ""}
      <button type="button" data-action="logout">Logout</button>
    `
    : `
      <a href="#/login">Login</a>
      <a href="#/register">Register</a>
    `;

  header.innerHTML = `
    <nav class="nav ${state.navOpen ? "open" : ""}" aria-label="Primary navigation">
      <a class="brand" href="#/" aria-label="Her Circle home">
        <span class="brand-mark">HC</span>
        <span class="brand-text">Her Circle</span>
      </a>
      <button type="button" class="nav-toggle" data-action="toggle-nav" aria-label="Toggle navigation menu">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-menu">
        ${links.map(([path, label]) => `<a class="${activePath === path ? "active" : ""}" href="#${path}">${label}</a>`).join("")}
      </div>
      <div class="nav-actions">
        <form class="nav-search" data-form="search">
          <label class="sr-only" for="nav-search-input">Search</label>
          <input id="nav-search-input" name="q" type="search" placeholder="Search" autocomplete="off">
          <button type="submit" aria-label="Search">Go</button>
        </form>
        ${authLinks}
      </div>
    </nav>
  `;
}

function setPage(html, title = "Her Circle") {
  document.title = `${title} | Her Circle`;
  app.innerHTML = html;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function sectionHead(title, copy, action = "") {
  return `
    <div class="section-head">
      <div>
        <h2>${escapeHtml(title)}</h2>
        ${copy ? `<p>${escapeHtml(copy)}</p>` : ""}
      </div>
      ${action}
    </div>
  `;
}

function pageTitle(title, copy) {
  return `
    <div class="page-title">
      <div>
        <p class="eyebrow">Her Circle</p>
        <h1>${escapeHtml(title)}</h1>
        ${copy ? `<p>${escapeHtml(copy)}</p>` : ""}
      </div>
    </div>
  `;
}

function renderHome() {
  const data = state.data;
  const daily = data.challenges[0];
  const featuredGames = data.games.slice(0, 8).map(gameCard).join("");
  const quizCards = data.quizzes.slice(0, 5).map(quizCard).join("");
  const pollCards = data.polls.slice(0, 4).map((poll) => pollCard(poll, true)).join("");
  const postCards = data.posts.slice(0, 3).map(postCard).join("");

  setPage(`
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">A space that is yours</p>
        <h1>Her Circle</h1>
        <h2 class="hero-line">Play, learn, and take up space.</h2>
        <p class="lede">Mindful games, creative prompts and practical inspiration for women who want a little more joy, confidence and connection in their day.</p>
        <div class="hero-actions">
          <a class="button primary" href="#/games">Explore mind games</a>
          <a class="button secondary" href="#/premium">See Premium</a>
        </div>
        <div class="metric-strip" aria-label="Site highlights">
          <div class="metric"><strong>${data.games.length}</strong><span>Games</span></div>
          <div class="metric"><strong>${data.quizzes.length}</strong><span>Quizzes</span></div>
          <div class="metric"><strong>18+</strong><span>Members only</span></div>
        </div>
      </div>
      <div class="hero-card">
        <img src="/assets/images/photo-1723291875479-db4df7217211.avif" alt="A woman enjoying a calm, confident moment" loading="eager">
      </div>
    </section>

    <section class="section-band">
      <div class="section-inner">
        ${sectionHead("Featured games", "Choose a small challenge that sharpens your thinking or opens a new conversation.", '<a class="button ghost" href="#/games">View all games</a>')}
        <div class="grid four">${featuredGames}</div>
      </div>
    </section>

    <section class="section-band alt">
      <div class="section-inner">
        ${sectionHead("Know yourself", "Reflective quizzes made for curiosity, not labels.", '<a class="button ghost" href="#/quizzes">Browse quizzes</a>')}
        <div class="grid">${quizCards}</div>
      </div>
    </section>

    <section class="section-band">
      <div class="section-inner">
        ${sectionHead("Daily Challenge", "A small prompt for today.")}
        <div class="panel soft daily-challenge">
          <div>
            <p class="eyebrow">Today's Challenge</p>
            <h2>${escapeHtml(daily.title)}</h2>
            <p class="subtle">${escapeHtml(daily.description)}</p>
            <p class="mini-meta">${escapeHtml(daily.category)} - ${escapeHtml(daily.difficulty)} - ${daily.participants} participants</p>
          </div>
          <button class="button primary" type="button" data-action="join-challenge" data-id="${escapeAttr(daily.id)}">${daily.joinedByMe ? "Joined" : "Join Challenge"}</button>
        </div>
      </div>
    </section>

    <section class="section-band alt">
      <div class="section-inner">
        ${sectionHead("Community Feed", "Recent questions and wins from members.", '<a class="button ghost" href="#/community">Open community</a>')}
        <div class="grid">${postCards}</div>
      </div>
    </section>

    <section class="section-band">
      <div class="section-inner">
        ${sectionHead("Popular Polls", "Vote once and see the room shift.", '<a class="button ghost" href="#/polls">All polls</a>')}
        <div class="grid four">${pollCards}</div>
      </div>
    </section>

    <section class="section-band alt">
      <div class="section-inner">
        ${sectionHead("Inspiration library", "A visual pause for creativity, confidence and your next good idea.")}
        <div class="inspiration-grid">${inspirationPhotos().map((photo, index) => `
          <figure class="inspiration-item">
            <img src="/assets/images/${escapeAttr(photo)}" alt="Her Circle inspiration image ${index + 1}" loading="lazy">
          </figure>
        `).join("")}</div>
      </div>
    </section>
  `, "Home");
}

function inspirationPhotos() {
  return [
    "pexels-109-marle-2159590461-36168703.jpg",
    "pexels-771703800-30963560.jpg",
    "pexels-ana-alice-azevedo-281453352-14414653.jpg",
    "pexels-andry-sasongko-2155578160-39221484.jpg",
    "pexels-ch-p-nh-chan-dung-2155026650-37206877.jpg",
    "pexels-daniela-elena-tentis-118658-364382.jpg",
    "pexels-felix-young-449360607-23196386.jpg",
    "pexels-felix-young-449360607-23196484.jpg",
    "pexels-felix-young-449360607-23385664.jpg",
    "pexels-h-i-nguy-n-1627264-8603594.jpg",
    "pexels-h-i-nguy-n-1627264-8603596.jpg",
    "pexels-hi-u-le-921253873-38332853.jpg",
    "pexels-ianandradef-1834418.jpg",
    "pexels-israwmx-28409113.jpg",
    "pexels-joshua-lim-1225706196-35574164.jpg",
    "pexels-juliano-astc-1623739-10978847.jpg",
    "pexels-kelson-martins-130172688-14711433.jpg",
    "pexels-soldiervip-11147214.jpg",
    "pexels-soldiervip-13638818.jpg",
    "pexels-soldiervip-31446149.jpg",
    "pexels-thao-trungthao-205378-2806130.jpg",
    "pexels-ti-u-b-o-tr-ng-41366219-10300196.jpg",
    "pexels-vika-glitter-392079-19893525.jpg",
    "pexels-wjretratos-1918441.jpg"
  ];
}

function renderGames() {
  const rounds = state.data.wouldYouRatherRounds.map(wyrRound).join("");
  const never = state.data.neverStatements.map(neverStatement).join("");
  const clue = state.currentClue || state.data.clueChallenges[0];

  setPage(`
    <section class="page">
      ${pageTitle("Mind Games", "Low-pressure games for sharp thinking, creative energy and meaningful conversation. Choose what feels good today.")}
      <div class="game-library panel soft">
        <p class="eyebrow">Explore your way</p>
        <div class="grid four">${state.data.games.map(gameCard).join("")}</div>
      </div>
      <div class="game-layout">
        <div class="game-panel">
          <div class="panel">
            <h2>Values & Vision</h2>
            <p class="subtle">Choose the option that feels right for you. There is no correct answer.</p>
            <div class="game-panel">${rounds}</div>
          </div>

          <div class="panel">
            <h2>Reflect & Try</h2>
            <p class="subtle">Pick a thoughtful question or a kind mini-challenge.</p>
            <div class="button-row">
              <button class="button primary" type="button" data-action="get-prompt" data-type="truth">Reflect</button>
              <button class="button secondary" type="button" data-action="get-prompt" data-type="dare">Try something new</button>
            </div>
            <div class="prompt-box" id="truth-dare-prompt">Choose Truth or Dare to start.</div>
          </div>

          <div class="panel">
            <h2>Life Stories</h2>
            <p class="subtle">Celebrate experiences without pressure to compare.</p>
            <div class="game-panel">${never}</div>
          </div>
        </div>

        <aside class="game-panel">
          <div class="panel">
            <h2>Prompt Picker</h2>
            <p class="subtle">Pick a gentle prompt for a fresh perspective.</p>
            <div class="wheel-wrap">
              <div class="wheel-pointer" aria-hidden="true"></div>
              <div class="wheel" id="wheel" style="transform: rotate(${state.wheelRotation}deg)"></div>
              <button class="button primary" type="button" data-action="spin-wheel">Spin</button>
              <div class="result-box" id="wheel-result">Prompts: reflect, try, create, connect or reset.</div>
            </div>
          </div>

          <div class="panel">
            <h2>Clue Challenge</h2>
            <p class="subtle">Guess the answer from plain-word clues.</p>
            <div class="prompt-box" id="clue-box">
              ${renderClue(clue)}
            </div>
            <form data-form="clue" class="clue-form">
              <input type="hidden" name="clueId" value="${escapeAttr(clue.id)}">
              <div class="field">
                <label for="clue-guess">Your guess</label>
                <input id="clue-guess" name="guess" required autocomplete="off">
              </div>
              <div class="button-row">
                <button class="button primary" type="submit">Check Guess</button>
                <button class="button ghost" type="button" data-action="new-clue">New Clue</button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </section>
  `, "Games");
}

function renderPremium() {
  setPage(`
    <section class="page narrow">
      ${pageTitle("Her Circle Premium", "A simple, flexible way to support more thoughtful play and women-centred learning.")}
      <div class="premium-card panel">
        <p class="eyebrow">Premium membership</p>
        <h2>KSh 30 every 3 days</h2>
        <p class="subtle">Access member game packs, reflection prompts, creative challenges and new mind-stimulating activities as they are released.</p>
        <ul class="feature-list">
          <li>Fresh logic, word, memory and creativity games</li>
          <li>Career, money, wellbeing and confidence prompts</li>
          <li>Member-only challenges, with no streak pressure</li>
          <li>Cancel before your next 3-day renewal</li>
        </ul>
        <div class="notice"><strong>Billing clarity:</strong> KSh 30 is charged every 3 days after you explicitly confirm payment. Payment processing is not connected in this build, so selecting the plan will not charge you.</div>
        <div class="button-row">
          <button class="button primary" type="button" data-action="start-premium">Continue to secure payment</button>
          <a class="button ghost" href="#/games">Keep exploring free games</a>
        </div>
      </div>
    </section>
  `, "Premium");
}

function renderQuizzes() {
  setPage(`
    <section class="page">
      ${pageTitle("Quizzes", "Take a quiz, get a result, and save it to your profile when signed in.")}
      <div class="grid">${state.data.quizzes.map(quizCard).join("")}</div>
    </section>
  `, "Quizzes");
}

async function renderQuiz(params) {
  const id = params.get("id");
  if (!id) {
    renderQuizzes();
    return;
  }

  const quiz = await api(`/api/quizzes/${encodeURIComponent(id)}`);
  setPage(`
    <section class="page narrow">
      ${pageTitle(quiz.title, quiz.description)}
      <form class="quiz-form" data-form="quiz" data-id="${escapeAttr(quiz.id)}">
        ${quiz.questions.map((question, index) => `
          <fieldset class="quiz-question">
            <legend class="sr-only">Question ${index + 1}</legend>
            <h3>${index + 1}. ${escapeHtml(question.text)}</h3>
            <div class="answer-list">
              ${question.answers.map((answer) => `
                <label class="answer-option">
                  <input type="radio" name="${escapeAttr(question.id)}" value="${escapeAttr(answer.id)}" required>
                  <span>${escapeHtml(answer.text)}</span>
                </label>
              `).join("")}
            </div>
          </fieldset>
        `).join("")}
        <button class="button primary" type="submit">Show My Result</button>
      </form>
      <div id="quiz-result"></div>
    </section>
  `, quiz.title);
}

function renderChallenges() {
  setPage(`
    <section class="page">
      ${pageTitle("Challenges", "Join a positive community challenge and track participation on your profile.")}
      <div class="grid">${state.data.challenges.map(challengeCard).join("")}</div>
    </section>
  `, "Challenges");
}

function renderPolls() {
  setPage(`
    <section class="page">
      ${pageTitle("Polls", "Vote once per poll, then see percentage results.")}
      <div class="grid">${state.data.polls.map((poll) => pollCard(poll, false)).join("")}</div>
    </section>
  `, "Polls");
}

function renderLifestyle() {
  setPage(`
    <section class="page">
      ${pageTitle("Lifestyle", "Beauty, fashion, self-care, travel, food, fitness, relationships, money, career, and growth.")}
      <div class="grid">${state.data.articles.map(articleCard).join("")}</div>
    </section>
  `, "Lifestyle");
}

async function renderArticle(params) {
  const slug = params.get("slug");
  if (!slug) {
    renderLifestyle();
    return;
  }
  const article = await api(`/api/articles/${encodeURIComponent(slug)}`);
  setPage(`
    <section class="page narrow">
      <article class="article-full">
        <div class="article-visual">${escapeHtml(article.category)}</div>
        <p class="eyebrow">${escapeHtml(article.category)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="lede">${escapeHtml(article.excerpt)}</p>
        <p class="mini-meta">By ${escapeHtml(article.author)} - ${escapeHtml(article.date)} - ${Number(article.views).toLocaleString()} views</p>
        <div class="article-body">${paragraphs(article.content)}</div>
      </article>
    </section>
  `, article.title);
}

function renderEntertainment() {
  const groups = groupBy(state.data.entertainment, "section");
  setPage(`
    <section class="page">
      ${pageTitle("Entertainment", "Music, movies, TV, trends and cultural moments worth sharing.")}
      ${Object.entries(groups).map(([section, items]) => `
        <section class="section-band">
          ${sectionHead(section, "")}
          <div class="grid two">${items.map((item) => `
            <article class="card">
              <div class="card-top">
                <span class="media-tile violet">${escapeHtml(shortLabel(section))}</span>
                <span class="tag">${escapeHtml(section)}</span>
              </div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
            </article>
          `).join("")}</div>
        </section>
      `).join("")}
    </section>
  `, "Entertainment");
}

function renderCommunity() {
  const postForm = state.currentUser && state.currentUser.role === "user"
    ? `
      <form class="panel soft" data-form="post">
        <div class="field">
          <label for="post-body">Create a post</label>
          <textarea id="post-body" name="body" maxlength="800" required placeholder="Ask a question, share a win, or start a light conversation."></textarea>
        </div>
        <button class="button primary" type="submit">Post</button>
      </form>
    `
    : `
      <div class="panel soft">
        <h2>Join the conversation</h2>
        <p class="subtle">Sign in or register to post, like, comment, and report content.</p>
        <div class="button-row">
          <a class="button primary" href="#/login">Login</a>
          <a class="button secondary" href="#/register">Register</a>
        </div>
      </div>
    `;

  setPage(`
    <section class="page">
      ${pageTitle("Community", "Create posts, like updates, comment, delete your own posts, and report issues for moderation.")}
      <div class="game-layout">
        <div class="game-panel">
          ${postForm}
          ${state.data.posts.map(postCard).join("")}
        </div>
        <aside class="game-panel">
          <div class="panel">
            <h2>Community Rules</h2>
            <p class="subtle">Be welcoming, keep conversations legal and respectful, avoid harassment, report harmful content, and remember this platform is for adults 18 years or older.</p>
            <a class="button ghost" href="#/guidelines">Read guidelines</a>
          </div>
          <div class="panel">
            <h2>Quick prompts</h2>
            <p class="subtle">What made you laugh today?</p>
            <p class="subtle">What is your perfect low-effort night?</p>
            <p class="subtle">What tiny upgrade changed your routine?</p>
          </div>
        </aside>
      </div>
    </section>
  `, "Community");
}

async function renderSearch(params) {
  const q = params.get("q") || "";
  const response = await api(`/api/search?q=${encodeURIComponent(q)}`);
  setPage(`
    <section class="page">
      ${pageTitle("Search", q ? `Results for "${q}"` : "Search games, quizzes, articles, polls, and community posts.")}
      <form class="panel" data-form="search">
        <div class="field">
          <label for="search-page-input">Search</label>
          <input id="search-page-input" name="q" value="${escapeAttr(q)}" type="search" autocomplete="off">
        </div>
        <button class="button primary" type="submit">Search</button>
      </form>
      <div class="search-list" style="margin-top: 1rem;">
        ${response.results.length ? response.results.map((item) => `
          <a class="search-result" href="${escapeAttr(item.url)}">
            <span class="tag">${escapeHtml(item.type)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.description)}</span>
          </a>
        `).join("") : emptyState("No results yet.", "Try a different search term.")}
      </div>
    </section>
  `, "Search");
}

function renderLogin() {
  setPage(`
    <section class="auth-wrap">
      <div class="auth-card">
        <p class="eyebrow">Welcome back</p>
        <h1>Login</h1>
        <p>Sign in to save your progress and participate in member activities.</p>
        <form data-form="login">
          <div class="field">
            <label for="login-id">Username or email</label>
            <input id="login-id" name="identifier" autocomplete="username" required>
          </div>
          <div class="field">
            <label for="login-password">Password</label>
            <input id="login-password" name="password" type="password" autocomplete="current-password" required>
          </div>
          <button class="button primary" type="submit">Login</button>
        </form>
        <p>New here? <a href="#/register">Create an account</a>.</p>
      </div>
    </section>
  `, "Login");
}

function renderRegister() {
  setPage(`
    <section class="auth-wrap">
      <div class="auth-card">
        <p class="eyebrow">Adults 18 plus</p>
        <h1>Register</h1>
        <p>Create a profile for games, polls, challenges, quiz results, and community features.</p>
        <form data-form="register">
          <div class="field">
            <label for="register-username">Username</label>
            <input id="register-username" name="username" minlength="2" maxlength="40" autocomplete="username" required>
          </div>
          <div class="field">
            <label for="register-email">Email</label>
            <input id="register-email" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="field">
            <label for="register-password">Password</label>
            <input id="register-password" name="password" type="password" minlength="8" autocomplete="new-password" required>
          </div>
          <div class="field">
            <label for="register-dob">Date of birth</label>
            <input id="register-dob" name="dateOfBirth" type="date" required>
          </div>
          <label class="check-option">
            <input type="checkbox" name="confirmAdult" required>
            <span>I confirm that I am 18 years or older.</span>
          </label>
          <button class="button primary" type="submit">Create Account</button>
        </form>
      </div>
    </section>
  `, "Register");
}

async function renderProfile(params) {
  const requestedId = params.get("id");
  const user = state.currentUser;
  const isOwn = !requestedId || (user && requestedId === user.id);

  if (!isOwn && requestedId) {
    const response = await api(`/api/profiles/${encodeURIComponent(requestedId)}`);
    setPage(publicProfileView(response.profile, response.posts, response.quizResults), `${response.profile.username} Profile`);
    return;
  }

  if (!user || user.role !== "user") {
    setPage(authRequired("Sign in to view and edit your profile."), "Profile");
    return;
  }

  const categoryChecks = state.data.categories.slice(0, 12).map((category) => `
    <label class="check-option">
      <input type="checkbox" name="favoriteCategories" value="${escapeAttr(category)}" ${user.favoriteCategories.includes(category) ? "checked" : ""}>
      <span>${escapeHtml(category)}</span>
    </label>
  `).join("");

  setPage(`
    <section class="page">
      ${pageTitle("Profile", "Edit public details without exposing your email address.")}
      <div class="game-layout">
        <div class="panel">
          <div class="profile-head">
            <span class="avatar">${escapeHtml(initials(user.username))}</span>
            <div>
              <h2>${escapeHtml(user.username)}</h2>
              <p class="subtle">${escapeHtml(user.bio || "No bio yet.")}</p>
              <p class="mini-meta">Joined ${dateShort(user.joinedAt)} - ${Number(user.gamesPlayed || 0)} games played - ${Number(user.challengesJoined || 0)} challenges joined</p>
            </div>
          </div>
        </div>
        <form class="panel" data-form="profile">
          <div class="field">
            <label for="profile-username">Username</label>
            <input id="profile-username" name="username" value="${escapeAttr(user.username)}" maxlength="40" required>
          </div>
          <div class="field">
            <label for="profile-bio">Bio</label>
            <textarea id="profile-bio" name="bio" maxlength="300">${escapeHtml(user.bio || "")}</textarea>
          </div>
          <div class="field">
            <label for="profile-picture">Profile picture URL</label>
            <input id="profile-picture" name="profilePicture" value="${escapeAttr(user.profilePicture || "")}" placeholder="Optional image URL">
          </div>
          <div class="field">
            <label>Favorite categories</label>
            <div class="grid two">${categoryChecks}</div>
          </div>
          <button class="button primary" type="submit">Save Profile</button>
        </form>
      </div>
    </section>
  `, "Profile");
}

function renderNotifications() {
  if (!state.currentUser) {
    setPage(authRequired("Sign in to view notifications."), "Notifications");
    return;
  }

  const list = state.data.notifications.length
    ? state.data.notifications.map((item) => `
      <a class="notification-item" href="${escapeAttr(item.link || "#/community")}">
        <strong>${escapeHtml(item.message)}</strong>
        <span class="mini-meta">${dateShort(item.createdAt)}</span>
      </a>
    `).join("")
    : emptyState("No notifications yet.", "Likes, comments, and challenge updates will appear here.");

  setPage(`
    <section class="page narrow">
      ${pageTitle("Notifications", "Recent activity tied to your account.")}
      <div class="notification-list">${list}</div>
    </section>
  `, "Notifications");
}

async function renderAdmin() {
  if (!state.currentUser || state.currentUser.role !== "admin") {
    setPage(authRequired("Admin access is required for this area."), "Admin");
    return;
  }

  state.adminDashboard = await api("/api/admin/dashboard");
  const admin = state.adminDashboard;

  setPage(`
    <section class="page">
      ${pageTitle("Admin", "Manage users, reports, posts, games, quizzes, articles, polls, and challenges.")}
      <div class="metric-strip">
        ${Object.entries(admin.counts).map(([key, value]) => `<div class="metric"><strong>${value}</strong><span>${escapeHtml(titleCase(key))}</span></div>`).join("")}
      </div>

      <div class="admin-grid" style="margin-top: 1rem;">
        <div class="game-panel">
          ${adminUsers(admin.users)}
          ${adminReports(admin.reports)}
          ${adminPosts(admin.posts)}
        </div>
        <div class="game-panel">
          ${adminCreateForms()}
          ${adminContentList("games", admin.games)}
          ${adminContentList("quizzes", admin.quizzes)}
          ${adminContentList("articles", admin.articles)}
          ${adminContentList("polls", admin.polls)}
          ${adminContentList("challenges", admin.challenges)}
        </div>
      </div>
    </section>
  `, "Admin");
}

function renderGuidelines() {
  setPage(`
    <section class="page narrow">
      ${pageTitle("Community Guidelines", "Her Circle is for adults 18 years or older and should stay welcoming.")}
      <div class="panel">
        <h2>Rules</h2>
        <p class="subtle">Be respectful. Do not harass, threaten, shame, scam, spam, or post illegal content. Do not share private information. Report harmful posts or comments so moderators can review them.</p>
        <h2>Moderation</h2>
        <p class="subtle">Members can report posts, comments, and profiles. Admins can review reports, remove posts, and disable accounts.</p>
      </div>
    </section>
  `, "Community Guidelines");
}

function renderPrivacy() {
  setPage(`
    <section class="page narrow">
      ${pageTitle("Privacy Policy", "How this app handles account and activity data.")}
      <div class="panel">
        <p class="subtle">This app stores account, profile, game, quiz, poll, post, comment, notification, and report data in its application database. Public profiles do not expose private email addresses. A production release needs a lawyer-reviewed privacy policy.</p>
      </div>
    </section>
  `, "Privacy Policy");
}

function renderTerms() {
  setPage(`
    <section class="page narrow">
      ${pageTitle("Terms of Service", "A respectful, adults-only space.")}
      <div class="panel">
        <p class="subtle">Her Circle is intended for adults 18 years or older. Users are responsible for their own posts and must follow community guidelines. A production release needs complete legal terms.</p>
      </div>
    </section>
  `, "Terms of Service");
}

function renderNotFound() {
  setPage(errorView("Page not found.", "Use the navigation to get back to the hub."), "Not Found");
}

function gameCard(game) {
  return `
    <article class="card">
      <img class="game-photo" src="${escapeAttr(gameImage(game.id))}" alt="${escapeAttr(`${game.title} activity`)}" loading="lazy">
      <div class="card-top">
        <span class="media-tile">${escapeHtml(game.imageLabel || shortLabel(game.title))}</span>
        <span class="tag">${escapeHtml(game.category)}</span>
      </div>
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.description)}</p>
      <div class="push">
        <a class="button small primary" href="#/games">Play</a>
      </div>
    </article>
  `;
}

function gameImage(id) {
  const images = {
    "word-weave": "photo-1633445159013-2d94bcf2c4c7.avif",
    "memory-studio": "photo-1613619156882-7a28070fd28e.avif",
    "money-moves": "photo-1611145434336-2324aa4079cd.avif",
    "career-compass": "photo-1574015974293-817f0ebebb74.avif",
    "culture-quiz": "photo-1555617135-8724b69f766c.avif",
    "creative-spark": "photo-1529139574466-a303027c1d8b.avif",
    "strategy-table": "photo-1515886657613-9f3515b0c78f.avif",
    "wellbeing-checkin": "photo-1512101176959-c557f3516787.avif",
    "travel-tales": "photo-1723291875479-db4df7217211.avif",
    "vision-board": "photo-1613619156882-7a28070fd28e.avif"
  };
  return `/assets/images/${images[id] || "photo-1723291875479-db4df7217211.avif"}`;
}

function quizCard(quiz) {
  return `
    <article class="card">
      <div class="card-top">
        <span class="media-tile violet">${escapeHtml(quiz.imageLabel || "Quiz")}</span>
        <span class="tag">${escapeHtml(quiz.category)}</span>
      </div>
      <h3>${escapeHtml(quiz.title)}</h3>
      <p>${escapeHtml(quiz.description)}</p>
      <p class="mini-meta">${Number(quiz.questionCount || 0)} questions</p>
      <div class="push">
        <a class="button small primary" href="#/quiz?id=${escapeAttr(quiz.id)}">Play</a>
      </div>
    </article>
  `;
}

function challengeCard(challenge) {
  return `
    <article class="card">
      <div class="card-top">
        <span class="media-tile gold">${escapeHtml(shortLabel(challenge.category))}</span>
        <span class="tag">${escapeHtml(challenge.category)}</span>
      </div>
      <h3>${escapeHtml(challenge.title)}</h3>
      <p>${escapeHtml(challenge.description)}</p>
      <p class="mini-meta">${escapeHtml(challenge.difficulty)} - ${escapeHtml(challenge.startDate)} to ${escapeHtml(challenge.endDate)}</p>
      <p class="mini-meta">${Number(challenge.participants)} participants</p>
      <div class="push">
        <button class="button small primary" type="button" data-action="join-challenge" data-id="${escapeAttr(challenge.id)}">${challenge.joinedByMe ? "Joined" : "Join Challenge"}</button>
      </div>
    </article>
  `;
}

function pollCard(poll, compact) {
  const optionButtons = poll.options.map((option) => `
    <button class="button small ${poll.myVote === option.id ? "secondary" : "ghost"}" type="button" data-action="vote-poll" data-poll-id="${escapeAttr(poll.id)}" data-option-id="${escapeAttr(option.id)}" ${poll.myVote ? "disabled" : ""}>
      ${escapeHtml(option.text)}
    </button>
  `).join("");

  return `
    <article class="card">
      <div class="card-top">
        <span class="media-tile">${escapeHtml(shortLabel(poll.category))}</span>
        <span class="tag">${escapeHtml(poll.category)}</span>
      </div>
      <h3>${escapeHtml(poll.question)}</h3>
      <div class="button-row">${optionButtons}</div>
      ${compact ? "" : pollResults(poll)}
      <p class="mini-meta">${Number(poll.totalVotes).toLocaleString()} total votes${poll.myVote ? " - you voted" : ""}</p>
    </article>
  `;
}

function pollResults(poll) {
  return `
    <div class="poll-results">
      ${poll.options.map((option) => `
        <div class="poll-option">
          <span>${escapeHtml(option.text)}</span>
          <strong>${Number(option.percent || 0)}%</strong>
          <div class="bar" aria-hidden="true"><span style="width: ${Number(option.percent || 0)}%"></span></div>
        </div>
      `).join("")}
    </div>
  `;
}

function wyrRound(round) {
  const total = Number(round.votesA) + Number(round.votesB);
  const percentA = total ? Math.round((Number(round.votesA) / total) * 100) : 0;
  const percentB = total ? 100 - percentA : 0;
  return `
    <div class="wyr-round">
      <h3>${escapeHtml(round.question)}</h3>
      <div class="choice-grid">
        <button class="button ${round.myVote === "A" ? "secondary" : "primary"}" type="button" data-action="vote-wyr" data-id="${escapeAttr(round.id)}" data-option="A">${escapeHtml(round.optionA)}</button>
        <button class="button ${round.myVote === "B" ? "secondary" : "primary"}" type="button" data-action="vote-wyr" data-id="${escapeAttr(round.id)}" data-option="B">${escapeHtml(round.optionB)}</button>
      </div>
      <div class="poll-results">
        <div class="poll-option">
          <span>${escapeHtml(round.optionA)}</span><strong>${percentA}%</strong>
          <div class="bar"><span style="width: ${percentA}%"></span></div>
        </div>
        <div class="poll-option">
          <span>${escapeHtml(round.optionB)}</span><strong>${percentB}%</strong>
          <div class="bar"><span style="width: ${percentB}%"></span></div>
        </div>
      </div>
      <p class="mini-meta">${total.toLocaleString()} votes${round.myVote ? " - your choice is saved" : ""}</p>
    </div>
  `;
}

function neverStatement(statement) {
  return `
    <div class="wyr-round">
      <h3>${escapeHtml(statement.text)}</h3>
      <div class="choice-grid">
        <button class="button ${statement.myResponse === "i-have" ? "secondary" : "ghost"}" type="button" data-action="respond-never" data-id="${escapeAttr(statement.id)}" data-response="i-have">I have</button>
        <button class="button ${statement.myResponse === "not-yet" ? "secondary" : "ghost"}" type="button" data-action="respond-never" data-id="${escapeAttr(statement.id)}" data-response="not-yet">Not yet</button>
      </div>
      <p class="mini-meta">${Number(statement.doneCount)} I have - ${Number(statement.notYetCount)} Not yet</p>
    </div>
  `;
}

function renderClue(clue) {
  return `
    <strong>Clues</strong>
    <p>${clue.clues.map(escapeHtml).join(" + ")}</p>
  `;
}

function articleCard(article) {
  return `
    <article class="card">
      <div class="article-visual">${escapeHtml(shortLabel(article.category))}</div>
      <span class="tag">${escapeHtml(article.category)}</span>
      <h3>${escapeHtml(article.title)}</h3>
      <p>${escapeHtml(article.excerpt)}</p>
      <p class="mini-meta">${escapeHtml(article.author)} - ${escapeHtml(article.date)} - ${Number(article.views).toLocaleString()} views</p>
      <div class="push">
        <a class="button small primary" href="#/article?slug=${escapeAttr(article.slug)}">Read</a>
      </div>
    </article>
  `;
}

function postCard(post) {
  const canDelete = state.currentUser && (state.currentUser.role === "admin" || state.currentUser.id === post.userId);
  return `
    <article class="post-card">
      <div class="post-head">
        <a class="avatar" href="#/profile?id=${escapeAttr(post.author.id)}">${escapeHtml(initials(post.author.username))}</a>
        <div>
          <h3><a href="#/profile?id=${escapeAttr(post.author.id)}">${escapeHtml(post.author.username)}</a></h3>
          <div class="post-meta">${dateShort(post.createdAt)}</div>
        </div>
      </div>
      <p>${escapeHtml(post.body)}</p>
      <div class="inline-actions">
        <button class="button small ${post.likedByMe ? "secondary" : "ghost"}" type="button" data-action="like-post" data-id="${escapeAttr(post.id)}">Like (${Number(post.likesCount)})</button>
        <button class="button small ghost" type="button" data-action="report-post" data-id="${escapeAttr(post.id)}">Report</button>
        ${canDelete ? `<button class="button small danger" type="button" data-action="delete-post" data-id="${escapeAttr(post.id)}">Delete</button>` : ""}
      </div>
      <div class="comments">
        ${post.comments.length ? post.comments.map(commentView).join("") : '<p class="mini-meta">No comments yet.</p>'}
        ${state.currentUser && state.currentUser.role === "user" ? `
          <form data-form="comment" data-id="${escapeAttr(post.id)}">
            <div class="field">
              <label class="sr-only" for="comment-${escapeAttr(post.id)}">Comment</label>
              <input id="comment-${escapeAttr(post.id)}" name="body" required maxlength="500" placeholder="Add a comment">
            </div>
            <button class="button small primary" type="submit">Comment</button>
          </form>
        ` : ""}
      </div>
    </article>
  `;
}

function commentView(comment) {
  return `
    <div class="comment">
      <span class="avatar">${escapeHtml(initials(comment.author.username))}</span>
      <div>
        <strong>${escapeHtml(comment.author.username)}</strong>
        <small>${dateShort(comment.createdAt)}</small>
        <p>${escapeHtml(comment.body)}</p>
      </div>
    </div>
  `;
}

function publicProfileView(profile, posts, quizResults) {
  return `
    <section class="page">
      ${pageTitle(`${profile.username}'s Profile`, profile.bio || "Community member")}
      <div class="game-layout">
        <div class="panel">
          <div class="profile-head">
            <span class="avatar">${escapeHtml(initials(profile.username))}</span>
            <div>
              <h2>${escapeHtml(profile.username)}</h2>
              <p class="subtle">${escapeHtml(profile.bio || "No bio yet.")}</p>
              <p class="mini-meta">${Number(profile.gamesPlayed || 0)} games played - ${Number(profile.challengesJoined || 0)} challenges joined</p>
            </div>
          </div>
          <div class="button-row">
            ${(profile.favoriteCategories || []).map((category) => `<span class="tag">${escapeHtml(category)}</span>`).join("")}
          </div>
        </div>
        <div class="panel">
          <h2>Quiz Results</h2>
          ${quizResults.length ? quizResults.map((result) => `<p class="subtle">${escapeHtml(result.quizTitle)} - ${escapeHtml(result.resultKey)} - ${Number(result.score)}%</p>`).join("") : '<p class="subtle">No saved quiz results yet.</p>'}
        </div>
      </div>
      <section class="section-band">
        ${sectionHead("Recent Posts", "")}
        <div class="grid">${posts.length ? posts.map(postCard).join("") : emptyState("No public posts.", "This member has not posted yet.")}</div>
      </section>
    </section>
  `;
}

function adminUsers(users) {
  return `
    <section class="admin-section">
      <h2>Users</h2>
      <div class="admin-list">
        ${users.map((user) => `
          <div class="admin-row">
            <strong>${escapeHtml(user.username)}</strong>
            <span class="mini-meta">${escapeHtml(user.email)} - ${user.disabled ? "Disabled" : "Active"}</span>
            <div class="inline-actions">
              <button class="button small ghost" type="button" data-action="admin-toggle-user" data-id="${escapeAttr(user.id)}" data-disabled="${user.disabled ? "false" : "true"}">${user.disabled ? "Enable" : "Disable"}</button>
              <button class="button small danger" type="button" data-action="admin-delete-user" data-id="${escapeAttr(user.id)}">Delete</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function adminReports(reports) {
  return `
    <section class="admin-section">
      <h2>Reports</h2>
      <div class="admin-list">
        ${reports.length ? reports.map((report) => `
          <div class="admin-row">
            <strong>${escapeHtml(report.reason)} - ${escapeHtml(report.itemType)} ${escapeHtml(report.itemId)}</strong>
            <span class="mini-meta">By ${escapeHtml(report.reporter.username)} - ${report.reviewed ? "Reviewed" : "Open"}</span>
            <span>${escapeHtml(report.details || "No details.")}</span>
            <button class="button small primary" type="button" data-action="admin-review-report" data-id="${escapeAttr(report.id)}" ${report.reviewed ? "disabled" : ""}>Mark Reviewed</button>
          </div>
        `).join("") : emptyState("No reports.", "Moderation queue is clear.")}
      </div>
    </section>
  `;
}

function adminPosts(posts) {
  return `
    <section class="admin-section">
      <h2>Posts</h2>
      <div class="admin-list">
        ${posts.slice(0, 8).map((post) => `
          <div class="admin-row">
            <strong>${escapeHtml(post.author.username)}</strong>
            <span>${escapeHtml(post.body)}</span>
            <button class="button small danger" type="button" data-action="admin-delete-post" data-id="${escapeAttr(post.id)}">Delete Post</button>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function adminCreateForms() {
  return `
    <section class="admin-section">
      <h2>Create Content</h2>
      <div class="admin-tabs">
        <button class="button small ghost" type="button" data-action="show-admin-form" data-target="game-form">Game</button>
        <button class="button small ghost" type="button" data-action="show-admin-form" data-target="quiz-form">Quiz</button>
        <button class="button small ghost" type="button" data-action="show-admin-form" data-target="article-form">Article</button>
        <button class="button small ghost" type="button" data-action="show-admin-form" data-target="poll-form">Poll</button>
        <button class="button small ghost" type="button" data-action="show-admin-form" data-target="challenge-form">Challenge</button>
      </div>
      <div class="game-panel">
        ${adminCreateForm("game-form", "games", ["title", "category", "description", "imageLabel"])}
        ${adminCreateForm("quiz-form", "quizzes", ["title", "category", "description", "question", "answerA", "answerB", "answerC", "resultTitle", "resultDescription"], true)}
        ${adminCreateForm("article-form", "articles", ["title", "category", "excerpt", "content", "author"], true)}
        ${adminCreateForm("poll-form", "polls", ["question", "category", "options"], true)}
        ${adminCreateForm("challenge-form", "challenges", ["title", "category", "description", "difficulty", "startDate", "endDate"], true)}
      </div>
    </section>
  `;
}

function adminCreateForm(id, collection, fields, hidden = false) {
  return `
    <form id="${escapeAttr(id)}" class="panel ${hidden ? "sr-only" : ""}" data-form="admin-create" data-collection="${escapeAttr(collection)}">
      <h3>Add ${escapeHtml(collection.slice(0, -1))}</h3>
      ${fields.map((field) => `
        <div class="field">
          <label for="${escapeAttr(id)}-${escapeAttr(field)}">${escapeHtml(titleCase(field))}</label>
          ${field === "content" || field === "description" || field === "excerpt" || field === "options" || field === "resultDescription"
            ? `<textarea id="${escapeAttr(id)}-${escapeAttr(field)}" name="${escapeAttr(field)}" ${field === "options" ? 'placeholder="One option per line"' : ""}></textarea>`
            : `<input id="${escapeAttr(id)}-${escapeAttr(field)}" name="${escapeAttr(field)}" ${field.toLowerCase().includes("date") ? 'type="date"' : ""}>`}
        </div>
      `).join("")}
      <button class="button primary" type="submit">Create</button>
    </form>
  `;
}

function adminContentList(collection, items) {
  return `
    <section class="admin-section">
      <h2>${escapeHtml(titleCase(collection))}</h2>
      <div class="admin-list">
        ${items.slice(0, 10).map((item) => `
          <div class="admin-row">
            <strong>${escapeHtml(item.title || item.question || item.id)}</strong>
            <span class="mini-meta">${escapeHtml(item.category || "")}</span>
            <button class="button small danger" type="button" data-action="admin-delete-content" data-collection="${escapeAttr(collection)}" data-id="${escapeAttr(item.id)}">Delete</button>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  try {
    if (action === "toggle-nav") {
      state.navOpen = !state.navOpen;
      renderNav(getRoute().path);
      return;
    }

    if (action === "logout") {
      await api("/api/auth/logout", { method: "POST" });
      state.currentUser = null;
      state.csrfToken = null;
      await refresh();
      window.location.hash = "#/";
      showToast("Logged out.");
      return;
    }

    if (action === "vote-wyr") {
      await requireMemberAction();
      const data = await api("/api/games/would-you-rather/vote", {
        method: "POST",
        body: { roundId: button.dataset.id, option: button.dataset.option }
      });
      applyBootstrap(data);
      renderRoute();
      showToast("Vote saved.");
      return;
    }

    if (action === "respond-never") {
      await requireMemberAction();
      const data = await api("/api/games/never-have-i-ever/respond", {
        method: "POST",
        body: { statementId: button.dataset.id, response: button.dataset.response }
      });
      applyBootstrap(data);
      renderRoute();
      showToast("Response saved.");
      return;
    }

    if (action === "get-prompt") {
      const prompt = await api(`/api/games/truth-dare?type=${encodeURIComponent(button.dataset.type)}`);
      const target = document.getElementById("truth-dare-prompt");
      if (target) target.textContent = prompt.text;
      return;
    }

    if (action === "spin-wheel") {
      spinWheel();
      return;
    }

    if (action === "start-premium") {
      await requireMemberAction();
      showToast("Secure payment is not connected yet. No charge was made.");
      return;
    }

    if (action === "new-clue") {
      state.currentClue = await api("/api/games/clue");
      renderRoute();
      return;
    }

    if (action === "join-challenge") {
      await requireMemberAction();
      const data = await api(`/api/challenges/${encodeURIComponent(button.dataset.id)}/join`, { method: "POST" });
      applyBootstrap(data);
      renderRoute();
      showToast("Challenge joined.");
      return;
    }

    if (action === "vote-poll") {
      await requireMemberAction();
      const data = await api(`/api/polls/${encodeURIComponent(button.dataset.pollId)}/vote`, {
        method: "POST",
        body: { optionId: button.dataset.optionId }
      });
      applyBootstrap(data);
      renderRoute();
      showToast("Poll vote saved.");
      return;
    }

    if (action === "like-post") {
      await requireMemberAction();
      const data = await api(`/api/posts/${encodeURIComponent(button.dataset.id)}/like`, { method: "POST" });
      applyBootstrap(data);
      renderRoute();
      return;
    }

    if (action === "delete-post") {
      await api(`/api/posts/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
      await refresh();
      renderRoute();
      showToast("Post deleted.");
      return;
    }

    if (action === "report-post") {
      await requireMemberAction();
      const reason = window.prompt("Report reason: Spam, Harassment, Sexual content, Hate speech, Scam, Other", "Other");
      if (!reason) return;
      await api("/api/reports", {
        method: "POST",
        body: { itemType: "post", itemId: button.dataset.id, reason, details: "Reported from community page." }
      });
      showToast("Report sent for review.");
      return;
    }

    if (action === "show-admin-form") {
      document.querySelectorAll("[data-form='admin-create']").forEach((form) => form.classList.add("sr-only"));
      const target = document.getElementById(button.dataset.target);
      if (target) target.classList.remove("sr-only");
      return;
    }

    if (action === "admin-toggle-user") {
      await api(`/api/admin/users/${encodeURIComponent(button.dataset.id)}`, {
        method: "PATCH",
        body: { disabled: button.dataset.disabled === "true" }
      });
      await renderRoute();
      showToast("User updated.");
      return;
    }

    if (action === "admin-delete-user") {
      if (!window.confirm("Delete this user account?")) return;
      await api(`/api/admin/users/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
      await renderRoute();
      showToast("User deleted.");
      return;
    }

    if (action === "admin-delete-post") {
      await api(`/api/admin/posts/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
      await refresh();
      await renderRoute();
      showToast("Post removed.");
      return;
    }

    if (action === "admin-review-report") {
      await api(`/api/admin/reports/${encodeURIComponent(button.dataset.id)}`, { method: "PATCH" });
      await renderRoute();
      showToast("Report reviewed.");
      return;
    }

    if (action === "admin-delete-content") {
      await api(`/api/admin/${encodeURIComponent(button.dataset.collection)}/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
      await refresh();
      await renderRoute();
      showToast("Content deleted.");
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  const kind = form.dataset.form;
  const formData = new FormData(form);

  try {
    if (kind === "search") {
      const q = String(formData.get("q") || "").trim();
      window.location.hash = `#/search?q=${encodeURIComponent(q)}`;
      return;
    }

    if (kind === "login") {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: {
          identifier: formData.get("identifier"),
          password: formData.get("password")
        }
      });
      applyBootstrap(data);
      window.location.hash = state.currentUser.role === "admin" ? "#/admin" : "#/";
      showToast("Welcome back.");
      return;
    }

    if (kind === "register") {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: {
          username: formData.get("username"),
          email: formData.get("email"),
          password: formData.get("password"),
          dateOfBirth: formData.get("dateOfBirth"),
          confirmAdult: formData.get("confirmAdult") === "on"
        }
      });
      applyBootstrap(data);
      window.location.hash = "#/";
      showToast("Account created.");
      return;
    }

    if (kind === "quiz") {
      await requireSignedInAction();
      const answers = {};
      form.querySelectorAll("input[type='radio']:checked").forEach((input) => {
        answers[input.name] = input.value;
      });
      const result = await api(`/api/quizzes/${encodeURIComponent(form.dataset.id)}/submit`, {
        method: "POST",
        body: { answers }
      });
      const target = document.getElementById("quiz-result");
      if (target) {
        target.innerHTML = `
          <div class="result-box" style="margin-top: 1rem;">
            <p class="eyebrow">Your result</p>
            <h2>${escapeHtml(result.result.title)}</h2>
            <p>${escapeHtml(result.result.description)}</p>
            <p class="mini-meta">Score: ${Number(result.score)}%</p>
            <div class="button-row">
              <button class="button secondary" type="button" data-action="share-result" disabled>Share Coming Soon</button>
              <a class="button ghost" href="#/quiz?id=${escapeAttr(form.dataset.id)}">Retake</a>
            </div>
          </div>
        `;
      }
      await refresh();
      showToast("Quiz result saved.");
      return;
    }

    if (kind === "clue") {
      const result = await api("/api/games/clue/check", {
        method: "POST",
        body: {
          clueId: formData.get("clueId"),
          guess: formData.get("guess")
        }
      });
      showToast(result.correct ? "Correct." : `Not quite. Answer: ${result.answer}`);
      return;
    }

    if (kind === "post") {
      await requireMemberAction();
      const data = await api("/api/posts", {
        method: "POST",
        body: { body: formData.get("body") }
      });
      applyBootstrap(data);
      renderRoute();
      showToast("Post created.");
      return;
    }

    if (kind === "comment") {
      await requireMemberAction();
      const data = await api(`/api/posts/${encodeURIComponent(form.dataset.id)}/comments`, {
        method: "POST",
        body: { body: formData.get("body") }
      });
      applyBootstrap(data);
      renderRoute();
      return;
    }

    if (kind === "profile") {
      const categories = formData.getAll("favoriteCategories");
      const data = await api("/api/profile", {
        method: "PATCH",
        body: {
          username: formData.get("username"),
          bio: formData.get("bio"),
          profilePicture: formData.get("profilePicture"),
          favoriteCategories: categories
        }
      });
      applyBootstrap(data);
      renderRoute();
      showToast("Profile saved.");
      return;
    }

    if (kind === "admin-create") {
      const body = Object.fromEntries(formData.entries());
      if (body.options) {
        body.options = body.options.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      }
      await api(`/api/admin/${encodeURIComponent(form.dataset.collection)}`, {
        method: "POST",
        body
      });
      form.reset();
      await refresh();
      await renderRoute();
      showToast("Content created.");
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function api(path, options = {}) {
  const method = options.method || "GET";
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };
  if (method !== "GET" && state.csrfToken) {
    headers["X-CSRF-Token"] = state.csrfToken;
  }

  const response = await fetch(path, {
    ...options,
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

async function requireMemberAction() {
  if (!state.currentUser || state.currentUser.role !== "user") {
    window.location.hash = "#/login";
    throw new Error("Please sign in as a member to continue.");
  }
}

async function requireSignedInAction() {
  if (!state.currentUser) {
    window.location.hash = "#/login";
    throw new Error("Please sign in to continue.");
  }
}

function spinWheel() {
  const categories = ["Truth", "Dare", "Challenge", "Question", "Random"];
  const prompts = {
    Truth: "What is one small luxury you think is underrated?",
    Dare: "Give someone a specific compliment before the next round.",
    Challenge: "Share one thing you want to try this month.",
    Question: "What is a perfect low-pressure night out?",
    Random: "Name a song that always changes the mood."
  };
  const category = categories[Math.floor(Math.random() * categories.length)];
  state.wheelRotation += 720 + Math.floor(Math.random() * 360);
  const wheel = document.getElementById("wheel");
  const result = document.getElementById("wheel-result");
  if (wheel) wheel.style.transform = `rotate(${state.wheelRotation}deg)`;
  if (result) {
    result.textContent = "Spinning...";
    window.setTimeout(() => {
      result.textContent = `${category}: ${prompts[category]}`;
    }, 850);
  }
}

function showToast(message, type = "success") {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type === "error" ? "error" : ""}`;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toastEl.className = "toast";
  }, 3200);
}

function authRequired(message) {
  return `
    <section class="page narrow">
      <div class="panel soft">
        <h1>Sign in required</h1>
        <p class="subtle">${escapeHtml(message)}</p>
        <div class="button-row">
          <a class="button primary" href="#/login">Login</a>
          <a class="button secondary" href="#/register">Register</a>
        </div>
      </div>
    </section>
  `;
}

function errorView(title, message) {
  return `
    <section class="error-page">
      <div class="error-panel">
        <p class="eyebrow">Notice</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        <a class="button primary" href="#/">Go Home</a>
      </div>
    </section>
  `;
}

function emptyState(title, message) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function paragraphs(text) {
  return String(text || "")
    .split(/\n+/)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const value = item[key] || "Other";
    groups[value] = groups[value] || [];
    groups[value].push(item);
    return groups;
  }, {});
}

function titleCase(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function shortLabel(value) {
  const words = String(value || "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (!words.length) return "HC";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function initials(value) {
  return shortLabel(value).slice(0, 2);
}

function dateShort(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
