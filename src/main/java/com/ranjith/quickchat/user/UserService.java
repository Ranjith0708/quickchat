package com.ranjith.quickchat.user;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import java.util.List;

@Service 
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    
    public void saveUser(User user) {
        user.setStatus(Status.ONLINE);
        userRepository.save(user);
    }

    public void disconnectUser(User user) {
        var storedUser = userRepository.findById(user.getNickName()).orElse(null);
        if (storedUser != null) {
            storedUser.setStatus(Status.OFFLINE);
            userRepository.save(storedUser);
        }
    }

    public List<User> findConnectedUsers() {
        // Implement the logic to retrieve all users from the database
        List<User> connectedUsers = userRepository.findAllByStatus(Status.ONLINE);
        return connectedUsers;
    }
}
