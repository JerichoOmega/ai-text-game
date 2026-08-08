export interface Achievement {
  id: string;
  title: string;
  unlockedOnAbsoluteDay: number;
}

/**
 * Not persisted yet — the moment Game Center integration (mentioned as a
 * future feature) happens, this is the natural place to wire it, and at
 * that point unlocks should move into the SQLite meta table like the
 * player/clock data. Kept in-memory for now so the vertical slice doesn't
 * grow a persistence surface nothing reads yet.
 */
class AchievementTracker {
  private unlocked = new Map<string, Achievement>();

  unlock(id: string, title: string, absoluteDay: number): boolean {
    if (this.unlocked.has(id)) return false;
    this.unlocked.set(id, { id, title, unlockedOnAbsoluteDay: absoluteDay });
    return true;
  }

  has(id: string): boolean {
    return this.unlocked.has(id);
  }

  getAll(): Achievement[] {
    return Array.from(this.unlocked.values());
  }
}

export const achievementTracker = new AchievementTracker();
