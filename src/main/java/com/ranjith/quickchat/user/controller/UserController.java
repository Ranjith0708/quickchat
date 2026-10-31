package com.ranjith.quickchat.user.controller;

import java.util.List;

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

    @MessageMapping ("/user.addUser")
    @SendTo ("/user/topic")
    public User addUser( @Payload  User user) {
        userService.saveUser(user);
        return user;
    }

    @MessageMapping("/user.disconnectUser")
    @SendTo("/user/topic")
    public User disconnectUser(@Payload User user) {
        userService.disconnectUser(user);
        return user;
    }
    
}
