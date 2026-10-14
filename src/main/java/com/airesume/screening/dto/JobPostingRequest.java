package com.airesume.screening.dto;

import com.airesume.screening.entity.JobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class JobPostingRequest {

    @NotBlank(message = "Job title is required")
    @Size(max = 200)
    private String title;

    @Size(max = 150)
    private String company;

    @NotBlank(message = "Job description is required")
    private String description;

    @Size(max = 150)
    private String location;

    @PositiveOrZero(message = "Minimum experience must be zero or greater")
    private Integer minExperienceYears;

    private JobStatus status;

    private Set<String> requiredSkills;
}
