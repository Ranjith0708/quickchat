package com.ranjith.quickchat.chat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageReceiptService {

    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    /** Everything waiting for this user is now on their device: SENT -> DELIVERED. */
    public void markDelivered(String userId) {
        Query waiting = Query.query(Criteria.where("recipientId").is(userId)
                .and("status").nin("DELIVERED", "SEEN")); // also matches messages with no status yet
        List<ChatMessage> messages = mongoTemplate.find(waiting, ChatMessage.class);
        apply(messages, "DELIVERED", userId, Criteria.where("status").nin("DELIVERED", "SEEN"));
    }

    /** The reader opened the chat with otherId: everything from otherId becomes SEEN. */
    public void markSeen(String readerId, String otherId) {
        Query unseen = Query.query(Criteria.where("recipientId").is(readerId)
                .and("senderId").is(otherId)
                .and("status").ne("SEEN"));
        List<ChatMessage> messages = mongoTemplate.find(unseen, ChatMessage.class);
        apply(messages, "SEEN", readerId, Criteria.where("status").ne("SEEN"));
    }

    private void apply(List<ChatMessage> messages, String status, String readerId, Criteria guard) {
        if (messages.isEmpty()) {
            return;
        }

        List<String> ids = messages.stream().map(ChatMessage::getId).collect(Collectors.toList());

        // The guard stops a slower DELIVERED update from overwriting SEEN
        Query target = new Query(new Criteria().andOperator(Criteria.where("id").in(ids), guard));
        mongoTemplate.updateMulti(target, Update.update("status", status), ChatMessage.class);

        // Newest affected message per sender
        Map<String, String> newestBySender = new HashMap<>();
        for (ChatMessage m : messages) {
            newestBySender.merge(m.getSenderId(), m.getId(), (a, b) -> a.compareTo(b) >= 0 ? a : b);
        }

        newestBySender.forEach((sender, newestId) ->
                messagingTemplate.convertAndSendToUser(sender, "/queue/status",
                        StatusEvent.builder().type(status).from(readerId).upToId(newestId).build()));
    }
}
