package com.airesume.screening.dto;

import java.util.List;

public record ResumeMatchRequest(
        String originalFilename,
        String roleTitle,
        String email,
        List<String> foundSkills,
        List<String> requiredSkills,
        Integer minimumExperienceYears,
        Integer experienceYears,
        int extractedCharacterCount,
        List<SkillEvidence> evidence,
        List<CareerTimelineEntry> careerTimeline
) {
}
