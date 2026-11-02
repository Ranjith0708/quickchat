package com.ranjith.quickchat.chat;

import java.util.ArrayList;

import org.springframework.stereotype.Service;
import java.util.List;
import lombok.RequiredArgsConstructor;
import com.ranjith.quickchat.chatroom.ChatRoomService;

@Service 
@RequiredArgsConstructor 
public class ChatMessageService {

    private final ChatRoomService chatRoomService;
    private final ChatMessageRepository chatMessageRepository;

    public ChatMessage saveChatMessage(ChatMessage chatMessage) {
        // Implement the logic to save the chat message to the database
        var chatRoomId = chatRoomService.getChatRoomId(
            chatMessage.getSenderId(),
            chatMessage.getRecipientId(),
            true
        ).orElseThrow(() -> new RuntimeException("Chat room not found"));
        chatMessage.setChatRoomId(chatRoomId.toString());
        chatMessageRepository.save(chatMessage);
        return chatMessage;
    }

    public List<ChatMessage> findChatMessages(String senderId,String recipientId){
        var chatRoomId = chatRoomService.getChatRoomId(senderId,recipientId,false);
        return chatRoomId.map(chatMessageRepository::findByChatRoomId).orElse(new ArrayList<>());
    }
    
}
