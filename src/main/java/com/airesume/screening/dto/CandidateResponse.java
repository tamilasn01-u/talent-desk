package com.airesume.screening.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class CandidateResponse {

    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String location;
    private Instant createdAt;
    private Instant updatedAt;
}
