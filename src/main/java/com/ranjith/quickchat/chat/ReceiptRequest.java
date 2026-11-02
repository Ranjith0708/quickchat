package com.ranjith.quickchat.chat;

import lombok.Data;

/** Sent by the browser to /app/chat.delivered and /app/chat.seen */
@Data
public class ReceiptRequest {
    private String userId;   // the person who received / is reading
    private String otherId;  // the conversation partner (chat.seen only)
}
