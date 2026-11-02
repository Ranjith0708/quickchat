package com.ranjith.quickchat.user.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.ranjith.quickchat.user.PresenceTracker;
import com.ranjith.quickchat.user.User;
import com.ranjith.quickchat.user.UserService;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PresenceTracker presenceTracker;

    @MessageMapping("/user.addUser")
    @SendTo("/topic/public")
    public User addUser(@Payload User user, SimpMessageHeaderAccessor headerAccessor) {
        userService.saveUser(user);
        presenceTracker.connected(headerAccessor.getSessionId(), user.getNickName());
        return user;
    }

    @MessageMapping("/user.disconnectUser")
    @SendTo("/topic/public")
    public User disconnectUser(@Payload User user, SimpMessageHeaderAccessor headerAccessor) {
        presenceTracker.loggedOut(headerAccessor.getSessionId(), user.getNickName());
        return user;
    }
}
