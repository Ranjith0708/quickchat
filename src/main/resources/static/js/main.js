"use strict";
const userNamePage = document.querySelector("#username-page");
const chatPage = document.querySelector("#chat-page");
const userNameForm = document.querySelector("#usernameForm");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#message");
const chatArea = document.querySelector("#chat-messages");
const connectingElement = document.querySelector(".connecting");
const logout = document.querySelector("#logout");

let stompClient = null;
let nickName = null;
let fullName = null;
let selectedUserId = null;

function connect(event) {
  nickName = document.querySelector("#nickname").value.trim();
  fullName = document.querySelector("#fullname").value.trim();
  if (nickName && fullName) {
    userNamePage.classList.add("hidden");
    chatPage.classList.remove("hidden");
    const socket = new SockJS("/ws");
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
  }
  event.preventDefault();
}

function onConnected() {
  stompClient.subscribe(`/user/${nickName}/queue/messages`, onMessageReceived);
  stompClient.subscribe(`/topic/public`, onMessageReceived);
  //register the user
  stompClient.send(
    "/app/user.addUser",
    {},
    JSON.stringify({
      nickName: nickName,
      fullName: fullName,
      status: "ONLINE",
    }),
  );
  document.querySelector("#connected-user-fullname").textContent = fullName;
  //find and display connected users
  findAndDisplayConnectedUsers().then();
}

async function onMessageReceived(payload) {
  await findAndDisplayConnectedUsers();
  const message = JSON.parse(payload.body);
  if (selectedUserId && selectedUserId === message.senderId) {
    displayMessage(message.senderId, message.content);
    chatArea.scrollTop = chatArea.scrollHeight;
  }
  if (selectedUserId) {
    document.querySelector(`#${selectedUserId}`).classList.add("active");
  } else {
    messageForm.classList.add("hidden");
  }

  const notifiedUser = document.getElementById(message.senderId);

  if (notifiedUser && !notifiedUser.classList.contains("active")) {
    const nbrMsg = notifiedUser.querySelector(".nbr-msg");

    if (nbrMsg) {
      nbrMsg.classList.remove("hidden");
      nbrMsg.textContent = "";
    }
  }
}

async function findAndDisplayConnectedUsers() {
  const connectedUsersResponse = await fetch("/api/users/users");
  let connectedUsers = await connectedUsersResponse.json();
  connectedUsers = connectedUsers.filter((user) => user.nickName !== nickName);
  const connectedUsersList = document.getElementById("connectedUsers");
  connectedUsersList.innerHTML = "";
  // connectedUsers.forEach(user => {
  //     appendUserElement(user, connectedUsersList);
  //     if(connectedUsers.index(user) < connectedUsers.length - 1) {
  //         const seperator = document.createElement('li');
  //         seperator.classList.add('seperator');
  //         connectedUsersList.appendChild(seperator);
  //     }
  // })
  connectedUsers.forEach((user, index) => {
    appendUserElement(user, connectedUsersList);

    if (index < connectedUsers.length - 1) {
      const separator = document.createElement("li");
      separator.classList.add("seperator");
      connectedUsersList.appendChild(separator);
    }
  });
}

function appendUserElement(user, connectedUsersList) {
  const listItem = document.createElement("li");
  listItem.classList.add("user-item");
  listItem.id = user.nickName;

  // User profile image
  const userImage = document.createElement("img");
  userImage.src = "/img/user_icon.png";
  //   userImage.alt = "User";

  // User full name
  const userNameSpan = document.createElement("span");
  userNameSpan.classList.add("user-name");
  userNameSpan.textContent = user.nickName;

  // Unread message count
  const receivedMsgs = document.createElement("span");
  receivedMsgs.textContent = "0";
  receivedMsgs.classList.add("nbr-msg", "hidden");

  listItem.appendChild(userImage);
  listItem.appendChild(userNameSpan);
  listItem.appendChild(receivedMsgs);

  listItem.addEventListener("click", userItemClick);

  connectedUsersList.appendChild(listItem);
}

// function appendUserElement(user,connecterUsersList) {
//     const listItem = document.createElement('li');
//     listItem.classList.add('user-item');
//     listItem.id = user.nickName;

//     const userImage = document.createElement('img');
//     userImage.src = '../images/user_icon.png';
//     userImage.alt = user.fullName;

