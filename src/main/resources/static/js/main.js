"use strict";

/* ===================== Elements ===================== */
const $ = (selector) => document.querySelector(selector);

const userNamePage = $("#username-page");
const chatPage = $("#chat-page");
const userNameForm = $("#usernameForm");
const loginBtn = $("#login-btn");
const loginError = $("#login-error");
const messageForm = $("#messageForm");
const messageInput = $("#message");
const chatArea = $("#chat-messages");
const chatEmpty = $("#chat-empty");
const chatHead = $("#chat-head");
const chatAvatar = $("#chat-avatar");
const chatWithName = $("#chat-with-name");
const chatWithSub = $("#chat-with-sub");
const usersList = $("#connectedUsers");
const usersEmpty = $("#users-empty");
const listHeading = $("#list-heading");
const listCount = $("#list-count");
const searchInput = $("#user-search");
const meName = $("#connected-user-fullname");
const meAvatar = $("#me-avatar");
const logoutBtn = $("#logout");
const backBtn = $("#back-btn");
const themeToggle = $("#theme-toggle");
const toasts = $("#toasts");
const tabLogin = $("#tab-login");
const tabSignup = $("#tab-signup");
const fullnameField = $("#fullname-field");
const fullnameInput = $("#fullname");
const nicknameHint = $("#nickname-hint");
const authSub = $("#auth-sub");
const switchText = $("#switch-text");
const switchModeBtn = $("#switch-mode");

/* ===================== State ===================== */
let authMode = "login"; // "login" | "signup"
let stompClient = null;
let nickName = null;
let fullName = null;
let myTag = null;

let selectedUserId = null;
let selectedInfo = null; // { nickName, fullName, status, lastSeen } of the open chat

let conversations = []; // people I have chatted with (from the server)
let suggestions = []; // registered people, shown when I have no chats yet
let searchResults = [];
let searchTerm = "";

let outgoing = []; // my sent messages in the open chat: { id, status, tick, content }
const receipts = {}; // partner -> { delivered, seen } newest message ids acknowledged

let sidebarTimer = null;
let searchTimer = null;
let sidebarSig = "";
let refreshing = false;
let refreshAgain = false;

const enc = encodeURIComponent;

/* ===================== Helpers ===================== */

function displayName(u) {
  return (u && u.fullName && u.fullName.trim()) || "Unnamed user";
}
function tagText(u) {
  return u && u.tag ? `#${u.tag}` : "";
}
function fullLabel(u) {
  return [displayName(u), tagText(u)].filter(Boolean).join(" ");
}

function setName(el, u) {
  el.textContent = displayName(u);
  const t = tagText(u);
  if (t) {
    const span = document.createElement("span");
    span.className = "user-tag";
    span.textContent = t;
    el.appendChild(span);
  }
}

