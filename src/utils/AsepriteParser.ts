import Phaser from "phaser";

export namespace AsepriteParser {
  export type AsepriteFrameRect = {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  export type AsepriteFrameData = {
    filename?: string;
    frame: AsepriteFrameRect;
    duration?: number;
  };

  export type AsepriteFrameTag = {
    name: string;
    from: number;
    to: number;
    direction?: "forward" | "reverse" | "pingpong" | "pingpong_reverse";
  };

  export type AsepriteJSON = {
    frames: Record<string, AsepriteFrameData> | AsepriteFrameData[];
    meta?: {
      frameTags?: AsepriteFrameTag[];
    };
  };

  export type PreloadAtlasInput = {
    textureKey: string;
    pngPath: string;
    jsonPath: string;
  };

  export type CreateAnimationsInput = {
    textureKey: string;
    aseprite: AsepriteJSON;
    animationKeyPrefix?: string;
    defaultRepeat?: number;
  };

  export type CreateAnimationsFromCacheInput = {
    textureKey: string;
    jsonKey: string;
    animationKeyPrefix?: string;
    defaultRepeat?: number;
  };

  export type CreatedAnimation = {
    tag: string;
    key: string;
  };

  type NormalizedFrame = {
    name: string;
    duration: number;
  };

  export function preloadAtlas(
    scene: Phaser.Scene,
    input: PreloadAtlasInput,
  ): void {
    scene.load.atlas(input.textureKey, input.pngPath, input.jsonPath);
  }

  export function createAnimations(
    scene: Phaser.Scene,
    input: CreateAnimationsInput,
  ): CreatedAnimation[] {
    const frames = normalizeFrames(input.aseprite.frames);
    const tags = input.aseprite.meta?.frameTags ?? [];

    if (frames.length === 0) {
      return [];
    }

    if (tags.length === 0) {
      const key = createAnimationKey(
        input.textureKey,
        input.animationKeyPrefix,
        "default",
      );

      createAnimation(scene, {
        animationKey: key,
        textureKey: input.textureKey,
        frames,
        repeat: input.defaultRepeat ?? -1,
      });

      return [{ tag: "default", key }];
    }

    const created: CreatedAnimation[] = [];

    for (const tag of tags) {
      const tagFrames = resolveTagFrames(frames, tag);
      if (tagFrames.length === 0) {
        continue;
      }

      const key = createAnimationKey(
        input.textureKey,
        input.animationKeyPrefix,
        tag.name,
      );

      createAnimation(scene, {
        animationKey: key,
        textureKey: input.textureKey,
        frames: tagFrames,
        repeat: input.defaultRepeat ?? -1,
      });

      created.push({ tag: tag.name, key });
    }

    return created;
  }

  export function createAnimationsFromCache(
    scene: Phaser.Scene,
    input: CreateAnimationsFromCacheInput,
  ): CreatedAnimation[] {
    const json = scene.cache.json.get(input.jsonKey) as
      | AsepriteJSON
      | undefined;
    if (!json) {
      return [];
    }

    return createAnimations(scene, {
      textureKey: input.textureKey,
      aseprite: json,
      animationKeyPrefix: input.animationKeyPrefix,
      defaultRepeat: input.defaultRepeat,
    });
  }

  function normalizeFrames(
    rawFrames: Record<string, AsepriteFrameData> | AsepriteFrameData[],
  ): NormalizedFrame[] {
    if (Array.isArray(rawFrames)) {
      return rawFrames
        .map((frame, index) => {
          const name = frame.filename ?? String(index);
          return {
            name,
            duration: frame.duration ?? 100,
          };
        })
        .filter((frame) => frame.name.length > 0);
    }

    return Object.entries(rawFrames).map(([name, frame]) => ({
      name,
      duration: frame.duration ?? 100,
    }));
  }

  function resolveTagFrames(
    frames: NormalizedFrame[],
    tag: AsepriteFrameTag,
  ): NormalizedFrame[] {
    const safeFrom = clampIndex(tag.from, frames.length);
    const safeTo = clampIndex(tag.to, frames.length);

    if (safeFrom > safeTo) {
      return [];
    }

    const segment = frames.slice(safeFrom, safeTo + 1);
    const direction = tag.direction ?? "forward";

    switch (direction) {
      case "reverse":
        return [...segment].reverse();
      case "pingpong": {
        const backward = segment.slice(0, -1).reverse();
        return [...segment, ...backward];
      }
      case "pingpong_reverse": {
        const reverseSegment = [...segment].reverse();
        const forward = reverseSegment.slice(0, -1).reverse();
        return [...reverseSegment, ...forward];
      }
      case "forward":
      default:
        return segment;
    }
  }

  function clampIndex(index: number, size: number): number {
    if (size <= 0) {
      return 0;
    }

    if (index < 0) {
      return 0;
    }

    if (index >= size) {
      return size - 1;
    }

    return index;
  }

  function createAnimationKey(
    textureKey: string,
    prefix: string | undefined,
    tagName: string,
  ): string {
    const base = prefix?.trim() || textureKey;
    return `${base}:${tagName}`;
  }

  function createAnimation(
    scene: Phaser.Scene,
    input: {
      animationKey: string;
      textureKey: string;
      frames: NormalizedFrame[];
      repeat: number;
    },
  ): void {
    if (scene.anims.exists(input.animationKey)) {
      scene.anims.remove(input.animationKey);
    }

    scene.anims.create({
      key: input.animationKey,
      frames: input.frames.map((frame) => ({
        key: input.textureKey,
        frame: frame.name,
        duration: frame.duration,
      })),
      repeat: input.repeat,
    });
  }
}
