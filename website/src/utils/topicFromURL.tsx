import { guides } from '../data/DocsShared';
import type { Topic } from '../types/DocsShared';

export function topicFromURL(): Topic {
  const value = location.hash.slice(1);
  return guides.some((guide) => guide.id === value) ? (value as Topic) : 'start';
}
