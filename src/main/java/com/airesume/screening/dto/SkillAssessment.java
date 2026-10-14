package com.airesume.screening.dto;

public record SkillAssessment(
        String requiredSkill,
        String candidateSkill,
        String evidence,
        String source,
        String confidence
) {
}
