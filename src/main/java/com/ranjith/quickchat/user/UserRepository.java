package com.ranjith.quickchat.user;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {
    List<User> findAllByStatus(Status status);

    // Search by nickname OR full name, case-insensitive, partial match
    List<User> findByNickNameContainingIgnoreCaseOrFullNameContainingIgnoreCase(String nickName, String fullName);
}
