const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Request failed (${response.status})`)
  }
  if (response.status === 204) return null
  return response.json()
}

// UI components currently use src/data.js mock fixtures. These methods mirror
// the Spring REST API contract and provide a single seam for switching to live data.
export const candidateApi = {
  list: () => request('/candidates'),
  get: id => request(`/candidates/${id}`),
  create: candidate => request('/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(candidate) }),
  update: (id, candidate) => request(`/candidates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(candidate) }),
  remove: id => request(`/candidates/${id}`, { method: 'DELETE' }),
}

export const jobApi = {
  list: () => request('/jobs'),
  get: id => request(`/jobs/${id}`),
  create: job => request('/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job) }),
  update: (id, job) => request(`/jobs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job) }),
  remove: id => request(`/jobs/${id}`, { method: 'DELETE' }),
}

export const resumeApi = {
  match: (analysis, job) => {
    const requiredSkills = Array.isArray(job.requiredSkills)
      ? job.requiredSkills
      : Object.values(job.requiredSkills || {}).flat()
    const minimumExperienceYears = Number.parseFloat(String(job.experience || '').match(/\d+(?:\.\d+)?/)?.[0])
    return request('/resumes/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalFilename: analysis.originalFilename,
        roleTitle: job.title,
        email: analysis.email,
        foundSkills: analysis.foundSkills,
        requiredSkills,
        minimumExperienceYears: Number.isFinite(minimumExperienceYears) ? Math.ceil(minimumExperienceYears) : null,
        experienceYears: analysis.experienceYears,
        extractedCharacterCount: analysis.extractedCharacterCount,
        evidence: analysis.intelligence?.evidence || [],
        careerTimeline: analysis.intelligence?.careerTimeline || [],
      }),
    })
  },
  analyze: (file, job) => {
    const body = new FormData()
    body.append('file', file)
    body.append('jobTitle', job.title)
    const requiredSkills = Array.isArray(job.requiredSkills)
      ? job.requiredSkills
      : Object.values(job.requiredSkills || {}).flat()
    requiredSkills.forEach(skill => body.append('requiredSkills', skill))
    const minimumExperienceYears = Number.parseFloat(String(job.experience || '').match(/\d+(?:\.\d+)?/)?.[0])
    if (Number.isFinite(minimumExperienceYears)) body.append('minimumExperienceYears', Math.ceil(minimumExperienceYears))
    return request('/resumes/analyze', { method: 'POST', body })
  },
  upload: (candidateId, file) => {
    const body = new FormData()
    body.append('file', file)
    return request(`/candidates/${candidateId}/resumes`, { method: 'POST', body })
  },
  listForCandidate: candidateId => request(`/candidates/${candidateId}/resumes`),
  get: id => request(`/resumes/${id}`),
}
