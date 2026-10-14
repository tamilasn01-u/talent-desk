package com.airesume.screening.controller;

import com.airesume.screening.dto.JobPostingRequest;
import com.airesume.screening.dto.JobPostingResponse;
import com.airesume.screening.service.JobPostingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService jobPostingService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobPostingResponse create(@Valid @RequestBody JobPostingRequest request) {
        return jobPostingService.create(request);
    }

    @GetMapping
    public List<JobPostingResponse> findAll() {
        return jobPostingService.findAll();
    }

    @GetMapping("/{id}")
    public JobPostingResponse findById(@PathVariable Long id) {
        return jobPostingService.findById(id);
    }

    @PutMapping("/{id}")
    public JobPostingResponse update(@PathVariable Long id, @Valid @RequestBody JobPostingRequest request) {
        return jobPostingService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        jobPostingService.delete(id);
    }
}
