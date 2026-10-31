package com.ranjith.quickchat.chatroom;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data 
@Builder 
@AllArgsConstructor 
@NoArgsConstructor 
@Document 
public class ChatRoom {
    @Id 
    private String id;
    private String chatId;
    private String userId;
    private String recipientId;
}
