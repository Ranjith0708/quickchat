package com.ranjith.quickchat.chatroom;

import java.util.Optional;

import org.springframework.stereotype.Service;
import lombok.*;

@Service 
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    
    public Optional<String> getChatRoomId(String userId, String recipientId, boolean createNewRoomIfNotExists) {
        // Implement the logic to retrieve the chat room ID based on userId and recipientId
        return chatRoomRepository.findBySenderIdAndRecipientId(userId,recipientId).map(ChatRoom::getChatId)
        .or(() -> {
            if(createNewRoomIfNotExists){
                var chatRoomId = createChatId(userId, recipientId);
                return Optional.of(chatRoomId);
            }
                 return Optional.empty();
        });
    }

    public String createChatId(String userId,String recipientId){
        var chatRoomId = String.format("%s_%s",userId,recipientId);
        ChatRoom senderRecipientRoom = ChatRoom.builder().chatId(chatRoomId)
                                       .senderId(userId)
                                       .recipientId(recipientId)
                                       .build();

        ChatRoom recipientSenderRoom = ChatRoom.builder().chatId(chatRoomId)
                                        .senderId(recipientId)
                                        .recipientId(userId)
                                        .build();
        chatRoomRepository.save(senderRecipientRoom);
        chatRoomRepository.save(recipientSenderRoom);
        return chatRoomId;
    }
}
