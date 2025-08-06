import { Mixer, MixerError } from '../../src/helpers/Mixer';

describe('Mixer', () => {
  let mixer: Mixer;

  beforeEach(() => {
    mixer = new Mixer();
  });

  describe('set()', () => {
    test('throws if values is not an array', () => {
      expect(() => mixer.set('key', null as any)).toThrow(MixerError);
      expect(() => mixer.set('key', 123 as any)).toThrow(MixerError);
    });

    test('registers key and recomputes combinations', () => {
      mixer.set('color', ['red', 'blue']).set('size', ['S', 'M']);
      expect(mixer.size()).toBe(4); // 2 colors x 2 sizes
    });
  });

  describe('with()', () => {
    test('adds static field as value', () => {
      mixer.set('x', [1]).with('static', 'value');
      const result = mixer.get();
      expect(result.static).toBe('value');
    });

    test('adds static field as callback', () => {
      mixer.set('x', [1]).with('dynamic', () => 42);
      const result = mixer.get();
      expect(result.dynamic).toBe(42);
    });
  });

  describe('get()', () => {
    test('returns all unique combinations', () => {
      mixer.set('x', [1, 2]).set('y', ['a', 'b']);
      const seen = new Set();

      for (let i = 0; i < mixer.size(); i++) {
        const combo = mixer.get();
        const key = `${combo.x}|${combo.y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }

      expect(() => mixer.get()).toThrow(MixerError);
    });

    test('throws if exhausted', () => {
      mixer.set('x', [1]);
      mixer.get();
      expect(() => mixer.get()).toThrow(MixerError);
      expect(() => mixer.get()).toThrow(MixerError);
      expect(() => mixer.get()).toThrow(MixerError);
    });

    test('merges static fields into each combination', () => {
      mixer.set('a', [10]).with('b', 'static');
      const combo = mixer.get();
      expect(combo).toEqual({ a: 10, b: 'static' });
    });
  });

  describe('pick()', () => {
    test('returns a single value when one key is set', () => {
      mixer.set('status', ['ok']);
      expect(mixer.pick('status')).toBe('ok');
    });

    test('throws if multiple keys are set', () => {
      mixer.set('a', [1]).set('b', [2]);
      expect(() => mixer.pick('a')).toThrow(MixerError);
    });

    test('throws if key does not exist in row', () => {
      mixer.set('a', [1]);
      expect(() => mixer.pick('b')).toThrow(MixerError);
    });
  });

  describe('ready()', () => {
    test('returns true if combinations are available', () => {
      mixer.set('a', [1, 2]);
      expect(mixer.ready()).toBe(true);
      mixer.get();
      expect(mixer.ready()).toBe(true);
      mixer.get();
      expect(mixer.ready()).toBe(false);
    });

    test('returns false when no combinations left', () => {
      mixer.set('x', [1]);
      mixer.get();
      expect(mixer.ready()).toBe(false);
    });
  });

  describe('size()', () => {
    test('returns number of total combinations', () => {
      mixer.set('a', [1, 2]).set('b', ['x', 'y']);
      expect(mixer.size()).toBe(4);
    });

    test('returns 0 if no sets defined', () => {
      expect(mixer.size()).toBe(0);
    });
  });
});