// Takes a user object now, not a string
function styleAvatar(el, u) {
  el.textContent = initials(displayName(u));
  el.style.setProperty("--hue", hueFor(fullLabel(u)));
}
async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function hueFor(name) {
  let h = 0;
  for (const ch of name || "") h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function isDesktop() {
  return window.matchMedia("(min-width: 761px)").matches;
}

function isOnline(user) {
  return !!user && user.status === "ONLINE";
}

function showLoginError(text) {
  loginError.textContent = text;
  loginError.classList.remove("hidden");
}

function toDate(value) {
  if (
    !(
      typeof value === "string" ||
      typeof value === "number" ||
      value instanceof Date
    )
  )
    return null;
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function formatTime(value) {
  const d = toDate(value);
  return d
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatLastSeen(value) {
  const d = toDate(value);
  if (!d) return "Offline";

  const now = new Date();
  if (now - d < 60 * 1000) return "Last seen just now";

  const time = formatTime(d);
  if (sameDay(d, now)) return `Last seen today at ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `Last seen yesterday at ${time}`;

  const day = d.toLocaleDateString([], { day: "numeric", month: "short" });
  return `Last seen ${day} at ${time}`;
}

/* ===================== Message ticks ===================== */
const RANK = { SENDING: 0, SENT: 1, DELIVERED: 2, SEEN: 3 };
const TICK_LABEL = {
  SENDING: "Sending",
  SENT: "Sent",
  DELIVERED: "Delivered",
  SEEN: "Seen",
};
const TICK_SVG = {
  SENDING:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/></svg>',
  SENT: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  DOUBLE:
    '<svg viewBox="0 0 24 24"><path d="M1.5 12.5 6 17 15.5 7"/><path d="M7.5 12.5 12 17 21.5 7"/></svg>',
};

function normStatus(status) {
  return status === "SEEN" || status === "DELIVERED" ? status : "SENT";
}

function setTick(record, status) {
  record.status = status;
  const label = TICK_LABEL[status];
  record.tick.className = `tick ${status.toLowerCase()}`;
  record.tick.innerHTML =
    status === "SENDING"
      ? TICK_SVG.SENDING
      : status === "SENT"
        ? TICK_SVG.SENT
        : TICK_SVG.DOUBLE;
  record.tick.title = label;
  record.tick.setAttribute("role", "img");
  record.tick.setAttribute("aria-label", label);
}

function statusFor(messageId, partner) {
  const r = receipts[partner];
  if (!r) return "SENT";
  if (r.seen && messageId <= r.seen) return "SEEN";
  if (r.delivered && messageId <= r.delivered) return "DELIVERED";
  return "SENT";
}

function applyReceipts(partner) {
  outgoing.forEach((rec) => {
    if (!rec.id) return;
    const status = statusFor(rec.id, partner);
    if (RANK[status] > RANK[rec.status]) setTick(rec, status);
  });
}

// Events pushed by the server on /user/{me}/queue/status
function onStatusEvent(payload) {
  const ev = JSON.parse(payload.body);

  if (ev.type === "ACK") {
    // The server stored my message: give the waiting bubble its id
    if (ev.to !== selectedUserId) return;
    const rec = outgoing.find((r) => !r.id && r.content === ev.content);
    if (!rec) return;
    rec.id = ev.messageId;
    const status = statusFor(rec.id, ev.to);
    setTick(rec, RANK[status] > RANK.SENT ? status : "SENT");
    return;
  }

  if (ev.type === "DELIVERED" || ev.type === "SEEN") {
    const r =
      receipts[ev.from] || (receipts[ev.from] = { delivered: "", seen: "" });
    if (ev.upToId > r.delivered) r.delivered = ev.upToId; // seen implies delivered
    if (ev.type === "SEEN" && ev.upToId > r.seen) r.seen = ev.upToId;
    if (ev.from === selectedUserId) applyReceipts(ev.from);
  }
}

function sendReceipt(destination, body) {
  if (!stompClient || !stompClient.connected) return;
  try {
    stompClient.send(destination, {}, JSON.stringify(body));
  } catch (e) {
    /* connection closing */
  }
}

// "I received everything waiting for me"
function sendDelivered() {
  sendReceipt("/app/chat.delivered", { userId: nickName });
}

// "I am looking at this chat" (only counts while the tab is visible)
function sendSeen() {
  if (!selectedUserId || document.hidden) return;
  sendReceipt("/app/chat.seen", { userId: nickName, otherId: selectedUserId });
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    sendSeen();
    updateTitle();
    renderSidebar();
  }
});
window.addEventListener("focus", sendSeen);

/* ===================== Login / sign up ===================== */
const AUTH_COPY = {
  login: {
    sub: "Welcome back. Enter your nickname to continue.",
    button: "Log in",
    switchText: "New here?",
    switchButton: "Create an account",
  },
  signup: {
    sub: "Create your identity on Quick Chat. Thanks for being a part of this! 💜",
    button: "Create account",
    switchText: "Already have an account?",
    switchButton: "Log in",
  },
};

function setMode(mode) {
  authMode = mode;
  const copy = AUTH_COPY[mode];
  const isLogin = mode === "login";

  tabLogin.classList.toggle("active", isLogin);
  tabSignup.classList.toggle("active", !isLogin);
  tabLogin.setAttribute("aria-selected", String(isLogin));
  tabSignup.setAttribute("aria-selected", String(!isLogin));

  fullnameField.classList.toggle("hidden", isLogin);
  fullnameInput.required = !isLogin;
  nicknameHint.classList.toggle("hidden", isLogin); // reminder only while signing up

  authSub.textContent = copy.sub;
  switchText.textContent = copy.switchText;
  switchModeBtn.textContent = copy.switchButton;
  loginBtn.textContent = copy.button;
  loginBtn.disabled = false;
  loginError.classList.add("hidden");
}

function resetLoginButton() {
  loginBtn.disabled = false;
  loginBtn.textContent = AUTH_COPY[authMode].button;
}

async function connect(event) {
  event.preventDefault();
  const nick = $("#nickname").value.trim();
  const full = fullnameInput.value.trim();
  if (!nick || (authMode === "signup" && !full)) return;

  loginError.classList.add("hidden");
  loginBtn.disabled = true;
  loginBtn.textContent = authMode === "signup" ? "Creating…" : "Logging in…";

  // Ask once for browser notification permission (needs a user gesture)
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // 1) Check the account with the server
  try {
    const response = await fetch(
      authMode === "signup" ? "/api/users/register" : "/api/users/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickName: nick, fullName: full }),
      },
    );

    if (response.status === 409) {
      showLoginError(
        "That nickname already exists. Log in if it’s yours, or pick another one.",
      );
      resetLoginButton();
      return;
    }
    if (response.status === 404) {
      showLoginError(
        "No account found with that nickname. Sign up to create one.",
      );
      resetLoginButton();
      return;
    }
    if (!response.ok) throw new Error("Request failed");

    const user = await response.json();
    nickName = user.nickName || nick;
    fullName = user.fullName || full || nick;
    myTag = user.tag || null;
  } catch (err) {
    console.error(err);
    showLoginError(
      "Couldn’t reach the server. Check your connection and try again.",
    );
    resetLoginButton();
    return;
  }

  // 2) Open the live connection
  loginBtn.textContent = "Connecting…";
  const socket = new SockJS("/ws");
  stompClient = Stomp.over(socket);
  stompClient.debug = null; // silence console spam
  stompClient.connect({}, onConnected, onError);
}

function onConnected() {
  stompClient.subscribe(`/user/${nickName}/queue/messages`, onMessageReceived);
  stompClient.subscribe(`/user/${nickName}/queue/status`, onStatusEvent);
  // Presence events (login / logout of other users)
  stompClient.subscribe(`/user/public`, onUserEvent);
  stompClient.subscribe(`/topic/public`, onUserEvent);

  // Mark this user ONLINE
  stompClient.send(
    "/app/user.addUser",
    {},
    JSON.stringify({ nickName, fullName, status: "ONLINE" }),
  );

  // Everything people sent while I was away has now reached me
  sendDelivered();

  // Switch screens first so a cosmetic bug can never leave the login card stuck
  userNamePage.classList.add("hidden");
  chatPage.classList.remove("hidden");
  resetLoginButton();

  const me = { fullName, tag: myTag };
  setName(meName, me);
  styleAvatar(meAvatar, me);

  refreshSidebar(true);

  // Keep chats, online status and last seen fresh
  clearInterval(sidebarTimer);
  sidebarTimer = setInterval(() => refreshSidebar(), 3000);
}

function onError() {
  const wasLoggedIn = !chatPage.classList.contains("hidden");
  resetToLogin();
  showLoginError(
    wasLoggedIn
      ? "Connection lost. Log in again to continue."
      : "Couldn’t connect to the server. Check your connection and try again.",
  );
}

/* ===================== Logout ===================== */
function sendDisconnect() {
  stompClient.send(
    "/app/user.disconnectUser",
    {},
    JSON.stringify({ nickName, fullName, status: "OFFLINE" }),
  );
}

function logout() {
  if (stompClient && stompClient.connected) {
    try {
      sendDisconnect();
    } catch (e) {
      /* ignore */
    }
  }
  resetToLogin();
}

function resetToLogin() {
  if (stompClient) {
    try {
      stompClient.disconnect(() => {});
    } catch (e) {
      /* already closed */
    }
  }
  stompClient = null;
  clearInterval(sidebarTimer);
  clearTimeout(searchTimer);
  sidebarTimer = null;
  sidebarSig = "";
  selectedUserId = null;
  selectedInfo = null;
  conversations = [];
  suggestions = [];
  searchResults = [];
  searchTerm = "";
  searchInput.value = "";
  outgoing = [];
  Object.keys(receipts).forEach((k) => delete receipts[k]);
  usersList.innerHTML = "";
  chatArea.innerHTML = "";
  toasts.innerHTML = "";
  closeChat();
  document.title = "Quick Chat";

  chatPage.classList.add("hidden");
  userNamePage.classList.remove("hidden");
  userNameForm.reset();
  setMode("login");
}

// Best effort if the tab is closed while logged in (the server also detects the closed connection)
window.addEventListener("beforeunload", () => {
  if (stompClient && stompClient.connected) {
    try {
      sendDisconnect();
    } catch (e) {
      /* ignore */
    }
  }
});

/* ===================== Sidebar data ===================== */
function onUserEvent() {
  refreshSidebar(true);
}

async function refreshSidebar(force = false) {
  if (!stompClient) return;
  if (refreshing) {
    refreshAgain = refreshAgain || force;
    return;
  }
  refreshing = true;

  try {
    const term = searchTerm;
    const convs = await getJson(`/api/chats/${enc(nickName)}`);

    // Person I am chatting with who has no messages yet: ask for their status directly
    let profile = null;
    if (selectedUserId && !convs.some((c) => c.nickName === selectedUserId)) {
      try {
        profile = await getJson(`/api/users/profile/${enc(selectedUserId)}`);
      } catch (e) {
        /* keep the last known info */
      }
    }

    let sugg = suggestions;
    if (!convs.length && !term) {
      sugg = await getJson(
        `/api/users/search?q=&exclude=${enc(nickName)}&limit=20`,
      );
    }

    let results = searchResults;
    if (term) {
      results = await getJson(
        `/api/users/search?q=${enc(term)}&exclude=${enc(nickName)}&limit=20`,
      );
    }

    if (!stompClient) return; // logged out meanwhile
    if (term !== searchTerm) results = searchResults; // search changed while loading

    // Keep the open chat's status and last seen current
    if (selectedUserId) {
      const open = convs.find((c) => c.nickName === selectedUserId) || profile;
      if (open) {
        selectedInfo = {
          nickName: open.nickName,
          fullName: open.fullName,
          tag: open.tag || null,
          status: open.status,
          lastSeen: open.lastSeen || null,
        };
      }
    }

    conversations = convs;
    suggestions = sugg;
    searchResults = results;

    updateChatHeader(); // "last seen just now" style text ages, so refresh it every tick

    const signature = JSON.stringify([
      convs,
      sugg,
      results,
      selectedInfo,
      searchTerm,
    ]);
    if (!force && signature === sidebarSig) return;
    sidebarSig = signature;
    renderSidebar();
  } catch (err) {
    console.error(err);
  } finally {
    refreshing = false;
    if (refreshAgain) {
      refreshAgain = false;
      refreshSidebar(true);
    }
  }
}

/* ===================== Sidebar view ===================== */
function sidebarView() {
  if (searchTerm) {
    return {
      heading: "Search results",
      mode: "search",
      rows: searchResults,
      empty: `No one found for “${searchTerm}”.`,
    };
  }

  const rows = conversations.slice();
  // A chat that is open but has no messages yet still shows in the list
  if (selectedInfo && !rows.some((r) => r.nickName === selectedInfo.nickName)) {
    rows.unshift({
      ...selectedInfo,
      lastMessage: "",
      lastMessageId: "",
      lastFromMe: false,
      unreadCount: 0,
      pending: true,
    });
  }
  if (rows.length > 0) {
    return { heading: "Chats", mode: "chat", rows, empty: "" };
  }

  return {
    heading: "Suggested people",
    mode: "suggest",
    rows: suggestions,
    empty: "No one else has registered yet.",
  };
}

// Unread shown in the list: the open chat counts as read while the tab is visible
function unreadFor(user) {
  if (user.nickName === selectedUserId && !document.hidden) return 0;
  return user.unreadCount || 0;
}

function renderSidebar() {
  const view = sidebarView();
  listHeading.textContent = view.heading;
  listCount.textContent = view.rows.length;

  usersList.innerHTML = "";
  view.rows.forEach((row) => appendUserElement(row, view.mode));

  usersEmpty.textContent = view.empty;
  usersEmpty.classList.toggle("hidden", view.rows.length > 0);

  updateChatHeader();
  updateTitle();
}

function appendUserElement(user, mode) {
  const online = isOnline(user);
  const isSelected = user.nickName === selectedUserId;
  const count = mode === "chat" ? unreadFor(user) : 0;

  const listItem = document.createElement("li");
  listItem.classList.add("user-item");
  listItem.dataset.user = user.nickName;
  if (isSelected) listItem.classList.add("active");
  if (count > 0) listItem.classList.add("unread");

  const avatar = document.createElement("span");
  avatar.classList.add("avatar", online ? "online" : "offline");
  styleAvatar(avatar, user);

  const meta = document.createElement("div");
  meta.classList.add("user-meta");

  const name = document.createElement("span");
  name.classList.add("user-name");
  setName(name, user);
  meta.appendChild(name);

  const sub = document.createElement("span");
  sub.classList.add("user-sub");
  if (mode === "chat") {
    sub.textContent = user.pending
      ? "New conversation"
      : (user.lastFromMe ? "You: " : "") + (user.lastMessage || "");
  }
  if (sub.textContent) meta.appendChild(sub);

  const side = document.createElement("div");
  side.classList.add("user-side");

  const status = document.createElement("span");
  status.classList.add("user-status", online ? "online" : "offline");
  status.textContent = online ? "Online" : "Offline";
  side.appendChild(status);

  if (count > 0) {
    const badge = document.createElement("span");
    badge.classList.add("nbr-msg");
    badge.textContent = count > 99 ? "99+" : count;
    badge.setAttribute("aria-label", `${count} unread messages`);
    side.appendChild(badge);
  }

  listItem.append(avatar, meta, side);
  listItem.addEventListener("click", () => openChat(user));
  usersList.appendChild(listItem);
}

function updateTitle() {
  let total = 0;
  conversations.forEach((c) => (total += unreadFor(c)));
  document.title = total > 0 ? `(${total}) Quick Chat` : "Quick Chat";
}

function updateChatHeader() {
  if (!selectedUserId) return;
  const online = isOnline(selectedInfo);
  chatWithSub.textContent = online
    ? "Online"
    : formatLastSeen(selectedInfo && selectedInfo.lastSeen);
  chatWithSub.classList.toggle("offline", !online);
  chatAvatar.classList.toggle("online", online);
  chatAvatar.classList.toggle("offline", !online);
}

/* ===================== Search ===================== */
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTerm = searchInput.value.trim();
    if (!searchTerm) {
      searchResults = [];
      renderSidebar();
    }
    refreshSidebar(true);
  }, 250);
});

/* ===================== Open / close a conversation ===================== */
function findKnownUser(userId) {
  return (
    conversations.find((u) => u.nickName === userId) ||
    searchResults.find((u) => u.nickName === userId) ||
    suggestions.find((u) => u.nickName === userId) || {
      nickName: userId,
      fullName: "",
      status: "OFFLINE",
    }
  );
}

function openChat(user) {
  selectedUserId = user.nickName;
  selectedInfo = {
    nickName: user.nickName,
    fullName: user.fullName || "",
    tag: user.tag || null,
    status: user.status || "OFFLINE",
    lastSeen: user.lastSeen || null,
  };

  // Opening the chat reads it: clear the badge right away, the server confirms below
  const conv = conversations.find((c) => c.nickName === user.nickName);
  if (conv) conv.unreadCount = 0;

  // Leave search mode once someone is picked
  if (searchTerm) {
    searchTerm = "";
    searchResults = [];
    searchInput.value = "";
  }

  styleAvatar(chatAvatar, user);
  setName(chatWithName, user);

  chatHead.classList.remove("hidden");
  chatEmpty.classList.add("hidden");
  chatArea.classList.remove("hidden");
  messageForm.classList.remove("hidden");
  chatPage.classList.add("chat-open");

  renderSidebar();
  fetchAndDisplayUserChat();
  if (isDesktop()) messageInput.focus();
}

function closeChat() {
  chatPage.classList.remove("chat-open");
  chatHead.classList.add("hidden");
  chatArea.classList.add("hidden");
  messageForm.classList.add("hidden");
  chatEmpty.classList.remove("hidden");
  outgoing = [];
  if (selectedUserId) {
    selectedUserId = null;
    selectedInfo = null;
    renderSidebar();
  }
}

/* ===================== Messages ===================== */
async function fetchAndDisplayUserChat() {
  const requestedUser = selectedUserId;
  chatArea.innerHTML = "";
  outgoing = [];

  try {
    const history = await getJson(
      `/messages/${enc(nickName)}/${enc(requestedUser)}`,
    );
    if (requestedUser !== selectedUserId) return; // user switched chats meanwhile

    chatArea.innerHTML = "";
    outgoing = [];
    if (history.length === 0) {
      const empty = document.createElement("p");
      empty.classList.add("no-messages");
      empty.textContent = `No messages yet. Say hi to ${displayName(selectedInfo)}.`;
      chatArea.appendChild(empty);
    }
    history.forEach((chat) =>
      displayMessage(chat.senderId, chat.content, {
        id: chat.id,
        status: chat.status,
        timestamp: chat.timestamp,
      }),
    );
    scrollToBottom();

    // Anything from them that I have not marked as seen yet is seen now
    if (history.some((c) => c.senderId !== nickName && c.status !== "SEEN"))
      sendSeen();
  } catch (err) {
    console.error(err);
  }
}

function displayMessage(senderId, content, opts = {}) {
  const placeholder = chatArea.querySelector(".no-messages");
  if (placeholder) placeholder.remove();

  const mine = senderId === nickName;
  const side = mine ? "sender" : "receiver";

  const row = document.createElement("div");
  row.classList.add("msg", side);

  const bubble = document.createElement("div");
  bubble.classList.add("message", side);
  bubble.textContent = content;

  const meta = document.createElement("div");
  meta.classList.add("meta");

  const time = formatTime(opts.timestamp);
  if (time) {
    const timeEl = document.createElement("span");
    timeEl.textContent = time;
    meta.appendChild(timeEl);
  }

  let record = null;
  if (mine) {
    const tick = document.createElement("span");
    record = { id: opts.id || null, status: "SENDING", tick, content };
    setTick(record, record.id ? normStatus(opts.status) : "SENDING");
    meta.appendChild(tick);
    outgoing.push(record);
  }

  row.append(bubble, meta);
  chatArea.appendChild(row);
  return record;
}

async function resolveUser(userId) {
  let u = findKnownUser(userId);
  if (!u.fullName) {
    try {
      u = await getJson(`/api/users/profile/${enc(userId)}`);
    } catch (e) {
      /* keep fallback */
    }
  }
  return u;
}

function onMessageReceived(payload) {
  const message = JSON.parse(payload.body);
  const senderId = message.senderId;

  // It reached this device
  sendDelivered();

  // Message belongs to the chat that is open right now
  if (selectedUserId && selectedUserId === senderId) {
    displayMessage(senderId, message.content, { timestamp: new Date() });
    scrollToBottom();
    sendSeen();
    if (document.hidden) notifyBrowser(selectedInfo, message.content);
    refreshSidebar(true);
    return;
  }

  // Otherwise: refresh the list (unread badge, new chat, latest preview) and notify
  refreshSidebar(true);
  resolveUser(senderId).then((u) => {
    showToast(u, message.content);
    notifyBrowser(u, message.content);
  });
}

function sendMessage(event) {
  event.preventDefault();

  const content = messageInput.value.trim();
  if (!content || !stompClient || !selectedUserId) return;

  const chatMessage = {
    senderId: nickName,
    recipientId: selectedUserId,
    content,
    timestamp: new Date().toISOString(),
  };

  // Works even if the other person is offline: the server stores it for later
  stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
  displayMessage(nickName, content, { timestamp: new Date() }); // shows a clock until the server confirms

  messageInput.value = "";
  scrollToBottom();
  messageInput.focus();
  setTimeout(() => refreshSidebar(true), 500);
}

/* ===================== Notifications ===================== */
function showToast(user, text) {
  const toast = document.createElement("div");
  toast.classList.add("toast");

  const avatar = document.createElement("span");
  avatar.classList.add("avatar");
  styleAvatar(avatar, user);

  const body = document.createElement("div");
  body.classList.add("toast-body");
  const title = document.createElement("strong");
  setName(title, user);
  const msg = document.createElement("span");
  msg.textContent = text;
  body.append(title, msg);

  toast.append(avatar, body);

  const dismiss = () => {
    toast.classList.add("leaving");
    setTimeout(() => toast.remove(), 250);
  };

  toast.addEventListener("click", () => {
    dismiss();
    openChat(user);
  });

  toasts.appendChild(toast);
  while (toasts.children.length > 3) toasts.firstChild.remove();
  setTimeout(dismiss, 5000);
}

function notifyBrowser(user, body) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  if (!document.hidden) return; // in-app toast is enough when the tab is visible
  const n = new Notification(`New message from ${fullLabel(user)}`, { body });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

/* ===================== Theme ===================== */
themeToggle.addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("quickchat-theme", next);
  } catch (e) {
    /* storage unavailable */
  }
});

/* ===================== Events ===================== */
tabLogin.addEventListener("click", () => setMode("login"));
tabSignup.addEventListener("click", () => setMode("signup"));
switchModeBtn.addEventListener("click", () =>
  setMode(authMode === "login" ? "signup" : "login"),
);
setMode("login");

userNameForm.addEventListener("submit", connect);
messageForm.addEventListener("submit", sendMessage);
logoutBtn.addEventListener("click", logout);
backBtn.addEventListener("click", closeChat);
