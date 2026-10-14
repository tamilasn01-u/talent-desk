package com.airesume.screening.dto;

import java.util.List;

public record CandidateIntelligenceResponse(
        int currentFitPercent,
        int potentialFitPercent,
        String transitionDifficulty,
        List<SkillAssessment> directMatches,
        List<SkillAssessment> relatedSkills,
        List<SkillAssessment> transferableSkills,
        List<SkillAssessment> partiallyCoveredSkills,
        List<SkillAssessment> missingSkills,
        List<SkillAssessment> unknownSkills,
        List<String> recommendedLearning,
        List<SkillEvidence> evidence,
        List<CareerTimelineEntry> careerTimeline,
        String explanation
) {
}
