package com.airesume.screening.controller;

import com.airesume.screening.dto.ResumeResponse;
import com.airesume.screening.dto.ResumeAnalysisResponse;
import com.airesume.screening.dto.ResumeMatchRequest;
import com.airesume.screening.service.ResumeAnalysisService;
import com.airesume.screening.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;
    private final ResumeAnalysisService resumeAnalysisService;

    @PostMapping(path = "/resumes/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResumeAnalysisResponse analyze(
            @RequestParam("file") MultipartFile file,
            @RequestParam("jobTitle") String jobTitle,
            @RequestParam(value = "requiredSkills", required = false) List<String> requiredSkills,
            @RequestParam(value = "minimumExperienceYears", required = false) Integer minimumExperienceYears
    ) {
        return resumeAnalysisService.analyze(file, jobTitle, requiredSkills, minimumExperienceYears);
    }

    @PostMapping(path = "/resumes/match", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResumeAnalysisResponse match(@RequestBody ResumeMatchRequest request) {
        return resumeAnalysisService.matchSkills(request);
    }

    @PostMapping(path = "/candidates/{candidateId}/resumes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ResumeResponse upload(
            @PathVariable Long candidateId,
            @RequestParam("file") MultipartFile file
    ) {
        return resumeService.upload(candidateId, file);
    }

    @GetMapping("/candidates/{candidateId}/resumes")
    public List<ResumeResponse> findByCandidate(@PathVariable Long candidateId) {
        return resumeService.findByCandidate(candidateId);
    }

    @GetMapping("/resumes/{resumeId}")
    public ResumeResponse findById(@PathVariable Long resumeId) {
        return resumeService.findById(resumeId);
    }
}
