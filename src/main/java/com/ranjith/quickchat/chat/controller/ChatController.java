package com.ranjith.quickchat.chat.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.ranjith.quickchat.chat.ChatMessage;
import com.ranjith.quickchat.chat.ChatMessageService;
import com.ranjith.quickchat.chat.ChatNotification;
import com.ranjith.quickchat.chat.MessageReceiptService;
import com.ranjith.quickchat.chat.ReceiptRequest;
import com.ranjith.quickchat.chat.StatusEvent;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ChatController {
    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageReceiptService receiptService;

    @MessageMapping("/chat")
    public void processChatMessage(@Payload ChatMessage chatMessage) {
        ChatMessage savedMessage = chatMessageService.saveChatMessage(chatMessage);

        // 1) Hand the message to the recipient (if they are connected)
        messagingTemplate.convertAndSendToUser(chatMessage.getRecipientId(),
                "/queue/messages",
                ChatNotification.builder()
                        .chatId(savedMessage.getId())
                        .senderId(savedMessage.getSenderId())
                        .recipientId(savedMessage.getRecipientId())
                        .content(savedMessage.getContent())
                        .build());

        // 2) Tell the sender it was stored (single tick) and give them the message id
        messagingTemplate.convertAndSendToUser(savedMessage.getSenderId(),
                "/queue/status",
                StatusEvent.builder()
                        .type("ACK")
                        .to(savedMessage.getRecipientId())
                        .messageId(savedMessage.getId())
                        .content(savedMessage.getContent())
                        .build());
    }

    /** Recipient's browser received messages (on login, and on every incoming message). */
    @MessageMapping("/chat.delivered")
    public void delivered(@Payload ReceiptRequest request) {
        receiptService.markDelivered(request.getUserId());
    }

    /** Recipient is looking at the chat. */
    @MessageMapping("/chat.seen")
    public void seen(@Payload ReceiptRequest request) {
        receiptService.markSeen(request.getUserId(), request.getOtherId());
    }
}
