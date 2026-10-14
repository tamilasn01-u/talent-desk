package com.airesume.screening.service;

import com.airesume.screening.dto.JobPostingRequest;
import com.airesume.screening.dto.JobPostingResponse;
import com.airesume.screening.entity.JobPosting;
import com.airesume.screening.entity.JobStatus;
import com.airesume.screening.entity.Skill;
import com.airesume.screening.exception.ResourceNotFoundException;
import com.airesume.screening.repository.JobPostingRepository;
import com.airesume.screening.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobPostingService {

    private final JobPostingRepository jobPostingRepository;
    private final SkillRepository skillRepository;

    @Transactional
    public JobPostingResponse create(JobPostingRequest request) {
        JobPosting job = JobPosting.builder()
                .title(request.getTitle())
                .company(request.getCompany())
                .description(request.getDescription())
                .location(request.getLocation())
                .minExperienceYears(request.getMinExperienceYears())
                .status(request.getStatus() == null ? JobStatus.OPEN : request.getStatus())
                .requiredSkills(resolveSkills(request.getRequiredSkills()))
                .build();
        return toResponse(jobPostingRepository.save(job));
    }

    @Transactional(readOnly = true)
    public List<JobPostingResponse> findAll() {
        return jobPostingRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public JobPostingResponse findById(Long id) {
        return toResponse(getJob(id));
    }

    @Transactional
    public JobPostingResponse update(Long id, JobPostingRequest request) {
        JobPosting job = getJob(id);
        job.setTitle(request.getTitle());
        job.setCompany(request.getCompany());
        job.setDescription(request.getDescription());
        job.setLocation(request.getLocation());
        job.setMinExperienceYears(request.getMinExperienceYears());
        if (request.getStatus() != null) {
            job.setStatus(request.getStatus());
        }
        job.setRequiredSkills(resolveSkills(request.getRequiredSkills()));
        return toResponse(job);
    }

    @Transactional
    public void delete(Long id) {
        JobPosting job = getJob(id);
        jobPostingRepository.delete(job);
    }

    public JobPosting getJob(Long id) {
        return jobPostingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job posting not found: " + id));
    }

    private Set<Skill> resolveSkills(Set<String> skillNames) {
        if (skillNames == null || skillNames.isEmpty()) {
            return new HashSet<>();
        }
        return skillNames.stream()
                .filter(name -> name != null && !name.isBlank())
                .map(name -> name.trim())
                .map(this::findOrCreateSkill)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private Skill findOrCreateSkill(String name) {
        return skillRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> skillRepository.save(Skill.builder()
                        .name(name.toLowerCase(Locale.ROOT))
                        .build()));
    }

    private JobPostingResponse toResponse(JobPosting job) {
        Set<String> skills = job.getRequiredSkills().stream()
                .map(Skill::getName)
                .collect(Collectors.toSet());
        return JobPostingResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .company(job.getCompany())
                .description(job.getDescription())
                .location(job.getLocation())
                .minExperienceYears(job.getMinExperienceYears())
                .status(job.getStatus())
                .requiredSkills(skills)
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}
