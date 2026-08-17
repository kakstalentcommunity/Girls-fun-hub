const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const SEED_FILE = path.join(DATA_DIR, "seed.json");
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const BODY_LIMIT_BYTES = 1024 * 1024;

const sessions = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function now() {
  return new Date().toISOString();
}

function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const db = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
    const adminPassword = process.env.GFH_ADMIN_PASSWORD || "ChangeMe-Admin-2026";
    const demoPassword = process.env.GFH_DEMO_PASSWORD || "ChangeMe-User-2026";

    db.admin_users = db.admin_users.map((admin) => ({
      ...admin,
      passwordHash: hashPassword(adminPassword),
      createdAt: admin.createdAt || now()
    }));

    db.users = db.users.map((user) => ({
      ...user,
      passwordHash: hashPassword(demoPassword),
      createdAt: user.createdAt || now()
    }));

    fs.writeFileSync(DB_FILE, `${JSON.stringify(db, null, 2)}\n`);
  }
}

function loadDb() {
  ensureDataStore();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, `${JSON.stringify(db, null, 2)}\n`);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(actual, "hex"));
}

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, details) {
  sendJson(res, status, { error: message, details });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > BODY_LIMIT_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((cookies, part) => {
    const [key, ...value] = part.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value.join("="));
    return cookies;
  }, {});
}

