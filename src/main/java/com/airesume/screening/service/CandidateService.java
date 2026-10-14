package com.airesume.screening.service;

import com.airesume.screening.dto.CandidateRequest;
import com.airesume.screening.dto.CandidateResponse;
import com.airesume.screening.entity.Candidate;
import com.airesume.screening.exception.DuplicateResourceException;
import com.airesume.screening.exception.ResourceNotFoundException;
import com.airesume.screening.repository.CandidateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateRepository candidateRepository;

    @Transactional
    public CandidateResponse create(CandidateRequest request) {
        if (candidateRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Candidate already exists with email: " + request.getEmail());
        }
        Candidate candidate = Candidate.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .location(request.getLocation())
                .build();
        return toResponse(candidateRepository.save(candidate));
    }

    @Transactional(readOnly = true)
    public List<CandidateResponse> findAll() {
        return candidateRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CandidateResponse findById(Long id) {
        return toResponse(getCandidate(id));
    }

    @Transactional
    public CandidateResponse update(Long id, CandidateRequest request) {
        Candidate candidate = getCandidate(id);
        if (candidateRepository.existsByEmailAndIdNot(request.getEmail(), id)) {
            throw new DuplicateResourceException("Candidate already exists with email: " + request.getEmail());
        }
        candidate.setFullName(request.getFullName());
        candidate.setEmail(request.getEmail());
        candidate.setPhone(request.getPhone());
        candidate.setLocation(request.getLocation());
        return toResponse(candidate);
    }

    @Transactional
    public void delete(Long id) {
        Candidate candidate = getCandidate(id);
        candidateRepository.delete(candidate);
    }

    public Candidate getCandidate(Long id) {
        return candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found: " + id));
    }

    private CandidateResponse toResponse(Candidate candidate) {
        return CandidateResponse.builder()
                .id(candidate.getId())
                .fullName(candidate.getFullName())
                .email(candidate.getEmail())
                .phone(candidate.getPhone())
                .location(candidate.getLocation())
                .createdAt(candidate.getCreatedAt())
                .updatedAt(candidate.getUpdatedAt())
                .build();
    }
}
