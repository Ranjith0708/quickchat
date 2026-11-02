package com.ranjith.quickchat.user.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ranjith.quickchat.user.User;
import com.ranjith.quickchat.user.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserRestController {

    private final UserService userService;

    @GetMapping("/users")
    public ResponseEntity<List<User>> findConnectedUsers() {
        return ResponseEntity.ok(userService.findConnectedUsers());
    }

    /** Search registered people. Empty q returns suggestions (online first). */
    @GetMapping("/search")
    public ResponseEntity<List<User>> search(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) String exclude,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(userService.search(q, exclude, Math.min(Math.max(limit, 1), 50)));
    }

    /** One user with their current status. */
    @GetMapping("/profile/{nickName}")
    public ResponseEntity<User> profile(@PathVariable String nickName) {
        return userService.findByNickName(nickName)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /** Sign up: 201 created, 409 nickname already exists, 400 missing fields. */
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody User user) {
        if (isBlank(user.getNickName()) || isBlank(user.getFullName())) {
            return ResponseEntity.badRequest().build();
        }
        user.setNickName(user.getNickName().trim());
        user.setFullName(user.getFullName().trim());

        if (!userService.register(user)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    /** Log in: 200 with the stored user, 404 if the nickname doesn't exist. */
    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody User user) {
        if (isBlank(user.getNickName())) {
            return ResponseEntity.badRequest().build();
        }
        return userService.findByNickName(user.getNickName().trim())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
