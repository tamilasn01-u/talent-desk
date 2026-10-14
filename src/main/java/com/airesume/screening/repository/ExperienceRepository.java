package com.airesume.screening.repository;

import com.airesume.screening.entity.Experience;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExperienceRepository extends JpaRepository<Experience, Long> {

    List<Experience> findByResumeId(Long resumeId);
}
