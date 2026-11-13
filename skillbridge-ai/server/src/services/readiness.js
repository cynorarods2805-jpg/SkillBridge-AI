
const POINTS = {
  Beginner: 8,
  Intermediate: 14,
  Advanced: 20,
  Expert: 25,
};

export function profileCompleteness(s) {
  const p = s.profile || {};

  const checks = [
    !!s.name,
    !!p.phone,
    !!p.bio,
    !!p.roll_no,
    !!p.department,
    !!p.grad_year,
    p.cgpa != null && p.cgpa !== "",
    !!p.college,
    !!(p.github || p.linkedin),
    (s.skills || []).length >= 3,
    (s.projects || []).length >= 1,
    (s.certifications || []).length >= 1,
    !!s.resume,
  ];

  const done = checks.filter(Boolean).length;

  const todo = [
    !s.name && "Add your full name",
    !p.phone && "Add a phone number",
    !p.bio && "Write a short bio",
    !p.roll_no && "Add your roll number",
    !p.department && "Select your department",
    !p.grad_year && "Add your graduation year",
    (p.cgpa == null || p.cgpa === "") && "Add your CGPA",
    !p.college && "Add your college",
    !(p.github || p.linkedin) && "Add GitHub or LinkedIn",
    (s.skills || []).length < 3 && "Add at least 3 skills",
    (s.projects || []).length < 1 && "Add at least 1 project",
    (s.certifications || []).length < 1 && "Add at least 1 certification",
    !s.resume && "Upload your resume for analysis",
  ].filter(Boolean);

  return {
    score: Math.round((done / checks.length) * 100),
    todo,
  };
}

function calculateTechnical(s) {
  const skills = s.skills || [];

  if (!skills.length) return 0;

  const points = skills.reduce((total, skill) => {
    const base = POINTS[skill.level] || POINTS.Beginner;
    const verified = skill.verified ? 2 : 0;
    const experience = Math.min(Number(skill.years || 0), 3);

    return total + base + verified + experience;
  }, 0);

  const maximum = skills.length * 30;

  return Math.min(100, Math.round((points / maximum) * 100));
}

function calculateProjects(s) {
  const projects = s.projects || [];

  if (!projects.length) return 0;

  const points = projects.reduce((total, project) => {
    let score = 25;

    if (project.github_url) score += 20;
    if (project.live_url) score += 15;

    if (project.description && project.description.length > 40) {
      score += 10;
    }

    const technologies = Array.isArray(project.technologies)
      ? project.technologies
      : [];

    if (technologies.length >= 2) score += 10;

    return total + score;
  }, 0);

  return Math.min(100, Math.round(points / projects.length));
}

function calculateCertifications(s) {
  const certifications = s.certifications || [];

  return Math.min(100, certifications.length * 25);
}

function calculateAcademics(s) {
  const cgpa = Number(s.profile?.cgpa);

  if (!Number.isFinite(cgpa) || cgpa < 0) return 0;

  return Math.min(100, Math.round((cgpa / 10) * 100));
}

export function computeReadiness(s) {
  const technical = calculateTechnical(s);
  const projects = calculateProjects(s);
  const certifications = calculateCertifications(s);
  const completeness = profileCompleteness(s).score;
  const academics = calculateAcademics(s);

  const overall = Math.round(
    technical * 0.35 +
    projects * 0.25 +
    certifications * 0.15 +
    completeness * 0.15 +
    academics * 0.10
  );

  const tips = [];

  if (technical < 70) {
    tips.push("Improve skill proficiency and gain practical experience.");
  }

  if (projects < 70) {
    tips.push("Improve projects with detailed descriptions and GitHub or live links.");
  }

  if (certifications < 50) {
    tips.push("Earn certifications in relevant technology areas.");
  }

  if (academics < 70) {
    tips.push("Work towards improving academic performance.");
  }

  tips.push(...profileCompleteness(s).todo.slice(0, 3));

  return {
    overall: Math.max(0, Math.min(100, overall)),
    technical,
    projects,
    certifications,
    completeness,
    academics,
    tips: tips.slice(0, 5),
  };
}