function createSession(res, role, subjectId) {
  const id = crypto.randomBytes(32).toString("hex");
  const csrf = crypto.randomBytes(32).toString("hex");
  sessions.set(id, {
    id,
    role,
    subjectId,
    csrf,
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  res.setHeader(
    "Set-Cookie",
    `gfh_session=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
  );
  return sessions.get(id);
}

function clearSession(req, res) {
  const id = parseCookies(req).gfh_session;
  if (id) sessions.delete(id);
  res.setHeader("Set-Cookie", "gfh_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function getSession(req) {
  const id = parseCookies(req).gfh_session;
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(id);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

function requireUser(req, res) {
  const session = getSession(req);
  if (!session || session.role !== "user") {
    sendError(res, 401, "Please sign in to continue.");
    return null;
  }
  return session;
}

function requireSignedIn(req, res) {
  const session = getSession(req);
  if (!session) {
    sendError(res, 401, "Please sign in to continue.");
    return null;
  }
  return session;
}

function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    sendError(res, 403, "Admin access is required.");
    return null;
  }
  return session;
}

function requireCsrf(req, res, session) {
  const token = req.headers["x-csrf-token"];
  if (!session || !token || token !== session.csrf) {
    sendError(res, 403, "Security token check failed. Refresh the page and try again.");
    return false;
  }
  return true;
}

function nextId(db, key, prefix) {
  db.meta.nextIds[key] = Number(db.meta.nextIds[key] || 1) + 1;
  return `${prefix}${db.meta.nextIds[key] - 1}`;
}

function getPublicUser(db, userId) {
  const user = db.users.find((item) => item.id === userId);
  const profile = db.user_profiles[userId] || {};
  if (!user) {
    return {
      id: userId,
      username: "Former member",
      profilePicture: "",
      bio: "",
      favoriteCategories: []
    };
  }
  return {
    id: user.id,
    username: user.username,
    joinedAt: user.createdAt,
    disabled: Boolean(user.disabled),
    profilePicture: profile.profilePicture || "",
    bio: profile.bio || "",
    favoriteCategories: profile.favoriteCategories || [],
    gamesPlayed: profile.gamesPlayed || 0,
    challengesJoined: profile.challengesJoined || 0
  };
}

function getCurrentSubject(db, session) {
  if (!session) return null;
  if (session.role === "admin") {
    const admin = db.admin_users.find((item) => item.id === session.subjectId);
    if (!admin) return null;
    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: "admin"
    };
  }
  const user = db.users.find((item) => item.id === session.subjectId);
  if (!user) return null;
  return {
    ...getPublicUser(db, user.id),
    email: user.email,
    role: "user"
  };
}

function postWithDetails(db, post, currentUserId) {
  const likes = db.likes.filter((like) => like.targetType === "post" && like.targetId === post.id);
  const comments = db.comments
    .filter((comment) => comment.postId === post.id)
    .map((comment) => ({
      ...comment,
      author: getPublicUser(db, comment.userId)
    }));

  return {
    ...post,
    author: getPublicUser(db, post.userId),
    likesCount: likes.length,
    likedByMe: Boolean(currentUserId && likes.some((like) => like.userId === currentUserId)),
    comments
  };
}

function pollWithTotals(poll, currentUserId) {
  const totalVotes = poll.options.reduce((sum, option) => sum + Number(option.votes || 0), 0);
  const userVote = poll.userVotes.find((vote) => vote.userId === currentUserId);
  return {
    ...poll,
    totalVotes,
    myVote: userVote ? userVote.optionId : null,
    options: poll.options.map((option) => ({
      ...option,
      percent: totalVotes ? Math.round((Number(option.votes || 0) / totalVotes) * 100) : 0
    }))
  };
}

function challengeWithTotals(challenge, currentUserId) {
  const participantIds = challenge.participantIds || [];
  return {
    ...challenge,
    participants: participantIds.length,
    joinedByMe: Boolean(currentUserId && participantIds.includes(currentUserId))
  };
}

function publicBootstrap(db, session) {
  const currentUserId = session && session.role === "user" ? session.subjectId : null;
  const notifications = currentUserId
    ? db.notifications
        .filter((notification) => notification.userId === currentUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  return {
    currentUser: getCurrentSubject(db, session),
    csrfToken: session ? session.csrf : null,
    categories: db.categories,
    games: db.games,
    wouldYouRatherRounds: db.wouldYouRatherRounds.map((round) => {
      const associatedVote = round.userVotes.find((vote) => vote.userId === currentUserId);
      return {
        ...round,
        totalVotes: Number(round.votesA || 0) + Number(round.votesB || 0),
        myVote: associatedVote ? associatedVote.option : null
      };
    }),
    neverStatements: db.neverStatements.map((statement) => {
      const response = statement.userResponses.find((item) => item.userId === currentUserId);
      return {
        ...statement,
        myResponse: response ? response.response : null
      };
    }),
    clueChallenges: db.clueChallenges.map(({ answer, ...challenge }) => challenge),
    quizzes: db.quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      imageLabel: quiz.imageLabel,
      questionCount: quiz.questions.length
    })),
    challenges: db.challenges.map((challenge) => challengeWithTotals(challenge, currentUserId)),
    polls: db.polls.map((poll) => pollWithTotals(poll, currentUserId)),
    articles: db.articles,
    entertainment: db.entertainment,
    posts: db.posts
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((post) => postWithDetails(db, post, currentUserId)),
    notifications
  };
}

function isAdult(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `item-${Date.now()}`;
}

function createNotification(db, userId, message, link) {
  if (!userId) return;
  db.notifications.push({
    id: nextId(db, "notification", "n"),
    userId,
    message,
    link,
    read: false,
    createdAt: now()
  });
}

function removePost(db, postId) {
  db.posts = db.posts.filter((post) => post.id !== postId);
  db.comments = db.comments.filter((comment) => comment.postId !== postId);
  db.likes = db.likes.filter((like) => !(like.targetType === "post" && like.targetId === postId));
  db.reports = db.reports.filter((report) => report.itemId !== postId);
}

function searchDb(db, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const includes = (...values) => values.some((value) => String(value || "").toLowerCase().includes(q));
  const results = [];

  db.games.forEach((game) => {
    if (includes(game.title, game.description, game.category)) {
      results.push({
        type: "Game",
        title: game.title,
        description: game.description,
        url: "#/games"
      });
    }
  });

  db.quizzes.forEach((quiz) => {
    if (includes(quiz.title, quiz.description, quiz.category)) {
      results.push({
        type: "Quiz",
        title: quiz.title,
        description: quiz.description,
        url: `#/quiz?id=${quiz.id}`
      });
    }
  });

  db.articles.forEach((article) => {
    if (includes(article.title, article.excerpt, article.category, article.content)) {
      results.push({
        type: "Article",
        title: article.title,
        description: article.excerpt,
        url: `#/article?slug=${article.slug}`
      });
    }
  });

  db.polls.forEach((poll) => {
    if (includes(poll.question, poll.category)) {
      results.push({
        type: "Poll",
        title: poll.question,
        description: `${poll.options.length} options`,
        url: "#/polls"
      });
    }
  });

  db.posts.forEach((post) => {
    if (includes(post.body)) {
      results.push({
        type: "Community",
        title: getPublicUser(db, post.userId).username,
        description: post.body,
        url: "#/community"
      });
    }
  });

  return results.slice(0, 50);
}

