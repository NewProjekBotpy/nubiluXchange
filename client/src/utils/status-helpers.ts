export interface Story {
  id: number;
  content: string;
  createdAt: string;
  media: string | null;
  mediaType: string | null;
  musicUrl: string | null;
  duration: number;
  backgroundColor: string | null;
}

export const filterRecentStories = (stories: Story[]) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return stories.filter(story => new Date(story.createdAt) > twentyFourHoursAgo);
};

export const calculateStorySegments = (storyCount: number) => {
  if (storyCount === 0) return "0 100";
  
  const totalCircumference = 2 * Math.PI * 28; // radius = 28 (175.93)
  
  if (storyCount === 1) {
    const gapSize = 8;
    const dashLength = totalCircumference - gapSize;
    return `${dashLength} ${totalCircumference}`;
  }
  
  const gapSize = 3;
  const totalGaps = storyCount * gapSize;
  const availableSpace = totalCircumference - totalGaps;
  const segmentLength = availableSpace / storyCount;
  
  return `${segmentLength} ${gapSize}`;
};

export const STORY_DURATION = 5000;
export const PROGRESS_INTERVAL = 50;
