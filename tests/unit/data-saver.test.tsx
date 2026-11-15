import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DATA_SAVER_KEY, optimisedImageUrl, readUserChoice, useDataSaver } from '@/lib/dataSaver/useDataSaver';

const setConnection = (value: unknown) => Object.defineProperty(navigator, 'connection', { value, configurable: true });

describe('data saver', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-data-saver'); setConnection(undefined); });
  afterEach(() => setConnection(undefined));

  it('is off by default', () => {
    const { result } = renderHook(() => useDataSaver());
    expect(result.current).toMatchObject({ enabled: false, browserRequested: false, userChoice: false });
  });

  it('turns on from the browser Save-Data hint', () => {
    setConnection({ saveData: true });
    const { result } = renderHook(() => useDataSaver());
    expect(result.current).toMatchObject({ enabled: true, browserRequested: true, userChoice: false });
    expect(document.documentElement.dataset.dataSaver).toBe('on');
  });

  it('turns on and off from the saved choice and remembers it', () => {
    const { result } = renderHook(() => useDataSaver());
    act(() => result.current.setUserChoice(true));
    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem(DATA_SAVER_KEY)).toBe('1');
    expect(readUserChoice()).toBe(true);
    act(() => result.current.setUserChoice(false));
    expect(result.current.enabled).toBe(false);
    expect(document.documentElement.dataset.dataSaver).toBeUndefined();
  });

  it('copes with storage that throws', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    try {
      expect(readUserChoice()).toBe(false);
      expect(renderHook(() => useDataSaver()).result.current.enabled).toBe(false);
    } finally { Storage.prototype.getItem = original; }
  });

  it('adds Cloudinary delivery options once and leaves other URLs alone', () => {
    expect(optimisedImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.png', 160))
      .toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_160/v1/a.png');
    const done = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_160/v1/a.png';
    expect(optimisedImageUrl(done, 160)).toBe(done);
    expect(optimisedImageUrl('https://example.com/a.png', 160)).toBe('https://example.com/a.png');
    expect(optimisedImageUrl(null, 160)).toBeNull();
    expect(optimisedImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.png', 0)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/a.png');
  });
});
