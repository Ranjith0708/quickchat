package com.ranjith.quickchat.user;

import java.time.Instant;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
public class User {
    @Id
    private String nickName;
    private String fullName;
    private Status status;
    private Instant lastSeen; // set whenever the user goes offline
    private String tag; // public 4-digit identifier shown next to the full name
}
