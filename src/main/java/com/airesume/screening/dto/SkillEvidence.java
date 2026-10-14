package com.airesume.screening.dto;

public record SkillEvidence(
        String skill,
        String evidence,
        String source,
        String confidence
) {
}
