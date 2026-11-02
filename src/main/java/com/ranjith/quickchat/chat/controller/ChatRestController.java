package com.ranjith.quickchat.chat.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import com.ranjith.quickchat.chat.ChatMessageService;
import com.ranjith.quickchat.chat.ChatMessage;
import java.util.List;

@RestController 
@RequiredArgsConstructor 
public class ChatRestController {
    private final ChatMessageService chatMessageService;

    @GetMapping("/messages/{senderId}/{recipientId}")
    public ResponseEntity<List<ChatMessage>> getChatMessages(@PathVariable String senderId,@PathVariable String recipientId){
        return ResponseEntity.ok(chatMessageService.findChatMessages(senderId,recipientId));
    }
}
