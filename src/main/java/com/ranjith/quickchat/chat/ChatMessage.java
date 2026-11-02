package com.ranjith.quickchat.chat;
import java.util.Date;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data 
@AllArgsConstructor 
@NoArgsConstructor 
@Builder 
@Document 
public class ChatMessage {
    @Id 
    private String id;
    private String chatRoomId;
    private String senderId;
    private String recipientId;
    private String content;
    private Date timestamp;
}
