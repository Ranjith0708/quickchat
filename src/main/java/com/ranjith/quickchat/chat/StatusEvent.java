package com.ranjith.quickchat.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Pushed to a sender on /user/{nickName}/queue/status.
 *  ACK       - your message was stored (messageId, to, content)
 *  DELIVERED - "from" received your messages up to upToId
 *  SEEN      - "from" opened the chat and read your messages up to upToId
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatusEvent {
    private String type;
    private String from;
    private String to;
    private String messageId;
    private String upToId;
    private String content;
}
