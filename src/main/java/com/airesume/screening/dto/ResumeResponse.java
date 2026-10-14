package com.airesume.screening.dto;

import com.airesume.screening.entity.ResumeStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class ResumeResponse {

    private Long id;
    private Long candidateId;
    private String originalFilename;
    private ResumeStatus status;
    private boolean textExtracted;
    private Instant uploadedAt;
}
