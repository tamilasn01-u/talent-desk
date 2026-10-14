package com.airesume.screening.repository;

import com.airesume.screening.entity.JobPosting;
import com.airesume.screening.entity.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    List<JobPosting> findByStatus(JobStatus status);
}