//     const userNameSpan = document.createElement('span');
//     userNameSpan.textContent = user.fullName;

//     const recievedMsgs = document.createElement('span');
//     recievedMsgs.textContent = '0';
//     recievedMsgs.classList.add('nbr-msg','hidden');

//     listItem.appendChild(userImage);
//     listItem.appendChild(userNameSpan);
//     listItem.appendChild(recievedMsgs);

//     listItem.addEventListener('click', userItemClick)

//     connecterUsersList.appendChild(listItem);

// }

// function userItemClick() {
//   document
//     .querySelectorAll(".user-item")
//     .forEach((item) => item.classList.remove("active"));
//   messageForm.classList.remove("hidden");

//   const clickedUser = event.getCurrentTarget;
//   clickedUser.classList.add("active");

//   selectedUserId = clickedUser.getAttribute("id");
//   fetchAndDisplayUserChat().then();

//   const nbrMsg = clickedUser.querySelector(".nbr-msg");
//   nbrMsg.classList.add("hidden");
// }

function userItemClick(event) {
  document.querySelectorAll(".user-item").forEach((item) => {
    item.classList.remove("active");
  });

  messageForm.classList.remove("hidden");

  const clickedUser = event.currentTarget;
  clickedUser.classList.add("active");

  selectedUserId = clickedUser.id;

  fetchAndDisplayUserChat();

  const nbrMsg = clickedUser.querySelector(".nbr-msg");
  nbrMsg.classList.add("hidden");
}

// async function fetchAndDisplayUserChat() {
//   const userChatResponse = await fetch(
//     `/messages/${nickName}/${selectedUserId}`,
//   );
//   const userChat = await userChatResponse.json();
//   chatArea.innerHTML = "";
//   userChat.forEach((chat) => {
//     displayMessage(chat, senderId, chat.content);
//   });
//   chatArea.scrollTop = chatArea.scrollHeight;
// }

// function displayMessage(chat, senderId, content) {
//   const messageContainer = document.createElement("div");
//   messageContainer.classList.add("message");
//   if (senderId === nickName) {
//     messageContainer.classList.add("sender");
//   } else {
//     messageContainer.classList.add("receiver");
//   }
//   const message = document.createElement("p");
//   message.textContent = content;
//   messageContainer.appendChild(messageContainer);
//   chatArea.appendChild(messageContainer);
// }

function onError() {}

// function sendMessage(event) {
//   const messageContent = messageInput.value.trim();
//   if (messageContent && stompClient) {
//     const chatMessage = {
//       senderId: nickName,
//       recipientId: selectedUserId,
//       content: messageContent,
//       timestamp: new Date(),
//     };
//     stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
//     displayMessage(nickName, messageContent);
//   }
//   chatArea.scrollTop = chatArea.scrollHeight;
//   event.preventDefault();
// }

async function fetchAndDisplayUserChat() {
  const userChatResponse = await fetch(
    `/messages/${nickName}/${selectedUserId}`,
  );

  if (!userChatResponse.ok) {
    console.error("Failed to fetch chat history");
    return;
  }

  const userChat = await userChatResponse.json();

  chatArea.innerHTML = "";

  userChat.forEach((chat) => {
    displayMessage(chat.senderId, chat.content);
  });

  chatArea.scrollTop = chatArea.scrollHeight;
}

function displayMessage(senderId, content) {
  const messageContainer = document.createElement("div");

  messageContainer.classList.add("message");

  if (senderId === nickName) {
    messageContainer.classList.add("sender");
  } else {
    messageContainer.classList.add("receiver");
  }

  const message = document.createElement("p");
  message.textContent = content;

  messageContainer.appendChild(message);
  chatArea.appendChild(messageContainer);
}

function sendMessage(event) {
  event.preventDefault();

  const messageContent = messageInput.value.trim();

  if (!messageContent || !stompClient || !selectedUserId) {
    return;
  }

  const chatMessage = {
    senderId: nickName,
    recipientId: selectedUserId,
    content: messageContent,
    timestamp: new Date().toISOString(),
  };

  stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));

  displayMessage(nickName, messageContent);

  messageInput.value = "";
  chatArea.scrollTop = chatArea.scrollHeight;
}

userNameForm.addEventListener("submit", connect, true);
messageForm.addEventListener("submit", sendMessage, true);
