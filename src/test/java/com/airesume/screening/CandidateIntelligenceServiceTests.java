package com.airesume.screening;

import com.airesume.screening.dto.SkillEvidence;
import com.airesume.screening.service.CandidateIntelligenceService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CandidateIntelligenceServiceTests {

    private final CandidateIntelligenceService service = new CandidateIntelligenceService();

    @Test
    void potentialFitUsesExplicitSkillMappingsAndKeepsCurrentFitSeparate() {
        List<String> requirements = List.of("Java", "Spring Boot", "MySQL", "Docker", "AWS");
        List<String> found = List.of("Python", "Django", "PostgreSQL", "Docker", "REST APIs");
        List<SkillEvidence> evidence = List.of(
                new SkillEvidence("Python", "Built services in Python.", "Work Experience", "High"),
                new SkillEvidence("Django", "Developed a Django application.", "Project Experience", "High"),
                new SkillEvidence("PostgreSQL", "Used PostgreSQL for persistence.", "Project Experience", "High"),
                new SkillEvidence("Docker", "Containerized the service with Docker.", "Project Experience", "High"),
                new SkillEvidence("REST APIs", "Built REST APIs.", "Work Experience", "High")
        );

        var result = service.analyze(20, requirements, List.of("Docker"), found, evidence, List.of(), 4, 3, true);

        assertEquals(20, result.currentFitPercent());
        assertEquals(60, result.potentialFitPercent());
        assertEquals("MEDIUM", result.transitionDifficulty());
        assertEquals("Python", result.transferableSkills().stream()
                .filter(item -> item.requiredSkill().equals("Java")).findFirst().orElseThrow().candidateSkill());
        assertEquals("PostgreSQL", result.partiallyCoveredSkills().stream()
                .filter(item -> item.requiredSkill().equals("MySQL")).findFirst().orElseThrow().candidateSkill());
        assertTrue(result.missingSkills().stream().anyMatch(item -> item.requiredSkill().equals("AWS")
                && item.evidence().equals("No direct evidence found.")));
    }

    @Test
    void unsupportedExperienceAndUnmappedSkillsDoNotCreateEvidence() {
        var result = service.analyze(0, List.of("Java", "AWS"), List.of(), List.of("Figma"),
                List.of(new SkillEvidence("Figma", "Designed in Figma.", "Skills section", "High")), List.of(), null, 5, true);

        assertEquals(0, result.currentFitPercent());
        assertEquals(0, result.potentialFitPercent());
        assertEquals("HIGH", result.transitionDifficulty());
        assertTrue(result.missingSkills().stream().allMatch(item -> item.evidence().equals("No direct evidence found.")));
        assertTrue(result.explanation().contains("could not be compared"));
    }

    @Test
    void absentResumeEvidenceIsUnknownRatherThanAClaimedGap() {
        var result = service.analyze(0, List.of("Java", "AWS"), List.of(), List.of(), List.of(), List.of(), null, null, false);

        assertEquals(0, result.potentialFitPercent());
        assertEquals("UNKNOWN", result.transitionDifficulty());
        assertEquals(2, result.unknownSkills().size());
        assertTrue(result.missingSkills().isEmpty());
    }
}
