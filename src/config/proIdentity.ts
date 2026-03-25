export const PRO_XP_MULTIPLIER = 1.25;

export interface ProCertification {
  id: string;
  title: string;
  body: string;
  requiredLessons: number;
  requiredAchievements: number;
  requiredDrops: number;
}

export const PRO_CERTIFICATIONS: ProCertification[] = [
  {
    id: 'palate-builder',
    title: 'Palate Builder',
    body: 'Proof that your profile is active and your taste signals are beginning to sharpen.',
    requiredLessons: 3,
    requiredAchievements: 2,
    requiredDrops: 1,
  },
  {
    id: 'house-specialist',
    title: 'House Specialist',
    body: 'Shows consistent progression across lessons, collection habits, and weekly drop engagement.',
    requiredLessons: 8,
    requiredAchievements: 5,
    requiredDrops: 3,
  },
  {
    id: 'craft-identity',
    title: 'Craft Identity',
    body: 'Signals a serious enthusiast profile with repeat engagement and an owned drop history.',
    requiredLessons: 15,
    requiredAchievements: 8,
    requiredDrops: 6,
  },
];

export function getProIdentityProgress(input: {
  lessonsCompleted: number;
  achievementsUnlocked: number;
  claimedDrops: number;
}) {
  const certificationsEarned = PRO_CERTIFICATIONS.filter((cert) =>
    input.lessonsCompleted >= cert.requiredLessons &&
    input.achievementsUnlocked >= cert.requiredAchievements &&
    input.claimedDrops >= cert.requiredDrops
  );

  const current = certificationsEarned[certificationsEarned.length - 1] || null;
  const next = PRO_CERTIFICATIONS[certificationsEarned.length] || null;

  return {
    current,
    next,
    earnedCount: certificationsEarned.length,
    totalCount: PRO_CERTIFICATIONS.length,
  };
}
