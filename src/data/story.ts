/**
 * Story beats at day milestones: two to four lines each, one tap to continue, a small gift.
 * They fire for every scenario (the lane is the same lane); Bà's own first-month story
 * stays in events.ts for the inherited scenarios.
 */
export interface StoryBeat {
  id: string;
  day: number;
  title: string;
  vi: string;
  text: string;
  /** What the beat leaves behind. */
  gift: { community?: number; reputation?: number; xp?: number };
  giftText: string;
}

export const STORY_BEATS: StoryBeat[] = [
  {
    id: 'storyLane',
    day: 45,
    title: 'The lane has noticed',
    vi: 'Cả xóm đã để ý',
    text: 'Six weeks in. The woman who sells newspapers on the corner now saves you the morning paper, and the moto taxis have started calling it "the bakery" instead of "Bà\'s old place". You\'re part of the street now.',
    gift: { community: 3 },
    giftText: 'Community +3',
  },
  {
    id: 'storyLetter',
    day: 90,
    title: 'A letter from Bà',
    vi: 'Thư của Bà',
    text: '"Con, I hear the flan sells out before noon. Good. Don\'t let anyone tell you the old recipes are slow: they are slow because they are right. Rest on Sundays. I mean it." A pressed hoa mai blossom falls out of the envelope.',
    gift: { xp: 120, community: 2 },
    giftText: '+120 XP, community +2',
  },
  {
    id: 'storyHalfYear',
    day: 180,
    title: 'Half a year',
    vi: 'Nửa năm',
    text: 'The neighbours throw a small party on the sidewalk: plastic stools, a karaoke machine that only knows four songs, and a cake somebody bought from you this morning. The motorbike driver makes a speech. It is long.',
    gift: { reputation: 2, community: 4 },
    giftText: 'Reputation +2, community +4',
  },
  {
    id: 'storyYear',
    day: 365,
    title: 'One year',
    vi: 'Tròn một năm',
    text: 'Bà visits in person, inspects the oven, says nothing for a long time, then hands you her recipe notebook. The margins are full of corrections in three colours of pen. "Now it\'s yours to argue with."',
    gift: { xp: 400, community: 5 },
    giftText: '+400 XP, community +5',
  },
  {
    id: 'storyTwoYears',
    day: 730,
    title: 'Two years',
    vi: 'Hai năm',
    text: 'A kid from the university brings her parents, visiting from far away, to show them "the place". They order one of everything. Her father asks whether you ever thought about opening a second shop. You did. Didn\'t you?',
    gift: { reputation: 3, community: 5 },
    giftText: 'Reputation +3, community +5',
  },
];
