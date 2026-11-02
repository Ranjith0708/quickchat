package com.ranjith.quickchat.chat;

import java.time.Instant;

import com.ranjith.quickchat.user.Status;

import lombok.AllArgsConstructor;
import lombok.Data;

/** One row of the sidebar: a person I have chatted with + the latest message. */
@Data
@AllArgsConstructor
public class ConversationDto {
    private String nickName;
    private String fullName;
    private Status status;
    private Instant lastSeen;
    private String lastMessage;
    private String lastMessageId;
    private boolean lastFromMe;
    private long unreadCount; // messages from this person that I have not seen
}
