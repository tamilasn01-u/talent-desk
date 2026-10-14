package com.airesume.screening.service;

import com.airesume.screening.dto.CandidateIntelligenceResponse;
import com.airesume.screening.dto.CareerTimelineEntry;
import com.airesume.screening.dto.SkillAssessment;
import com.airesume.screening.dto.SkillEvidence;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CandidateIntelligenceService {

    private static final Map<String, Map<String, String>> RELATED_SKILLS = Map.ofEntries(
            Map.entry("java", Map.of("python", "transferable", "c#", "related")),
            Map.entry("springboot", Map.of("django", "transferable", "spring", "partiallyCovered", "springmvc", "transferable")),
            Map.entry("springmvc", Map.of("django", "transferable", "springboot", "transferable")),
            Map.entry("mysql", Map.of("postgresql", "partiallyCovered", "sql", "partiallyCovered")),
            Map.entry("postgresql", Map.of("mysql", "partiallyCovered", "sql", "partiallyCovered")),
            Map.entry("aws", Map.of("azure", "transferable", "gcp", "transferable")),
            Map.entry("azure", Map.of("aws", "transferable", "gcp", "transferable")),
            Map.entry("gcp", Map.of("aws", "transferable", "azure", "transferable")),
            Map.entry("angular", Map.of("react", "transferable", "vue", "transferable")),
            Map.entry("react", Map.of("angular", "transferable", "vue", "transferable")),
            Map.entry("vue", Map.of("react", "transferable", "angular", "transferable")),
            Map.entry("docker", Map.of("kubernetes", "partiallyCovered")),
            Map.entry("kubernetes", Map.of("docker", "partiallyCovered")),
            Map.entry("rabbitmq", Map.of("kafka", "transferable")),
            Map.entry("kafka", Map.of("rabbitmq", "transferable"))
    );

    public CandidateIntelligenceResponse analyze(
            int currentFit,
            List<String> requiredSkills,
            List<String> directMatches,
            List<String> foundSkills,
            List<SkillEvidence> evidence,
            List<CareerTimelineEntry> timeline,
            Integer experienceYears,
            Integer minimumExperienceYears,
            boolean resumeTextAvailable
    ) {
        List<SkillAssessment> direct = new ArrayList<>();
        List<SkillAssessment> related = new ArrayList<>();
        List<SkillAssessment> transferable = new ArrayList<>();
        List<SkillAssessment> partial = new ArrayList<>();
        List<SkillAssessment> missing = new ArrayList<>();
        List<SkillAssessment> unknown = new ArrayList<>();
        List<String> learning = new ArrayList<>();

        for (String required : requiredSkills) {
            if (directMatches.contains(required)) {
                SkillEvidence proof = evidenceFor(required, evidence);
                direct.add(assessment(required, proof == null ? required : proof.skill(), proof));
                continue;
            }
            Relation relation = relationFor(required, foundSkills, evidence);
            if (relation != null && "transferable".equals(relation.category())) {
                transferable.add(assessment(required, relation.candidateSkill(), relation.evidence()));
            } else if (relation != null && "related".equals(relation.category())) {
                related.add(assessment(required, relation.candidateSkill(), relation.evidence()));
            } else if (relation != null) {
                partial.add(assessment(required, relation.candidateSkill(), relation.evidence()));
            } else {
                SkillEvidence proof = evidenceFor(required, evidence);
                if (!resumeTextAvailable && (evidence == null || evidence.isEmpty()) && proof == null) {
                    unknown.add(assessment(required, null, null));
                } else {
                    missing.add(assessment(required, null, proof));
                    learning.add(required);
                }
            }
        }

        double support = direct.size() + transferable.size() * 0.7 + partial.size() * 0.4 + related.size() * 0.3;
        double potentialDenominator = requiredSkills.size() - unknown.size();
        if (minimumExperienceYears != null && minimumExperienceYears > 0) {
            potentialDenominator += 0.5;
            if (experienceYears != null) support += Math.min(1.0, experienceYears / (double) minimumExperienceYears) * 0.5;
        }
        int potentialFit = potentialDenominator == 0 || unknown.size() == requiredSkills.size() ? currentFit
                : (int) Math.round(support * 100.0 / potentialDenominator);
        // Experience can only support the transition score after it is actually stated in the resume.
        double gapCount = transferable.size() + partial.size() + related.size() + missing.size();
        double relatedCoverage = gapCount == 0 ? 1 : (transferable.size() * 0.7 + partial.size() * 0.4 + related.size() * 0.3) / gapCount;
        String difficulty = requiredSkills.isEmpty() || unknown.size() == requiredSkills.size() ? "UNKNOWN"
                : gapCount == 0 || (direct.size() >= requiredSkills.size() * 0.6 && relatedCoverage >= 0.65)
                ? "LOW"
                : relatedCoverage < 0.25 && direct.size() < requiredSkills.size() * 0.4 ? "HIGH" : "MEDIUM";
        if (!unknown.isEmpty() && "LOW".equals(difficulty)) difficulty = "MEDIUM";
        if (!requiredSkills.isEmpty() && experienceYears != null && minimumExperienceYears != null && experienceYears < minimumExperienceYears) {
            difficulty = "HIGH";
        }

        String experienceNote = experienceYears == null || minimumExperienceYears == null
                ? " Experience requirements could not be compared from the available resume evidence."
                : experienceYears >= minimumExperienceYears
                    ? " The resume states " + experienceYears + " years, meeting the " + minimumExperienceYears + " year minimum."
                    : " The resume states " + experienceYears + " years against a " + minimumExperienceYears + " year minimum.";
        String explanation = requiredSkills.isEmpty()
                ? "No required skills are configured, so potential fit and transition difficulty cannot be estimated."
                : direct.size() + " of " + requiredSkills.size()
                + " requirements have direct resume evidence; " + related.size() + " are related; " + transferable.size()
                + " have a defined transferable skill and " + partial.size()
                + " are partially covered. " + missing.size() + " have no direct or mapped evidence; "
                + unknown.size() + " could not be assessed due to missing resume evidence."
                + experienceNote + " Potential Fit weights direct evidence at 100%, explicitly related skills at 30%, mapped transferable skills at 70%, partially covered skills at 40%, and stated experience at half a requirement; unknown requirements are excluded.";

        return new CandidateIntelligenceResponse(currentFit, potentialFit, difficulty,
                List.copyOf(direct), List.copyOf(related), List.copyOf(transferable), List.copyOf(partial), List.copyOf(missing), List.copyOf(unknown),
                List.copyOf(learning), evidence == null ? List.of() : List.copyOf(evidence),
                timeline == null ? List.of() : List.copyOf(timeline), explanation);
    }

    private Relation relationFor(String required, List<String> foundSkills, List<SkillEvidence> evidence) {
        Map<String, String> sources = RELATED_SKILLS.get(key(required));
        if (sources == null) return null;
        for (String found : foundSkills) {
            String category = sources.get(key(found));
            if (category == null) continue;
            SkillEvidence proof = evidenceFor(found, evidence);
            if (proof != null) return new Relation(found, category, proof);
        }
        return null;
    }

    private SkillAssessment assessment(String required, String candidateSkill, SkillEvidence evidence) {
        return new SkillAssessment(required, candidateSkill,
                evidence == null ? "No direct evidence found." : evidence.evidence(),
                evidence == null ? "Resume text" : evidence.source(),
                evidence == null ? "None" : evidence.confidence());
    }

    private SkillEvidence evidenceFor(String skill, List<SkillEvidence> evidence) {
        if (evidence == null) return null;
        return evidence.stream().filter(item -> key(item.skill()).equals(key(skill))).findFirst().orElse(null);
    }

    private String key(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#]", "");
    }

    private record Relation(String candidateSkill, String category, SkillEvidence evidence) { }
}
