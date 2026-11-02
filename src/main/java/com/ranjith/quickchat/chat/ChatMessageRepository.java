package com.ranjith.quickchat.chat;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ChatMessageRepository extends MongoRepository<ChatMessage,String>{
    List<ChatMessage> findByChatRoomId(String chatRoomId);
}
