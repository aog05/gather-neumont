import { DICEBEAR_STYLES, type DicebearStyleId } from "./dicebear_registry";

const FALLBACK_STYLE_LIST = ["pixelArt" as DicebearStyleId] as const;

export const AVATAR_STYLE_ORDER: DicebearStyleId[] = (() => {
  const ordered = Object.keys(DICEBEAR_STYLES).sort() as DicebearStyleId[];
  return ordered.length > 0 ? ordered : [...FALLBACK_STYLE_LIST];
})();

export function getNextStyle(
  current: DicebearStyleId | null | undefined,
  direction: -1 | 1,
): DicebearStyleId {
  const list = AVATAR_STYLE_ORDER.length > 0 ? AVATAR_STYLE_ORDER : [...FALLBACK_STYLE_LIST];
  if (list.length === 1) return list[0];

  const currentIndex = current ? list.indexOf(current) : -1;
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (baseIndex + direction + list.length) % list.length;
  return list[nextIndex];
}

