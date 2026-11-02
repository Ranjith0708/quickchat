package com.ranjith.quickchat.user;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import lombok.RequiredArgsConstructor;

/**
 * Tracks which WebSocket sessions belong to which user, so a user is marked
 * OFFLINE (with "last seen") when their last session closes - even if the
 * browser was closed, crashed or lost its connection without a proper logout.
 */
@Component
@RequiredArgsConstructor
public class PresenceTracker {

    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, String> sessions = new ConcurrentHashMap<>(); // sessionId -> nickName

    public void connected(String sessionId, String nickName) {
        if (sessionId != null && nickName != null) {
            sessions.put(sessionId, nickName);
        }
    }

    /** Explicit logout from the UI. */
    public void loggedOut(String sessionId, String nickName) {
        if (sessionId != null) {
            sessions.remove(sessionId);
        }
        markOfflineIfLastSession(nickName);
    }

    /** Browser closed, network lost, etc. */
    @EventListener
    public void onSessionDisconnect(SessionDisconnectEvent event) {
        String nickName = sessions.remove(event.getSessionId());
        if (markOfflineIfLastSession(nickName)) {
            userService.findByNickName(nickName)
                    .ifPresent(u -> messagingTemplate.convertAndSend("/topic/public", u));
        }
    }

    private boolean markOfflineIfLastSession(String nickName) {
        if (nickName == null || sessions.containsValue(nickName)) {
            return false; // still connected in another tab
        }
        User user = new User();
        user.setNickName(nickName);
        userService.disconnectUser(user);
        return true;
    }
}
