package com.ranjith.quickchat.user;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /** Called when the WebSocket connects: marks the user ONLINE. */
    public void saveUser(User user) {
        var stored = userRepository.findById(user.getNickName()).orElse(null);
        if (stored != null) {
            stored.setStatus(Status.ONLINE);
            userRepository.save(stored); // keeps lastSeen
        } else {
            user.setStatus(Status.ONLINE);
            userRepository.save(user);
        }
    }

    /** Marks OFFLINE and records the moment as "last seen". */
    public void disconnectUser(User user) {
        var storedUser = userRepository.findById(user.getNickName()).orElse(null);
        if (storedUser != null) {
            storedUser.setStatus(Status.OFFLINE);
            storedUser.setLastSeen(Instant.now());
            userRepository.save(storedUser);
        }
    }

    public List<User> findConnectedUsers() {
        return userRepository.findAllByStatus(Status.ONLINE);
    }

    public Optional<User> findByNickName(String nickName) {
        return userRepository.findById(nickName);
    }

    /** @return false if the nickname already exists */
    public boolean register(User user) {
        user.setStatus(Status.OFFLINE);
        try {
            userRepository.insert(user);
            return true;
        } catch (DuplicateKeyException e) {
            return false;
        }
    }

    /** Empty query = suggestions (everyone, online first). */
    public List<User> search(String query, String exclude, int limit) {
        List<User> found = (query == null || query.isBlank())
                ? userRepository.findAll()
                : userRepository.findByNickNameContainingIgnoreCaseOrFullNameContainingIgnoreCase(query.trim(), query.trim());

        return found.stream()
                .filter(u -> exclude == null || !u.getNickName().equals(exclude))
                .sorted(Comparator
                        .comparing((User u) -> u.getStatus() != Status.ONLINE)
                        .thenComparing(User::getNickName, String.CASE_INSENSITIVE_ORDER))
                .limit(limit)
                .collect(Collectors.toList());
    }
}
