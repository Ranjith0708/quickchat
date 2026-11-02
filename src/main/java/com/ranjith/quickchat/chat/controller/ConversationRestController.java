package com.ranjith.quickchat.chat.controller;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.ranjith.quickchat.chat.ChatMessage;
import com.ranjith.quickchat.chat.ConversationDto;
import com.ranjith.quickchat.user.User;
import com.ranjith.quickchat.user.UserRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ConversationRestController {

    private final MongoTemplate mongoTemplate;
    private final UserRepository userRepository;

    /** Everyone this user has exchanged messages with, newest conversation first. */
    @GetMapping("/api/chats/{nickName}")
    public List<ConversationDto> conversations(@PathVariable String nickName) {
        Set<String> partners = new HashSet<>();
        partners.addAll(mongoTemplate.findDistinct(
                Query.query(Criteria.where("senderId").is(nickName)),
                "recipientId", ChatMessage.class, String.class));
        partners.addAll(mongoTemplate.findDistinct(
                Query.query(Criteria.where("recipientId").is(nickName)),
                "senderId", ChatMessage.class, String.class));
        partners.remove(nickName);

        Map<String, User> users = new HashMap<>();
        userRepository.findAllById(partners).forEach(u -> users.put(u.getNickName(), u));

        List<ConversationDto> result = new ArrayList<>();
        for (String partner : partners) {
            User user = users.get(partner);
            if (user == null) continue;

            Query latest = new Query(new Criteria().orOperator(
                    Criteria.where("senderId").is(nickName).and("recipientId").is(partner),
                    Criteria.where("senderId").is(partner).and("recipientId").is(nickName)))
                    .with(Sort.by(Sort.Direction.DESC, "id"))
                    .limit(1);

            ChatMessage last = mongoTemplate.findOne(latest, ChatMessage.class);
            if (last == null) continue;

            long unread = mongoTemplate.count(new Query(Criteria.where("senderId").is(partner)
                    .and("recipientId").is(nickName)
                    .and("status").ne("SEEN")), ChatMessage.class);

            result.add(new ConversationDto(
                    partner,
                    user.getFullName(),
                    user.getStatus(),
                    user.getLastSeen(),
                    last.getContent(),
                    last.getId(),
                    nickName.equals(last.getSenderId()),
                    unread));
        }

        // ObjectId strings sort by creation time
        result.sort(Comparator.comparing(ConversationDto::getLastMessageId).reversed());
        return result;
    }
}
