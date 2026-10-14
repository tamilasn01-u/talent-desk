package com.airesume.screening.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class ApiInfoController {

    @GetMapping("/")
    public Map<String, Object> index() {
        return Map.of(
                "name", "AI Resume Screening API",
                "status", "running",
                "endpoints", Map.of(
                        "candidates", "/api/candidates",
                        "jobs", "/api/jobs",
                        "resumeUpload", "/api/candidates/{candidateId}/resumes"
                )
        );
    }
}
