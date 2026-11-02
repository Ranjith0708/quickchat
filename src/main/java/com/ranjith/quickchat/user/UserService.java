package com.ranjith.quickchat.user;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import java.security.SecureRandom;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private static final SecureRandom RANDOM = new SecureRandom();

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

    private String generateTag(String fullName) {
        for (int i = 0; i < 50; i++) {
            String tag = String.format("%04d", RANDOM.nextInt(10_000));
            if (!userRepository.existsByFullNameIgnoreCaseAndTag(fullName, tag))
                return tag;
        }
        return String.format("%06d", RANDOM.nextInt(1_000_000)); // extremely unlikely fallback
    }

    /** @return false if the nickname already exists */
    public boolean register(User user) {
        user.setStatus(Status.OFFLINE);
        user.setTag(generateTag(user.getFullName()));
        try {
            userRepository.insert(user);
            return true;
        } catch (DuplicateKeyException e) {
            return false;
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void backfillTags() {
        userRepository.findAll().stream()
                .filter(u -> (u.getTag() == null || u.getTag().isBlank())
                        && u.getFullName() != null && !u.getFullName().isBlank())
                .forEach(u -> {
                    u.setTag(generateTag(u.getFullName()));
                    userRepository.save(u);
                });
    }

    /** Search by full name (and optional "#tag"). Empty query = suggestions. */
    public List<User> search(String query, String exclude, int limit) {
        String q = query == null ? "" : query.trim();
        String tag = "";
        int hash = q.lastIndexOf('#');
        if (hash >= 0) {
            tag = q.substring(hash + 1).trim();
            q = q.substring(0, hash).trim();
        }

        List<User> found = q.isEmpty()
                ? userRepository.findAll()
                : userRepository.findByFullNameContainingIgnoreCase(q);

        final String tagPrefix = tag;
        return found.stream()
                .filter(u -> exclude == null || !u.getNickName().equals(exclude))
                .filter(u -> tagPrefix.isEmpty() || (u.getTag() != null && u.getTag().startsWith(tagPrefix)))
                .sorted(Comparator
                        .comparing((User u) -> u.getStatus() != Status.ONLINE)
                        .thenComparing(u -> String.valueOf(u.getFullName()), String.CASE_INSENSITIVE_ORDER))
                .limit(limit)
                .collect(Collectors.toList());
    }

}
