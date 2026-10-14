package com.airesume.screening;

import com.airesume.screening.service.CandidateIntelligenceService;
import com.airesume.screening.service.ResumeAnalysisService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ResumeAnalysisServiceTests {

    private final ResumeAnalysisService service = new ResumeAnalysisService(new CandidateIntelligenceService());

    @Test
    void pdfAnalysisKeepsExistingExtractionAndMatchResultAndAddsEvidence() throws Exception {
        String resumeText = "Ada Lovelace ada@example.com\n5 years of experience\nSkills\nJava Spring Boot Docker\nSenior Developer 2020 - Present";
        MockMultipartFile file = new MockMultipartFile("file", "ada.pdf", "application/pdf", createPdf(resumeText));

        var result = service.analyze(file, "Backend Engineer", List.of("Java", "Spring Boot", "AWS"), 3);

        assertEquals("ada@example.com", result.email());
        assertEquals(5, result.experienceYears());
        assertEquals(67, result.skillMatchPercent());
        assertEquals(List.of("AWS"), result.missingRequiredSkills());
        assertTrue(result.intelligence().evidence().stream().anyMatch(item -> item.skill().equals("Docker")
                && item.evidence().contains("Docker")));
        assertTrue(result.intelligence().careerTimeline().stream().anyMatch(item -> item.position().equals("Senior Developer")));
    }

    @Test
    void docxAnalysisExtractsTextAndDoesNotInventCareerTimeline() throws Exception {
        String resumeText = "Mina mina@example.com\nPython and Django developer\n4 years of experience";
        MockMultipartFile file = new MockMultipartFile("file", "mina.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createDocx(resumeText));

        var result = service.analyze(file, "Backend Engineer", List.of("Python", "Java"), 3);

        assertEquals("mina@example.com", result.email());
        assertEquals(4, result.experienceYears());
        assertEquals(50, result.skillMatchPercent());
        assertEquals(List.of("Java"), result.missingRequiredSkills());
        assertTrue(result.intelligence().careerTimeline().isEmpty());
        assertTrue(result.intelligence().missingSkills().getFirst().evidence().equals("No direct evidence found."));
    }

    private byte[] createPdf(String text) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                content.newLineAtOffset(50, 750);
                for (String line : text.split("\\n")) {
                    content.showText(line);
                    content.newLineAtOffset(0, -16);
                }
                content.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private byte[] createDocx(String text) throws Exception {
        String paragraphs = text.lines().map(line -> "<w:p><w:r><w:t>" + line + "</w:t></w:r></w:p>").reduce("", String::concat);
        String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>"
                + paragraphs + "</w:body></w:document>";
        try (ByteArrayOutputStream output = new ByteArrayOutputStream(); ZipOutputStream zip = new ZipOutputStream(output)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(xml.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.finish();
            return output.toByteArray();
        }
    }
}