async function handleApi(req, res, url) {
  const db = loadDb();
  const session = getSession(req);
  const method = req.method.toUpperCase();
  const pathname = url.pathname;

  try {
    if (method === "GET" && pathname === "/api/bootstrap") {
      sendJson(res, 200, publicBootstrap(db, session));
      return;
    }

    if (method === "GET" && pathname === "/api/auth/me") {
      sendJson(res, 200, {
        currentUser: getCurrentSubject(db, session),
        csrfToken: session ? session.csrf : null
      });
      return;
    }

    if (method === "POST" && pathname === "/api/auth/register") {
      const body = await readBody(req);
      const username = String(body.username || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const dateOfBirth = String(body.dateOfBirth || "");

      if (!username || !email || password.length < 8 || !dateOfBirth) {
        sendError(res, 400, "Username, email, date of birth, and an 8 character password are required.");
        return;
      }

      if (!body.confirmAdult || !isAdult(dateOfBirth)) {
        sendError(res, 400, "Registration is only available to adults 18 years or older.");
        return;
      }

      if (db.users.some((user) => user.email === email || user.username.toLowerCase() === username.toLowerCase())) {
        sendError(res, 409, "That username or email is already registered.");
        return;
      }

      const userId = nextId(db, "user", "u");
      db.users.push({
        id: userId,
        username,
        email,
        passwordHash: hashPassword(password),
        dateOfBirth,
        adultConfirmed: true,
        disabled: false,
        createdAt: now()
      });
      db.user_profiles[userId] = {
        bio: "New here and ready to explore the fun.",
        profilePicture: "",
        favoriteCategories: [],
        gamesPlayed: 0,
        challengesJoined: 0
      };
      saveDb(db);

      const createdSession = createSession(res, "user", userId);
      sendJson(res, 201, publicBootstrap(loadDb(), createdSession));
      return;
    }

    if (method === "POST" && pathname === "/api/auth/login") {
      const body = await readBody(req);
      const identifier = String(body.identifier || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = db.users.find(
        (item) => item.email.toLowerCase() === identifier || item.username.toLowerCase() === identifier
      );

      if (user) {
        if (user.disabled) {
          sendError(res, 403, "This account is disabled.");
          return;
        }
        if (!verifyPassword(password, user.passwordHash)) {
          sendError(res, 401, "The login details were not recognized.");
          return;
        }
        const createdSession = createSession(res, "user", user.id);
        sendJson(res, 200, publicBootstrap(db, createdSession));
        return;
      }

      const admin = db.admin_users.find(
        (item) => item.email.toLowerCase() === identifier || item.username.toLowerCase() === identifier
      );

      if (!admin || !verifyPassword(password, admin.passwordHash)) {
        sendError(res, 401, "The login details were not recognized.");
        return;
      }

      const createdSession = createSession(res, "admin", admin.id);
      sendJson(res, 200, publicBootstrap(db, createdSession));
      return;
    }

    if (method === "POST" && pathname === "/api/auth/logout") {
      clearSession(req, res);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === "GET" && pathname === "/api/search") {
      sendJson(res, 200, { results: searchDb(db, url.searchParams.get("q") || "") });
      return;
    }

    const articleMatch = pathname.match(/^\/api\/articles\/([a-z0-9-]+)$/);
    if (method === "GET" && articleMatch) {
      const article = db.articles.find((item) => item.slug === articleMatch[1]);
      if (!article) {
        sendError(res, 404, "Article not found.");
        return;
      }
      article.views = Number(article.views || 0) + 1;
      saveDb(db);
      sendJson(res, 200, article);
      return;
    }

    const quizGetMatch = pathname.match(/^\/api\/quizzes\/([^/]+)$/);
    if (method === "GET" && quizGetMatch) {
      const quiz = db.quizzes.find((item) => item.id === quizGetMatch[1]);
      if (!quiz) {
        sendError(res, 404, "Quiz not found.");
        return;
      }
      sendJson(res, 200, {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        imageLabel: quiz.imageLabel,
        questions: quiz.questions.map((question) => ({
          id: question.id,
          text: question.text,
          answers: question.answers.map(({ resultKey, ...answer }) => answer)
        }))
      });
      return;
    }

    const quizSubmitMatch = pathname.match(/^\/api\/quizzes\/([^/]+)\/submit$/);
    if (method === "POST" && quizSubmitMatch) {
      const signedIn = requireSignedIn(req, res);
      if (!signedIn || !requireCsrf(req, res, signedIn)) return;
      const body = await readBody(req);
      const quiz = db.quizzes.find((item) => item.id === quizSubmitMatch[1]);
      if (!quiz) {
        sendError(res, 404, "Quiz not found.");
        return;
      }

      const tallies = {};
      let answered = 0;
      quiz.questions.forEach((question) => {
        const selectedId = body.answers ? body.answers[question.id] : null;
        const selected = question.answers.find((answer) => answer.id === selectedId);
        if (selected) {
          answered += 1;
          tallies[selected.resultKey] = (tallies[selected.resultKey] || 0) + 1;
        }
      });

      if (!answered) {
        sendError(res, 400, "Choose at least one answer before submitting.");
        return;
      }

      const resultKey = Object.entries(tallies).sort((a, b) => b[1] - a[1])[0][0];
      const result = quiz.results[resultKey] || Object.values(quiz.results)[0];
      const record = {
        id: nextId(db, "quizResult", "qr"),
        userId: signedIn.role === "user" ? signedIn.subjectId : null,
        quizId: quiz.id,
        resultKey,
        score: Math.round((answered / quiz.questions.length) * 100),
        createdAt: now()
      };
      db.quiz_results.push(record);
      saveDb(db);
      sendJson(res, 200, { ...record, result });
      return;
    }

    if (method === "GET" && pathname === "/api/games/truth-dare") {
      const type = String(url.searchParams.get("type") || "truth").toLowerCase() === "dare" ? "dare" : "truth";
      const prompts = db.game_prompts.filter((prompt) => prompt.gameId === "truth-dare" && prompt.type === type);
      const prompt = prompts[Math.floor(Math.random() * prompts.length)];
      sendJson(res, 200, prompt);
      return;
    }

    if (method === "GET" && pathname === "/api/games/clue") {
      const challenge = db.clueChallenges[Math.floor(Math.random() * db.clueChallenges.length)];
      const { answer, ...publicChallenge } = challenge;
      sendJson(res, 200, publicChallenge);
      return;
    }

    if (method === "POST" && pathname === "/api/games/clue/check") {
      const body = await readBody(req);
      const challenge = db.clueChallenges.find((item) => item.id === body.clueId);
      if (!challenge) {
        sendError(res, 404, "Clue challenge not found.");
        return;
      }
      const guess = String(body.guess || "").trim().toLowerCase();
      const correct = guess === challenge.answer.toLowerCase();
      sendJson(res, 200, {
        correct,
        answer: challenge.answer
      });
      return;
    }

    if (method === "POST" && pathname === "/api/games/would-you-rather/vote") {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const body = await readBody(req);
      const round = db.wouldYouRatherRounds.find((item) => item.id === body.roundId);
      const option = body.option === "B" ? "B" : "A";
      if (!round) {
        sendError(res, 404, "Round not found.");
        return;
      }
      const existing = round.userVotes.find((vote) => vote.userId === userSession.subjectId);
      if (existing && existing.option !== option) {
        if (existing.option === "A") round.votesA -= 1;
        if (existing.option === "B") round.votesB -= 1;
        existing.option = option;
        round[`votes${option}`] += 1;
      } else if (!existing) {
        round.userVotes.push({ userId: userSession.subjectId, option });
        round[`votes${option}`] += 1;
      }
      const profile = db.user_profiles[userSession.subjectId];
      if (profile) profile.gamesPlayed = Number(profile.gamesPlayed || 0) + 1;
      saveDb(db);
      sendJson(res, 200, publicBootstrap(db, userSession));
      return;
    }

    if (method === "POST" && pathname === "/api/games/never-have-i-ever/respond") {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const body = await readBody(req);
      const statement = db.neverStatements.find((item) => item.id === body.statementId);
      const response = body.response === "not-yet" ? "not-yet" : "i-have";
      if (!statement) {
        sendError(res, 404, "Statement not found.");
        return;
      }
      const existing = statement.userResponses.find((item) => item.userId === userSession.subjectId);
      if (existing && existing.response !== response) {
        if (existing.response === "i-have") statement.doneCount -= 1;
        if (existing.response === "not-yet") statement.notYetCount -= 1;
        existing.response = response;
        if (response === "i-have") statement.doneCount += 1;
        if (response === "not-yet") statement.notYetCount += 1;
      } else if (!existing) {
        statement.userResponses.push({ userId: userSession.subjectId, response });
        if (response === "i-have") statement.doneCount += 1;
        if (response === "not-yet") statement.notYetCount += 1;
      }
      const profile = db.user_profiles[userSession.subjectId];
      if (profile) profile.gamesPlayed = Number(profile.gamesPlayed || 0) + 1;
      saveDb(db);
      sendJson(res, 200, publicBootstrap(db, userSession));
      return;
    }

    const pollVoteMatch = pathname.match(/^\/api\/polls\/([^/]+)\/vote$/);
    if (method === "POST" && pollVoteMatch) {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const body = await readBody(req);
      const poll = db.polls.find((item) => item.id === pollVoteMatch[1]);
      if (!poll) {
        sendError(res, 404, "Poll not found.");
        return;
      }
      const option = poll.options.find((item) => item.id === body.optionId);
      if (!option) {
        sendError(res, 400, "Choose a valid poll option.");
        return;
      }
      const existing = poll.userVotes.find((vote) => vote.userId === userSession.subjectId);
      if (existing) {
        sendError(res, 409, "You have already voted in this poll.");
        return;
      }
      option.votes = Number(option.votes || 0) + 1;
      poll.userVotes.push({ userId: userSession.subjectId, optionId: option.id, createdAt: now() });
      saveDb(db);
      sendJson(res, 200, publicBootstrap(db, userSession));
      return;
    }

    const challengeJoinMatch = pathname.match(/^\/api\/challenges\/([^/]+)\/join$/);
    if (method === "POST" && challengeJoinMatch) {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const challenge = db.challenges.find((item) => item.id === challengeJoinMatch[1]);
      if (!challenge) {
        sendError(res, 404, "Challenge not found.");
        return;
      }
      challenge.participantIds = challenge.participantIds || [];
      if (!challenge.participantIds.includes(userSession.subjectId)) {
        challenge.participantIds.push(userSession.subjectId);
        const profile = db.user_profiles[userSession.subjectId];
        if (profile) profile.challengesJoined = Number(profile.challengesJoined || 0) + 1;
        createNotification(db, userSession.subjectId, `You joined ${challenge.title}.`, "#/challenges");
      }
      saveDb(db);
      sendJson(res, 200, publicBootstrap(db, userSession));
      return;
    }

    if (method === "POST" && pathname === "/api/posts") {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const body = await readBody(req);
      const text = String(body.body || "").trim();
      if (text.length < 4 || text.length > 800) {
        sendError(res, 400, "Posts must be between 4 and 800 characters.");
        return;
      }
      db.posts.push({
        id: nextId(db, "post", "p"),
        userId: userSession.subjectId,
        body: text,
        createdAt: now()
      });
      saveDb(db);
      sendJson(res, 201, publicBootstrap(db, userSession));
      return;
    }

    const postDeleteMatch = pathname.match(/^\/api\/posts\/([^/]+)$/);
    if (method === "DELETE" && postDeleteMatch) {
      const signedIn = requireSignedIn(req, res);
      if (!signedIn || !requireCsrf(req, res, signedIn)) return;
      const post = db.posts.find((item) => item.id === postDeleteMatch[1]);
      if (!post) {
        sendError(res, 404, "Post not found.");
        return;
      }
      if (signedIn.role !== "admin" && post.userId !== signedIn.subjectId) {
        sendError(res, 403, "You can only delete your own posts.");
        return;
      }
      removePost(db, post.id);
      saveDb(db);
      sendJson(res, 200, publicBootstrap(db, signedIn));
      return;
    }

    const postLikeMatch = pathname.match(/^\/api\/posts\/([^/]+)\/like$/);
    if (method === "POST" && postLikeMatch) {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const post = db.posts.find((item) => item.id === postLikeMatch[1]);
      if (!post) {
        sendError(res, 404, "Post not found.");
        return;
      }
      const existingIndex = db.likes.findIndex(
        (like) =>
          like.targetType === "post" &&
          like.targetId === post.id &&
          like.userId === userSession.subjectId
      );
      if (existingIndex >= 0) {
        db.likes.splice(existingIndex, 1);
      } else {
        db.likes.push({
          id: nextId(db, "like", "l"),
          userId: userSession.subjectId,
          targetType: "post",
          targetId: post.id,
          createdAt: now()
        });
        if (post.userId !== userSession.subjectId) {
          createNotification(db, post.userId, `${getPublicUser(db, userSession.subjectId).username} liked your post.`, "#/community");
        }
      }
      saveDb(db);
      sendJson(res, 200, publicBootstrap(db, userSession));
      return;
    }

    const commentMatch = pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
    if (method === "POST" && commentMatch) {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const body = await readBody(req);
      const post = db.posts.find((item) => item.id === commentMatch[1]);
      const text = String(body.body || "").trim();
      if (!post) {
        sendError(res, 404, "Post not found.");
        return;
      }
      if (text.length < 2 || text.length > 500) {
        sendError(res, 400, "Comments must be between 2 and 500 characters.");
        return;
      }
      db.comments.push({
        id: nextId(db, "comment", "c"),
        postId: post.id,
        userId: userSession.subjectId,
        body: text,
        createdAt: now()
      });
      if (post.userId !== userSession.subjectId) {
        createNotification(db, post.userId, `${getPublicUser(db, userSession.subjectId).username} commented on your post.`, "#/community");
      }
      saveDb(db);
      sendJson(res, 201, publicBootstrap(db, userSession));
      return;
    }

    if (method === "POST" && pathname === "/api/reports") {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const body = await readBody(req);
      const allowedReasons = ["Spam", "Harassment", "Sexual content", "Hate speech", "Scam", "Other"];
      if (!allowedReasons.includes(body.reason)) {
        sendError(res, 400, "Choose a valid report reason.");
        return;
      }
      db.reports.push({
        id: nextId(db, "report", "r"),
        userId: userSession.subjectId,
        itemType: String(body.itemType || "post"),
        itemId: String(body.itemId || ""),
        reason: body.reason,
        details: String(body.details || "").slice(0, 500),
        reviewed: false,
        createdAt: now()
      });
      saveDb(db);
      sendJson(res, 201, { ok: true });
      return;
    }

    if (method === "PATCH" && pathname === "/api/profile") {
      const userSession = requireUser(req, res);
      if (!userSession || !requireCsrf(req, res, userSession)) return;
      const body = await readBody(req);
      const user = db.users.find((item) => item.id === userSession.subjectId);
      const profile = db.user_profiles[userSession.subjectId];
      const username = String(body.username || "").trim();
      if (username && username.toLowerCase() !== user.username.toLowerCase()) {
        if (db.users.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
          sendError(res, 409, "That username is already taken.");
          return;
        }
        user.username = username;
      }
      profile.bio = String(body.bio || "").slice(0, 300);
      profile.profilePicture = String(body.profilePicture || "").slice(0, 300);
      profile.favoriteCategories = Array.isArray(body.favoriteCategories)
        ? body.favoriteCategories.slice(0, 8).map((item) => String(item).slice(0, 40))
        : [];
      saveDb(db);
      sendJson(res, 200, publicBootstrap(db, userSession));
      return;
    }

    const profileMatch = pathname.match(/^\/api\/profiles\/([^/]+)$/);
    if (method === "GET" && profileMatch) {
      const user = db.users.find((item) => item.id === profileMatch[1]);
      if (!user) {
        sendError(res, 404, "Profile not found.");
        return;
      }
      const profile = getPublicUser(db, user.id);
      const posts = db.posts
        .filter((post) => post.userId === user.id)
        .map((post) => postWithDetails(db, post, session && session.subjectId));
      const quizResults = db.quiz_results
        .filter((result) => result.userId === user.id)
        .map((result) => {
          const quiz = db.quizzes.find((item) => item.id === result.quizId);
          return { ...result, quizTitle: quiz ? quiz.title : "Quiz" };
        });
      sendJson(res, 200, { profile, posts, quizResults });
      return;
    }

    if (pathname.startsWith("/api/admin")) {
      await handleAdminApi(req, res, url, db);
      return;
    }

    sendError(res, 404, "API endpoint not found.");
  } catch (error) {
    sendError(res, 500, "Something went wrong. Please try again.", process.env.NODE_ENV === "development" ? error.message : undefined);
  }
}

async function handleAdminApi(req, res, url, db) {
  const adminSession = requireAdmin(req, res);
  if (!adminSession) return;
  if (req.method !== "GET" && !requireCsrf(req, res, adminSession)) return;

  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  if (method === "GET" && pathname === "/api/admin/dashboard") {
    sendJson(res, 200, {
      counts: {
        users: db.users.length,
        posts: db.posts.length,
        games: db.games.length,
        quizzes: db.quizzes.length,
        articles: db.articles.length,
        polls: db.polls.length,
        challenges: db.challenges.length,
        reports: db.reports.filter((report) => !report.reviewed).length
      },
      users: db.users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        disabled: Boolean(user.disabled),
        createdAt: user.createdAt
      })),
      posts: db.posts.map((post) => postWithDetails(db, post, null)),
      games: db.games,
      quizzes: db.quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        category: quiz.category,
        questionCount: quiz.questions.length
      })),
      articles: db.articles,
      polls: db.polls.map((poll) => pollWithTotals(poll, null)),
      challenges: db.challenges.map((challenge) => challengeWithTotals(challenge, null)),
      reports: db.reports.map((report) => ({
        ...report,
        reporter: getPublicUser(db, report.userId)
      }))
    });
    return;
  }

  const userPatchMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (method === "PATCH" && userPatchMatch) {
    const body = await readBody(req);
    const user = db.users.find((item) => item.id === userPatchMatch[1]);
    if (!user) {
      sendError(res, 404, "User not found.");
      return;
    }
    user.disabled = Boolean(body.disabled);
    saveDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === "DELETE" && userPatchMatch) {
    const user = db.users.find((item) => item.id === userPatchMatch[1]);
    if (!user) {
      sendError(res, 404, "User not found.");
      return;
    }
    user.disabled = true;
    user.email = `deleted-${user.id}@girlsfunhub.local`;
    user.username = `Deleted ${user.id}`;
    delete db.user_profiles[user.id];
    saveDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  const postDeleteMatch = pathname.match(/^\/api\/admin\/posts\/([^/]+)$/);
  if (method === "DELETE" && postDeleteMatch) {
    removePost(db, postDeleteMatch[1]);
    saveDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  const reportPatchMatch = pathname.match(/^\/api\/admin\/reports\/([^/]+)$/);
  if (method === "PATCH" && reportPatchMatch) {
    const report = db.reports.find((item) => item.id === reportPatchMatch[1]);
    if (!report) {
      sendError(res, 404, "Report not found.");
      return;
    }
    report.reviewed = true;
    report.reviewedAt = now();
    saveDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  const collectionMatch = pathname.match(/^\/api\/admin\/(games|articles|polls|challenges|quizzes)(?:\/([^/]+))?$/);
  if (collectionMatch) {
    const collection = collectionMatch[1];
    const id = collectionMatch[2];

    if (method === "DELETE" && id) {
      db[collection] = db[collection].filter((item) => item.id !== id);
      saveDb(db);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === "POST" && !id) {
      const body = await readBody(req);
      if (collection === "games") {
        db.games.push({
          id: slugify(body.title),
          title: String(body.title || "New Game").slice(0, 120),
          category: String(body.category || "Quick Games").slice(0, 80),
          description: String(body.description || "A new interactive game.").slice(0, 280),
          imageLabel: String(body.imageLabel || "Play").slice(0, 20)
        });
      }

      if (collection === "articles") {
        const title = String(body.title || "New Article").slice(0, 140);
        let slug = slugify(title);
        while (db.articles.some((article) => article.slug === slug)) {
          slug = `${slugify(title)}-${Math.floor(Math.random() * 9999)}`;
        }
        db.articles.push({
          id: nextId(db, "article", "a"),
          title,
          slug,
          excerpt: String(body.excerpt || "A fresh lifestyle read from Girls Fun Hub.").slice(0, 240),
          content: String(body.content || "Add your article content here.").slice(0, 6000),
          featuredImage: "",
          category: String(body.category || "Lifestyle").slice(0, 80),
          author: String(body.author || "Girls Fun Hub").slice(0, 80),
          date: now().slice(0, 10),
          views: 0,
          published: true
        });
      }

      if (collection === "polls") {
        const options = Array.isArray(body.options) ? body.options : String(body.options || "").split("\n");
        db.polls.push({
          id: nextId(db, "poll", "po"),
          question: String(body.question || "New poll question?").slice(0, 180),
          category: String(body.category || "Community").slice(0, 80),
          options: options
            .map((text, index) => ({ id: `opt${Date.now()}${index}`, text: String(text).trim().slice(0, 120), votes: 0 }))
            .filter((option) => option.text),
          userVotes: [],
          createdAt: now()
        });
      }

      if (collection === "challenges") {
        db.challenges.push({
          id: nextId(db, "challenge", "ch"),
          title: String(body.title || "New Challenge").slice(0, 140),
          description: String(body.description || "A fresh community challenge.").slice(0, 300),
          category: String(body.category || "Community").slice(0, 80),
          difficulty: String(body.difficulty || "Easy").slice(0, 40),
          startDate: String(body.startDate || now().slice(0, 10)),
          endDate: String(body.endDate || now().slice(0, 10)),
          participantIds: []
        });
      }

      if (collection === "quizzes") {
        const title = String(body.title || "New Quiz").slice(0, 140);
        db.quizzes.push({
          id: slugify(title),
          title,
          description: String(body.description || "A quick personality quiz.").slice(0, 240),
          category: String(body.category || "Personality").slice(0, 80),
          imageLabel: "Quiz",
          results: {
            a: {
              title: String(body.resultTitle || "The Bright Spark").slice(0, 120),
              description: String(body.resultDescription || "You bring a clear point of view and good energy.").slice(0, 300)
            }
          },
          questions: [
            {
              id: "q1",
              text: String(body.question || "Pick the answer that feels most like you.").slice(0, 180),
              answers: [
                { id: "a1", text: String(body.answerA || "A bold choice").slice(0, 120), resultKey: "a" },
                { id: "a2", text: String(body.answerB || "A calm choice").slice(0, 120), resultKey: "a" },
                { id: "a3", text: String(body.answerC || "A curious choice").slice(0, 120), resultKey: "a" }
              ]
            }
          ]
        });
      }

      saveDb(db);
      sendJson(res, 201, { ok: true });
      return;
    }
  }

  sendError(res, 404, "Admin endpoint not found.");
}

function serveStatic(req, res, url) {
  let requested = decodeURIComponent(url.pathname);
  if (requested === "/") requested = "/index.html";
  if (requested === "/robots.txt" || requested === "/sitemap.xml") {
    requested = requested.slice(1);
  }

  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    serveErrorPage(res, 403);
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      serveErrorPage(res, 404);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(data);
  });
}

function serveErrorPage(res, status) {
  const fallback = status === 403 ? "403.html" : status === 500 ? "500.html" : "404.html";
  const filePath = path.join(PUBLIC_DIR, fallback);
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(status === 403 ? "Access denied." : "Page not found.");
      return;
    }
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url).catch((error) => {
      sendError(res, 500, "Something went wrong. Please try again.", process.env.NODE_ENV === "development" ? error.message : undefined);
    });
    return;
  }
  serveStatic(req, res, url);
});

ensureDataStore();
server.listen(PORT, () => {
  console.log(`Girls Fun Hub is running at http://localhost:${PORT}`);
});
