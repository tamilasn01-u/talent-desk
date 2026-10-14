package com.airesume.screening.repository;

import com.airesume.screening.entity.Education;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EducationRepository extends JpaRepository<Education, Long> {

    List<Education> findByResumeId(Long resumeId);
}
