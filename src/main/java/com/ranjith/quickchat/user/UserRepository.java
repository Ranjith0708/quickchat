package com.ranjith.quickchat.user;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {
    List<User> findAllByStatus(Status status);
    boolean existsByFullNameIgnoreCaseAndTag(String fullName, String tag);

    // Search by FULL NAME only, so people can't probe for nicknames
    List<User> findByFullNameContainingIgnoreCase(String fullName);

}
