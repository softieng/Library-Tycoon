import { describe, expect, it } from 'vitest';
import { BOOKS, DEWEY } from '../../src/config/dewey';
import { FLAGS } from '../../src/config/featureFlags';
import { HALL_ROADMAP, hallProgress } from '../../src/config/hallRoadmap';
import { HALLS_AR, SHELVES } from '../../src/config/layout';
import {
  HALL_COLLECTIONS, SHELF_DIRECTORY, SHELF_DIRECTORY_BY_ID,
  normalizeSubjectSearch, searchShelfDirectory,
} from '../../src/config/shelfDirectory';
import { MISSIONS } from '../../src/missions/definitions';
import { makeSim, run } from './helpers';

describe('Arabic shelf signs match actual game shelves and canonical Dewey IDs', () => {
  it('keeps all ten real shelf identifiers with a unique, readable name', () => {
    expect(SHELF_DIRECTORY).toHaveLength(10);
    expect(SHELVES).toHaveLength(10);
    expect(new Set(SHELF_DIRECTORY.map(x => x.code)).size).toBe(10);
    expect(SHELF_DIRECTORY.map(x => x.code)).toEqual(DEWEY.map(x => x.code));
    for (const shelf of SHELVES) {
      const label = SHELF_DIRECTORY_BY_ID[shelf.id];
      expect(label, shelf.id).toBeDefined();
      expect(label.code).toBe(shelf.code);
      expect(label.titleAr.length).toBeGreaterThanOrEqual(5); // short, valid labels such as «الآداب» are readable
      expect(/[\u0600-\u06ff]/.test(label.titleAr)).toBe(true);
      expect(label.topicsAr.length).toBeGreaterThanOrEqual(3);
      expect(label.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(label.shelfId).toBe(`shelf_${shelf.code}`);
    }
  });

  it('does not break Dewey classification or existing book-to-shelf mapping', () => {
    expect(MISSIONS).toHaveLength(12);
    for (const book of BOOKS) {
      expect(DEWEY.some(d => d.code === book.code)).toBe(true);
      expect(SHELF_DIRECTORY_BY_ID[`shelf_${book.code}`]).toBeDefined();
    }
    const sim = makeSim(41);
    sim.dispatch({ type: 'startMission', id: 'missing_book' });
    const mission = sim.state.missions.active!;
    expect(SHELF_DIRECTORY_BY_ID[`shelf_${mission.data.home}`]).toBeDefined();
    expect(SHELF_DIRECTORY_BY_ID[String(mission.data.target)]).toBeDefined();
    const target = String(mission.data.target);
    sim.dispatch({ type: 'clickShelf', id: target });
    run(sim, 90, () => !sim.state.missions.active);
    expect(sim.state.missions.completed.missing_book).toBe(1);
  });

  it('searches by subject and Dewey with Arabic hamza normalization', () => {
    expect(searchShelfDirectory('ذكاء اصطناعي').map(x => x.code)).toEqual(['000']);
    expect(searchShelfDirectory('برمجة').map(x => x.code)).toEqual(['000']);
    expect(searchShelfDirectory('الشبكات').map(x => x.code)).toEqual(['000']);
    expect(searchShelfDirectory('الاقتصاد').map(x => x.code)).toEqual(['300']);
    expect(searchShelfDirectory('فيزياء').map(x => x.code)).toEqual(['500']);
    expect(searchShelfDirectory('الهندسة').map(x => x.code)).toEqual(['600']);
    expect(searchShelfDirectory('000').map(x => x.code)).toEqual(['000']);
    expect(searchShelfDirectory('900').map(x => x.code)).toEqual(['900']);
    expect(searchShelfDirectory('غير موجود')).toHaveLength(0);
    expect(searchShelfDirectory('  ')).toHaveLength(10);
    expect(normalizeSubjectSearch('إحصاء')).toBe(normalizeSubjectSearch('احصاء'));
  });
});

describe('planned subject distribution for six halls', () => {
  it('preserves the exact six hall names and marks unfinished halls as locked', () => {
    expect(HALL_COLLECTIONS).toHaveLength(6);
    expect(HALL_COLLECTIONS.map(x => x.titleAr)).toEqual(HALLS_AR);
    expect(HALL_COLLECTIONS.map(x => x.id)).toEqual(HALL_ROADMAP.map(x => x.id));
    expect(FLAGS.multiHall).toBe(false);
    for (const hall of HALL_COLLECTIONS) {
      expect(hall.subjectsAr.length).toBeGreaterThanOrEqual(4);
      expect(hall.noteAr.length).toBeGreaterThan(8);
    }
    expect(hallProgress(HALL_ROADMAP[0].upgradeId, [])).toBe('playable');
    for (const hall of HALL_ROADMAP.slice(1)) expect(hallProgress(hall.upgradeId, [hall.upgradeId!])).toBe('in-development');
  });
});
