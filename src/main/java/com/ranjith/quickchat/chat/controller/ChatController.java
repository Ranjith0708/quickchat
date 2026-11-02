package com.ranjith.quickchat.chat.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.ranjith.quickchat.chat.ChatMessage;
import com.ranjith.quickchat.chat.ChatMessageService;
import com.ranjith.quickchat.chat.ChatNotification;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ChatController {
    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat")
    public void processChatMessage(@Payload  ChatMessage chatMessage){
        ChatMessage savedMessage = chatMessageService.saveChatMessage(chatMessage);
        messagingTemplate.convertAndSendToUser(chatMessage.getRecipientId(),
         "/queue/messages",
         ChatNotification.builder()
         .chatId(savedMessage.getId())
         .senderId(savedMessage.getSenderId())
         .recipientId(savedMessage.getRecipientId())
         .content(savedMessage.getContent())
         .build()
 );
    }


}
