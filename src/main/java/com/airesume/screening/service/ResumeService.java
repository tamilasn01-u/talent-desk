package com.airesume.screening.service;

import com.airesume.screening.config.AppProperties;
import com.airesume.screening.dto.ResumeResponse;
import com.airesume.screening.entity.Candidate;
import com.airesume.screening.entity.Resume;
import com.airesume.screening.entity.ResumeStatus;
import com.airesume.screening.exception.InvalidFileException;
import com.airesume.screening.exception.ResourceNotFoundException;
import com.airesume.screening.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final CandidateService candidateService;
    private final AppProperties appProperties;

    @Transactional
    public ResumeResponse upload(Long candidateId, MultipartFile file) {
        validatePdf(file);
        Candidate candidate = candidateService.getCandidate(candidateId);
        Path storedPath = storeFile(candidateId, file);

        Resume resume = Resume.builder()
                .candidate(candidate)
                .originalFilename(file.getOriginalFilename())
                .storagePath(storedPath.toString())
                .contentType(file.getContentType())
                .status(ResumeStatus.UPLOADED)
                .build();

        return toResponse(resumeRepository.save(resume));
    }

    @Transactional(readOnly = true)
    public List<ResumeResponse> findByCandidate(Long candidateId) {
        candidateService.getCandidate(candidateId);
        return resumeRepository.findByCandidateIdOrderByUploadedAtDesc(candidateId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumeResponse findById(Long resumeId) {
        return toResponse(getResume(resumeId));
    }

    public Resume getResume(Long resumeId) {
        return resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found: " + resumeId));
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Resume file is required");
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        if (!filename.endsWith(".pdf") && !contentType.equals("application/pdf")) {
            throw new InvalidFileException("Only PDF resumes are supported");
        }
    }

    private Path storeFile(Long candidateId, MultipartFile file) {
        try {
            Path directory = Paths.get(appProperties.uploadDir(), String.valueOf(candidateId));
            Files.createDirectories(directory);
            String original = file.getOriginalFilename() == null ? "resume.pdf" : file.getOriginalFilename();
            Path destination = directory.resolve(UUID.randomUUID() + "-" + original.replaceAll("[^a-zA-Z0-9._-]", "_"));
            Files.copy(file.getInputStream(), destination);
            return destination.toAbsolutePath();
        } catch (IOException ex) {
            throw new InvalidFileException("Failed to store resume file");
        }
    }

    private ResumeResponse toResponse(Resume resume) {
        return ResumeResponse.builder()
                .id(resume.getId())
                .candidateId(resume.getCandidate().getId())
                .originalFilename(resume.getOriginalFilename())
                .status(resume.getStatus())
                .textExtracted(resume.getExtractedText() != null && !resume.getExtractedText().isBlank())
                .uploadedAt(resume.getUploadedAt())
                .build();
    }
}
