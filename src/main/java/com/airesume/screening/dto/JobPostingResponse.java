package com.airesume.screening.dto;

import com.airesume.screening.entity.JobStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.Set;

@Getter
@Builder
public class JobPostingResponse {

    private Long id;
    private String title;
    private String company;
    private String description;
    private String location;
    private Integer minExperienceYears;
    private JobStatus status;
    private Set<String> requiredSkills;
    private Instant createdAt;
    private Instant updatedAt;
}
