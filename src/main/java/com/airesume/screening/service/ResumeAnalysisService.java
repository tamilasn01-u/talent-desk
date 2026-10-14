package com.airesume.screening.service;

import com.airesume.screening.dto.ResumeAnalysisResponse;
import com.airesume.screening.dto.ResumeMatchRequest;
import com.airesume.screening.dto.CareerTimelineEntry;
import com.airesume.screening.dto.SkillEvidence;
import com.airesume.screening.exception.InvalidFileException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class ResumeAnalysisService {

    private static final int MAX_DOCUMENT_XML_BYTES = 8 * 1024 * 1024;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("(?i)(?<![\\w.+-])[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+(?![\\w.-])");
    private static final Pattern EXPERIENCE_PATTERN = Pattern.compile(
            "(?i)(\\d{1,2}(?:\\.\\d)?)\\s*\\+?\\s*(?:-\\s*\\d{1,2}(?:\\.\\d)?\\s*)?years?(?:\\s+of)?(?:\\s+(?:professional|relevant))?\\s+experience"
    );
    private static final Pattern CAREER_PERIOD_PATTERN = Pattern.compile("(?i)\\b(?:19|20)\\d{2}\\s*(?:-|–|—|to)\\s*(?:present|current|(?:19|20)\\d{2})\\b");
    private static final List<SkillDefinition> SKILLS = List.of(
            skill("Java", "java", "core java", "java se"),
            skill("JavaScript", "javascript", "ecmascript"),
            skill("TypeScript", "typescript"),
            skill("Python", "python"),
            skill("Django", "django"),
            skill("Flask", "flask"),
            skill("Express.js", "express.js", "expressjs"),
            skill("C++", "c++"),
            skill("C#", "c#", "c sharp"),
            skill("SQL", "sql", "structured query language"),
            skill("React", "react", "react.js", "reactjs"),
            skill("Angular", "angular", "angularjs"),
            skill("Vue", "vue", "vue.js", "vuejs"),
            skill("Next.js", "next.js", "nextjs"),
            skill("Node.js", "node.js", "nodejs"),
            skill("HTML", "html", "html5"),
            skill("CSS", "css", "css3"),
            skill("Spring", "spring framework"),
            skill("Spring Boot", "spring boot", "springboot"),
            skill("Spring MVC", "spring mvc"),
            skill("REST APIs", "rest api", "rest apis", "restful api", "restful apis"),
            skill("Microservices", "microservices", "microservice architecture"),
            skill("Spring Security", "spring security"),
            skill("JWT", "jwt", "json web token", "json web tokens"),
            skill("Hibernate", "hibernate"),
            skill("JPA", "jpa", "java persistence api"),
            skill("JDBC", "jdbc", "java database connectivity"),
            skill("JUnit", "junit"),
            skill("Docker", "docker"),
            skill("Kubernetes", "kubernetes", "k8s"),
            skill("AWS", "aws", "amazon web services"),
            skill("Azure", "azure", "microsoft azure"),
            skill("GCP", "gcp", "google cloud platform"),
            skill("PostgreSQL", "postgresql", "postgres"),
            skill("MySQL", "mysql"),
            skill("MongoDB", "mongodb", "mongo db"),
            skill("Redis", "redis"),
            skill("Kafka", "kafka", "apache kafka"),
            skill("RabbitMQ", "rabbitmq", "rabbit mq"),
            skill("Maven", "maven"),
            skill("Git", "git", "git version control"),
            skill("CI/CD", "ci/cd", "continuous integration", "continuous delivery", "continuous deployment"),
            skill("Linux", "linux"),
            skill("Agile", "agile", "scrum", "kanban"),
            skill("Figma", "figma"),
            skill("Product design", "product design", "ux design"),
            skill("UX research", "ux research", "user research"),
            skill("Design systems", "design system", "design systems"),
            skill("Analytics", "analytics", "product analytics"),
            skill("Roadmapping", "roadmap", "roadmapping"),
            skill("Machine learning", "machine learning", "machine-learning"),
            skill("Statistics", "statistics", "statistical analysis"),
            skill("TensorFlow", "tensorflow"),
            skill("PyTorch", "pytorch"),
            skill("NLP", "nlp", "natural language processing"),
            skill("A/B testing", "a/b testing", "ab testing", "split testing"),
            skill("Accessibility", "accessibility", "wcag")
    );

    private final CandidateIntelligenceService candidateIntelligenceService;

    public ResumeAnalysisService(CandidateIntelligenceService candidateIntelligenceService) {
        this.candidateIntelligenceService = candidateIntelligenceService;
    }

    public ResumeAnalysisResponse matchSkills(ResumeMatchRequest request) {
        if (request == null || request.roleTitle() == null || request.roleTitle().isBlank()) {
            throw new InvalidFileException("Choose a job opening to calculate its resume match");
        }
        List<String> found = request.foundSkills() == null ? List.of() : request.foundSkills();
        List<String> requirements = expandRequirements(request.requiredSkills());
        List<String> matched = requirements.stream()
                .filter(requirement -> found.stream().anyMatch(skill -> sameSkill(requirement, skill)))
                .toList();
        List<String> missing = requirements.stream().filter(requirement -> !matched.contains(requirement)).toList();
        int score = requirements.isEmpty() ? 0 : (int) Math.round(matched.size() * 100.0 / requirements.size());
        Integer experienceMatch = request.minimumExperienceYears() == null || request.minimumExperienceYears() <= 0
                ? null
                : request.experienceYears() == null ? 0 : Math.min(100,
                        (int) Math.round(request.experienceYears() * 100.0 / request.minimumExperienceYears()));
        String summary = requirements.isEmpty()
                ? "No required skills are configured for this role, so a role match score cannot be calculated."
                : "Matched " + matched.size() + " of " + requirements.size()
                        + " required skills for " + request.roleTitle() + " (" + score + "% skill match).";
        List<SkillEvidence> evidence = request.evidence() == null ? List.of() : request.evidence();
        List<CareerTimelineEntry> timeline = request.careerTimeline() == null ? List.of() : request.careerTimeline();
        var intelligence = candidateIntelligenceService.analyze(score, requirements, matched, found, evidence, timeline,
                request.experienceYears(), request.minimumExperienceYears(), request.extractedCharacterCount() > 0);
        return new ResumeAnalysisResponse(
                request.originalFilename(), request.roleTitle(), request.email(), found,
                matched, missing, matched.size(), requirements.size(), score,
                request.experienceYears(), experienceMatch, request.extractedCharacterCount(), summary, intelligence
        );
    }

    public ResumeAnalysisResponse analyze(
            MultipartFile file,
            String roleTitle,
            List<String> requiredSkills,
            Integer minimumExperienceYears
    ) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Choose a resume file to analyze");
        }
        if (roleTitle == null || roleTitle.isBlank()) {
            throw new InvalidFileException("Choose a job opening before analyzing this resume");
        }

        String filename = file.getOriginalFilename() == null ? "resume" : file.getOriginalFilename();
        String text = extractText(file, filename);
        String normalizedText = text.toLowerCase(Locale.ROOT);
        if (normalizedText.isBlank()) {
            throw new InvalidFileException("No selectable text was found in this resume. Scanned-image OCR is not enabled.");
        }

        List<String> foundSkills = extractSkills(normalizedText);
        List<String> requirements = expandRequirements(requiredSkills);
        List<String> matched = requirements.stream()
                .filter(requirement -> foundSkills.stream().anyMatch(skill -> sameSkill(requirement, skill))
                        || containsTerm(normalizedText, requirement))
                .toList();
        List<String> missing = requirements.stream().filter(requirement -> !matched.contains(requirement)).toList();
        int score = requirements.isEmpty() ? 0 : (int) Math.round(matched.size() * 100.0 / requirements.size());
        Integer experienceYears = findExperienceYears(normalizedText);
        Integer experienceMatch = minimumExperienceYears == null || minimumExperienceYears <= 0
                ? null
                : experienceYears == null ? 0 : Math.min(100, (int) Math.round(experienceYears * 100.0 / minimumExperienceYears));

        String summary;
        if (requirements.isEmpty()) {
            summary = "No required skills are configured for this role, so a role match score cannot be calculated.";
        } else if (matched.isEmpty()) {
            summary = "No required skills were detected in the resume text. The score is based on required-skill overlap and is 0%.";
        } else {
            summary = "Matched " + matched.size() + " of " + requirements.size()
                    + " required skills for " + roleTitle + " (" + score + "% skill match).";
        }

        Matcher emailMatcher = EMAIL_PATTERN.matcher(text);
        String email = emailMatcher.find() ? emailMatcher.group() : null;
        List<SkillEvidence> evidence = extractEvidence(text, foundSkills);
        List<CareerTimelineEntry> timeline = extractCareerTimeline(text);
        var intelligence = candidateIntelligenceService.analyze(score, requirements, matched, foundSkills, evidence,
                timeline, experienceYears, minimumExperienceYears, true);
        return new ResumeAnalysisResponse(
                filename,
                roleTitle,
                email,
                foundSkills,
                matched,
                missing,
                matched.size(),
                requirements.size(),
                score,
                experienceYears,
                experienceMatch,
                text.length(),
                summary,
                intelligence
        );
    }

    private List<SkillEvidence> extractEvidence(String text, List<String> foundSkills) {
        List<SkillEvidence> evidence = new ArrayList<>();
        for (String name : foundSkills) {
            SkillDefinition definition = SKILLS.stream().filter(skill -> skill.name().equals(name)).findFirst().orElse(null);
            if (definition == null) continue;
            int position = -1;
            for (String alias : definition.aliases()) {
                Matcher matcher = Pattern.compile("(?i)(?<![\\p{Alnum}])" + Pattern.quote(alias) + "(?![\\p{Alnum}])").matcher(text);
                if (matcher.find()) { position = matcher.start(); break; }
            }
            if (position < 0) continue;
            int start = Math.max(Math.max(text.lastIndexOf('.', position), text.lastIndexOf('\n', position)), text.lastIndexOf(';', position)) + 1;
            int end = text.length();
            for (char boundary : new char[]{'.', '\n', ';'}) {
                int next = text.indexOf(boundary, position);
                if (next >= 0) end = Math.min(end, next + (boundary == '.' ? 1 : 0));
            }
            String excerpt = text.substring(start, end).trim().replaceAll("\\s+", " ");
            if (excerpt.length() > 280) excerpt = excerpt.substring(0, 277) + "...";
            evidence.add(new SkillEvidence(name, excerpt, evidenceSource(text, position), "High"));
        }
        return evidence;
    }

    private String evidenceSource(String text, int position) {
        String source = "Resume text";
        for (String line : text.substring(0, position).split("\\R")) {
            String heading = line.trim().toLowerCase(Locale.ROOT).replaceAll("[:|]+$", "").trim();
            if (heading.matches("(?:project experience|projects?|project work)")) source = "Project Experience";
            else if (heading.matches("(?:work experience|professional experience|employment history|experience)")) source = "Work Experience";
            else if (heading.matches("(?:technical skills|skills|skills and expertise|core competencies)")) source = "Skills section";
        }
        return source;
    }

    private List<CareerTimelineEntry> extractCareerTimeline(String text) {
        List<CareerTimelineEntry> timeline = new ArrayList<>();
        String[] lines = text.split("\\R");
        for (int index = 0; index < lines.length && timeline.size() < 8; index++) {
            String line = lines[index].trim();
            Matcher periodMatcher = CAREER_PERIOD_PATTERN.matcher(line);
            if (!periodMatcher.find()) continue;
            String position = line.substring(0, periodMatcher.start()).replaceAll("[|,–—-]+$", "").trim();
            if (!looksLikePosition(position) && index > 0) {
                String previous = lines[index - 1].trim();
                if (looksLikePosition(previous)) position = previous;
            }
            if (!looksLikePosition(position)) continue;
            String period = periodMatcher.group().trim();
            timeline.add(new CareerTimelineEntry(period, position, line));
        }
        return timeline;
    }

    private boolean looksLikePosition(String value) {
        return value != null && value.length() <= 100
                && Pattern.compile("(?i)\\b(engineer|developer|designer|manager|analyst|architect|consultant|scientist|specialist|intern|lead|director)\\b").matcher(value).find();
    }

    private String extractText(MultipartFile file, String filename) {
        try {
            byte[] bytes = file.getBytes();
            String lowerFilename = filename.toLowerCase(Locale.ROOT);
            if (lowerFilename.endsWith(".pdf") || "application/pdf".equalsIgnoreCase(file.getContentType())) {
                if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F' || bytes[4] != '-') {
                    throw new InvalidFileException("The uploaded file is not a valid PDF");
                }
                try (PDDocument document = Loader.loadPDF(bytes)) {
                    return new PDFTextStripper().getText(document);
                }
            }
            if (lowerFilename.endsWith(".docx") || "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equalsIgnoreCase(file.getContentType())) {
                return extractDocxText(bytes);
            }
            throw new InvalidFileException("Supported resume formats are PDF and DOCX");
        } catch (InvalidFileException exception) {
            throw exception;
        } catch (IOException | XMLStreamException exception) {
            throw new InvalidFileException("Could not read the resume. Confirm the file is a valid PDF or DOCX.");
        }
    }

    private String extractDocxText(byte[] bytes) throws IOException, XMLStreamException {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!"word/document.xml".equals(entry.getName())) continue;
                ByteArrayOutputStream xml = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int read;
                while ((read = zip.read(buffer)) != -1) {
                    if (xml.size() + read > MAX_DOCUMENT_XML_BYTES) {
                        throw new InvalidFileException("The resume document contains too much expanded content to analyze");
                    }
                    xml.write(buffer, 0, read);
                }
                return readDocxXml(xml.toByteArray());
            }
        }
        throw new InvalidFileException("The DOCX file does not contain a readable document body");
    }

    private String readDocxXml(byte[] bytes) throws XMLStreamException {
        XMLInputFactory factory = XMLInputFactory.newFactory();
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty("javax.xml.stream.isSupportingExternalEntities", false);
        StringBuilder text = new StringBuilder();
        XMLStreamReader reader = factory.createXMLStreamReader(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8.name());
        try {
            while (reader.hasNext()) {
                int event = reader.next();
                if (event == XMLStreamConstants.START_ELEMENT && "t".equals(reader.getLocalName())) {
                    text.append(reader.getElementText()).append(' ');
                } else if (event == XMLStreamConstants.END_ELEMENT && "p".equals(reader.getLocalName())) {
                    text.append('\n');
                }
            }
        } finally {
            reader.close();
        }
        return text.toString();
    }

    private List<String> extractSkills(String text) {
        return SKILLS.stream()
                .filter(definition -> definition.aliases().stream().anyMatch(alias -> containsTerm(text, alias)))
                .map(SkillDefinition::name)
                .toList();
    }

    private List<String> expandRequirements(List<String> rawRequirements) {
        if (rawRequirements == null || rawRequirements.isEmpty()) return List.of();
        Set<String> expanded = new LinkedHashSet<>();
        for (String raw : rawRequirements) {
            if (raw == null || raw.isBlank()) continue;
            String[] alternatives = raw.split("(?i)\\s*,\\s*|\\s+and\\s+|\\s*;\\s*|(?<!\\d)\\s*/\\s*(?!\\d)");
            for (String alternative : alternatives) {
                String trimmed = alternative.trim();
                if (trimmed.isBlank()) continue;
                List<SkillDefinition> recognized = SKILLS.stream()
                        .filter(definition -> definition.aliases().stream().anyMatch(alias -> containsTerm(trimmed.toLowerCase(Locale.ROOT), alias)))
                        .toList();
                if (recognized.isEmpty()) expanded.add(trimmed);
                else recognized.forEach(definition -> expanded.add(definition.name()));
            }
        }
        return new ArrayList<>(expanded);
    }

    private Integer findExperienceYears(String text) {
        Matcher matcher = EXPERIENCE_PATTERN.matcher(text);
        if (!matcher.find()) return null;
        try {
            return (int) Math.floor(Double.parseDouble(matcher.group(1)));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private boolean sameSkill(String left, String right) {
        return normalize(left).equals(normalize(right));
    }

    private boolean containsTerm(String text, String term) {
        if (text == null || term == null || term.isBlank()) return false;
        Pattern pattern = Pattern.compile("(?<![\\p{Alnum}])" + Pattern.quote(term.toLowerCase(Locale.ROOT)) + "(?![\\p{Alnum}])");
        return pattern.matcher(text).find();
    }

    private String normalize(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#]", "");
    }

    private static SkillDefinition skill(String name, String... aliases) {
        return new SkillDefinition(name, List.of(aliases));
    }

    private record SkillDefinition(String name, List<String> aliases) {
    }
}
