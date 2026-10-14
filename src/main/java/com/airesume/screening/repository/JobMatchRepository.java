package com.airesume.screening.repository;

import com.airesume.screening.entity.JobMatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobMatchRepository extends JpaRepository<JobMatch, Long> {

    List<JobMatch> findByCandidateIdOrderByScoreDesc(Long candidateId);

    List<JobMatch> findByJobIdOrderByScoreDesc(Long jobId);
}
