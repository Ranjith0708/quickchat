package com.ranjith.quickchat.user.controller;

import java.util.List;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import com.ranjith.quickchat.user.User;
import com.ranjith.quickchat.user.UserService;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final MongoTemplate mongoTemplate;

    @MessageMapping("/user.addUser")
    @SendTo("/topic/public")
    public User addUser(@Payload User user) {
        userService.saveUser(user);
        System.out.println(
                "Connected Database: " +
                        mongoTemplate.getDb().getName());
        System.out.println("User added: " + user.getNickName());
        return user;
    }

    @MessageMapping("/user.disconnectUser")
    @SendTo("/user/public")
    public User disconnectUser(@Payload User user) {
        userService.disconnectUser(user);
        return user;
    }

}
