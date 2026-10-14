package com.airesume.screening.dto;

import java.util.List;

public record ResumeAnalysisResponse(
        String originalFilename,
        String roleTitle,
        String email,
        List<String> foundSkills,
        List<String> matchedRequiredSkills,
        List<String> missingRequiredSkills,
        int matchedSkillCount,
        int requiredSkillCount,
        int skillMatchPercent,
        Integer experienceYears,
        Integer experienceMatchPercent,
        int extractedCharacterCount,
        String summary,
        CandidateIntelligenceResponse intelligence
) {
}
