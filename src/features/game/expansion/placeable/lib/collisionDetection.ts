import {
  Collectibles,
  GameState,
  InventoryItemName,
  IslandType,
  PlacedItem,
  Position,
} from "features/game/types/game";
import { EXPANSION_ORIGINS, LAND_SIZE } from "../../lib/constants";
import { Coordinates } from "../../components/MapPlacement";
import {
  ANIMAL_DIMENSIONS,
  COLLECTIBLES_DIMENSIONS,
  CollectibleName,
  getKeys,
} from "features/game/types/craftables";
import { BUILDINGS_DIMENSIONS } from "features/game/types/buildings";
import {
  MUSHROOM_DIMENSIONS,
  RESOURCE_DIMENSIONS,
} from "features/game/types/resources";
import { CollectibleLocation } from "features/game/types/collectibles";

type BoundingBox = Position;

/**
 * Axis aligned bounding box collision detection
 * https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
 */
export function isOverlapping(
  boundingBox1: BoundingBox,
  boundingBox2: BoundingBox
) {
  const xmin1 = boundingBox1.x;
  const xmin2 = boundingBox2.x;

  const xmax1 = boundingBox1.x + boundingBox1.width;
  const xmax2 = boundingBox2.x + boundingBox2.width;

  const ymin1 = boundingBox1.y - boundingBox1.height;
  const ymin2 = boundingBox2.y - boundingBox2.height;

  const ymax1 = boundingBox1.y;
  const ymax2 = boundingBox2.y;

  return xmin1 < xmax2 && xmax1 > xmin2 && ymin1 < ymax2 && ymax1 > ymin2;
}

const splitBoundingBox = (boundingBox: BoundingBox) => {
  const boxCount = boundingBox.width * boundingBox.height;

  return Array.from({ length: boxCount }).map((_, i) => ({
    x: boundingBox.x + (i % boundingBox.width),
    y: boundingBox.y - Math.floor(i / boundingBox.width),
    width: 1,
    height: 1,
  }));
};

function detectWaterCollision(expansions: number, boundingBox: BoundingBox) {
  const expansionBoundingBoxes: BoundingBox[] = new Array(expansions)
    .fill(null)
    .map((_, expansionIndex) => ({
      x: EXPANSION_ORIGINS[expansionIndex].x - LAND_SIZE / 2,
      y: EXPANSION_ORIGINS[expansionIndex].y + LAND_SIZE / 2,
      width: LAND_SIZE,
      height: LAND_SIZE,
    }));

  /**
   * A bounding box may overlap multiple land expansions.
   *
   * To check if a bounding box completely overlaps land, the
   * bounding box is split into smaller, 1 by 1 bounding boxes,
   * and each box is checked independently.
   */
  const isOverlappingExpansion = (boundingBox: BoundingBox) => {
    return expansionBoundingBoxes.some((expansionBoundingBox) =>
      isOverlapping(boundingBox, expansionBoundingBox)
    );
  };
  const smallerBoxes = splitBoundingBox(boundingBox);
  const isOverLand = smallerBoxes.every(isOverlappingExpansion);

  return !isOverLand;
}

const PLACEABLE_DIMENSIONS = {
  ...BUILDINGS_DIMENSIONS,
  ...COLLECTIBLES_DIMENSIONS,
  ...RESOURCE_DIMENSIONS,
};

function detectPlaceableCollision(state: GameState, boundingBox: BoundingBox) {
  const {
    collectibles,
    buildings,
    crops,
    trees,
    stones,
    gold,
    iron,
    crimstones,
    sunstones,
    fruitPatches,
    buds,
    beehives,
    flowers: { flowerBeds },
  } = state;

  const placed = {
    ...collectibles,
    ...buildings,
  };

  const placeableBounds = getKeys(placed).flatMap((name) => {
    const items = placed[name] as PlacedItem[];
    const dimensions = PLACEABLE_DIMENSIONS[name];

    return items.map((item) => ({
      x: item.coordinates.x,
      y: item.coordinates.y,
      height: dimensions.height,
      width: dimensions.width,
    }));
  });

  const resources = [
    ...Object.values(trees),
    ...Object.values(stones),
    ...Object.values(iron),
    ...Object.values(gold),
    ...Object.values(crimstones),
    ...Object.values(sunstones),
    ...Object.values(crops),
    ...Object.values(fruitPatches),
    ...Object.values(beehives),
    ...Object.values(flowerBeds),
  ];

  const resourceBoundingBoxes = resources.map((item) => ({
    x: item.x,
    y: item.y,
    height: item.height,
    width: item.width,
  }));

  const budsBoundingBox = Object.values(buds ?? {})
    .filter(
      (bud) => !!bud.coordinates && (!bud.location || bud.location === "farm")
    )
    .map((item) => ({
      x: item.coordinates!.x,
      y: item.coordinates!.y,
      height: 1,
      width: 1,
    }));

  const boundingBoxes = [
    ...placeableBounds,
    ...resourceBoundingBoxes,
    ...budsBoundingBox,
  ];

  return boundingBoxes.some((resourceBoundingBox) =>
    isOverlapping(boundingBox, resourceBoundingBox)
  );
}

export const HOME_BOUNDS: Record<IslandType, BoundingBox> = {
  basic: {
    height: 6,
    width: 6,
    x: -3,
    y: -3,
  },
  spring: {
    height: 12,
    width: 12,
    x: -6,
    y: -6,
  },
  desert: {
    height: 16,
    width: 16,
    x: -8,
    y: -8,
  },
};

const NON_COLLIDING_OBJECTS: InventoryItemName[] = [
  "Rug",
  "Sunrise Bloom Rug",
  "Flower Rug",
];
function detectHomeCollision({
  state,
  position,
  name,
}: {
  state: GameState;
  position: BoundingBox;
  name: InventoryItemName;
}) {
  const bounds = HOME_BOUNDS[state.island.type];

  const isOutside =
    position.x < bounds.x ||
    position.x + position.width > bounds.x + bounds.width ||
    position.y > bounds.y + bounds.height ||
    position.y - position.height < bounds.y;

  if (isOutside) {
    return true;
  }

  if (NON_COLLIDING_OBJECTS.includes(name)) {
    return false;
  }

  const { home } = state;

  const placed = home.collectibles;

  const collidingItems = getKeys(placed).filter(
    (name) => !NON_COLLIDING_OBJECTS.includes(name)
  );

  const placeableBounds = collidingItems.flatMap((name) => {
    const items = placed[name] as PlacedItem[];
    const dimensions = PLACEABLE_DIMENSIONS[name];

    return items.map((item) => ({
      x: item.coordinates.x,
      y: item.coordinates.y,
      height: dimensions.height,
      width: dimensions.width,
    }));
  });

  const budsBoundingBox = Object.values(state.buds ?? {})
    .filter((bud) => !!bud.coordinates && bud.location === "home")
    .map((item) => ({
      x: item.coordinates!.x,
      y: item.coordinates!.y,
      height: 1,
      width: 1,
    }));

  const boundingBoxes = [...placeableBounds, ...budsBoundingBox];

  return boundingBoxes.some((resourceBoundingBox) =>
    isOverlapping(position, resourceBoundingBox)
  );
}

function detectChickenCollision(state: GameState, boundingBox: BoundingBox) {
  const { chickens } = state;

  const boundingBoxes = getKeys(chickens).flatMap((name) => {
    const chicken = chickens[name];
    const dimensions = ANIMAL_DIMENSIONS.Chicken;

    return {
      x: chicken.coordinates?.x ?? -999,
      y: chicken.coordinates?.y ?? -999,
      height: dimensions.height,
      width: dimensions.width,
    };
  });

  return boundingBoxes.some((resourceBoundingBox) =>
    isOverlapping(boundingBox, resourceBoundingBox)
  );
}

function detectMushroomCollision(state: GameState, boundingBox: BoundingBox) {
  const { mushrooms } = state;
  if (!mushrooms) return false;

  const boundingBoxes = getKeys(mushrooms.mushrooms).flatMap((id) => {
    const mushroom = mushrooms.mushrooms[id];
    const dimensions = MUSHROOM_DIMENSIONS;

    return {
      x: mushroom.x,
      y: mushroom.y,
      height: dimensions.height,
      width: dimensions.width,
    };
  });

  return boundingBoxes.some((resourceBoundingBox) =>
    isOverlapping(boundingBox, resourceBoundingBox)
  );
}

enum Direction {
  Left,
  Right,
  Top,
  Bottom,
}

/**
 * Detects whether a bounding box collides with a land corner.
 *
 * As corners of a land change depending on how many expansions you have, this function looks for
 * neighbouring expansions in all directions to determine where the corners are and whether the bounding box
 * overlaps with any of them.
 * @param expansions The list of expansions that are not under construction.
 * @param boundingBox
 * @returns boolean
 */
function detectLandCornerCollision(
  expansions: number,
  boundingBox: BoundingBox
) {
  // Mid point coordinates for all land expansions
  const originCoordinatesForExpansions: Coordinates[] = new Array(expansions)
    .fill(null)
    .map((_, i) => EXPANSION_ORIGINS[i]);

  /**
   *
   * @param expansionOrigin Center coordinates for a land expansion
   * @param offset coordinate multiplier to determine direction to check eg bottomLeft = { x: -1, y: -1 }
   * @returns Boolean
   */
  const expansionExistsAtOffset = (
    expansionOrigin: Coordinates,
    offset: {
      x: -1 | 0 | 1;
      y: -1 | 0 | 1;
    }
  ) => {
    return originCoordinatesForExpansions.some((neighbour) => {
      return (
        neighbour.x === expansionOrigin.x + LAND_SIZE * offset.x &&
        neighbour.y === expansionOrigin.y + LAND_SIZE * offset.y
      );
    });
  };

  const hasNeighbouringExpansion = (
    origin: Coordinates,
    direction: Direction
  ) => {
    switch (direction) {
      case Direction.Left:
        return expansionExistsAtOffset(origin, { x: -1, y: 0 });
      case Direction.Right:
        return expansionExistsAtOffset(origin, { x: 1, y: 0 });
      case Direction.Top:
        return expansionExistsAtOffset(origin, { x: 0, y: 1 });
      case Direction.Bottom:
        return expansionExistsAtOffset(origin, { x: 0, y: -1 });
    }
  };

  return originCoordinatesForExpansions.some((originCoordinate) => {
    const overlapsTopLeft = () =>
      !hasNeighbouringExpansion(originCoordinate, Direction.Left) &&
      !hasNeighbouringExpansion(originCoordinate, Direction.Top) &&
      isOverlapping(boundingBox, {
        x: originCoordinate.x - LAND_SIZE / 2,
        y: originCoordinate.y + LAND_SIZE / 2,
        width: 1,
        height: 1,
      });

    const overlapsTopRight = () =>
      !hasNeighbouringExpansion(originCoordinate, Direction.Right) &&
      !hasNeighbouringExpansion(originCoordinate, Direction.Top) &&
      isOverlapping(boundingBox, {
        x: originCoordinate.x + LAND_SIZE / 2 - 1,
        y: originCoordinate.y + LAND_SIZE / 2,
        width: 1,
        height: 1,
      });

    const overlapsBottomLeft = () =>
      !hasNeighbouringExpansion(originCoordinate, Direction.Left) &&
      !hasNeighbouringExpansion(originCoordinate, Direction.Bottom) &&
      isOverlapping(boundingBox, {
        x: originCoordinate.x - LAND_SIZE / 2,
        y: originCoordinate.y - LAND_SIZE / 2 + 1,
        width: 1,
        height: 1,
      });

    const overlapsBottomRight = () =>
      !hasNeighbouringExpansion(originCoordinate, Direction.Right) &&
      !hasNeighbouringExpansion(originCoordinate, Direction.Bottom) &&
      isOverlapping(boundingBox, {
        x: originCoordinate.x + LAND_SIZE / 2 - 1,
        y: originCoordinate.y - LAND_SIZE / 2 + 1,
        width: 1,
        height: 1,
      });

    return (
      overlapsTopLeft() ||
      overlapsTopRight() ||
      overlapsBottomLeft() ||
      overlapsBottomRight()
    );
  });
}

export function detectCollision({
  state,
  position,
  location,
  name,
}: {
  location: CollectibleLocation;
  state: GameState;
  position: Position;
  name: InventoryItemName;
}) {
  if (location === "home") {
    return detectHomeCollision({ state, position, name });
  }

  const expansions = state.inventory["Basic Land"]?.toNumber() ?? 3;

  return (
    detectWaterCollision(expansions, position) ||
    detectPlaceableCollision(state, position) ||
    detectLandCornerCollision(expansions, position) ||
    detectChickenCollision(state, position) ||
    detectMushroomCollision(state, position)
  );
}

export type AOEItemName =
  | "Basic Scarecrow"
  | "Emerald Turtle"
  | "Tin Turtle"
  | "Sir Goldensnout"
  | "Bale"
  | "Scary Mike"
  | "Laurie the Chuckle Crow"
  | "Queen Cornelia"
  | "Gnome";

/**
 * Detects whether an item is within the area of effect of a placeable with AOE.
 * @param AOEItem Item which has an area of effect
 * @param item Item to check if it is within the area of effect
 * @returns boolean
 *
 **/
export function isWithinAOE(
  AOEItemName: AOEItemName,
  AOEItem: Position,
  effectItem: Position
): boolean {
  const { x, y, height, width } = AOEItem;

  const isWithinRectangle = (
    topLeft: Position,
    bottomRight: Position
  ): boolean => {
    return (
      effectItem.x >= topLeft.x &&
      effectItem.x <= bottomRight.x &&
      effectItem.y <= topLeft.y &&
      effectItem.y >= bottomRight.y
    );
  };

  const isWithinDistance = (
    dx: number,
    dy: number,
    distance: number
  ): boolean => {
    return Math.abs(dx) <= distance && Math.abs(dy) <= distance;
  };

  switch (AOEItemName) {
    case "Basic Scarecrow":
    case "Scary Mike":
    case "Laurie the Chuckle Crow": {
      return isWithinRectangle(
        { x: x - 1, y: y - height, height, width },
        { x: x + 1, y: y - height - 2, height, width }
      );
    }

    case "Emerald Turtle":
    case "Tin Turtle": {
      const dxTurtle = x - effectItem.x;
      const dyTurtle = y - effectItem.y;
      return (
        isWithinDistance(dxTurtle, dyTurtle, 1) &&
        (dxTurtle !== 0 || dyTurtle !== 0)
      );
    }
    case "Sir Goldensnout":
    case "Bale": {
      const dxRect = effectItem.x - x;
      const dyRect = effectItem.y - y;
      return (
        dxRect >= -1 && dxRect <= width && dyRect <= 1 && dyRect >= -height
      );
    }

    case "Queen Cornelia": {
      return isWithinRectangle(
        { x: x - 1, y: y + 1, height, width },
        { x: x + width, y: y - height, height, width }
      );
    }

    case "Gnome": {
      return effectItem.x === x && effectItem.y === y - 1;
    }

    default:
      return false;
  }
}

export function isAOEImpacted(
  collectibles: Collectibles,
  resourcePosition: Position,
  AoEAffectedNames: AOEItemName[]
) {
  return AoEAffectedNames.some((name) => {
    if (collectibles[name as CollectibleName]?.[0]) {
      const coordinates =
        collectibles[name as CollectibleName]?.[0].coordinates;

      if (!coordinates) return false;

      const dimensions = COLLECTIBLES_DIMENSIONS[name as CollectibleName];

      const itemPosition: Position = {
        x: coordinates.x,
        y: coordinates.y,
        height: dimensions.height,
        width: dimensions.width,
      };

      if (isWithinAOE(name, itemPosition, resourcePosition)) {
        return true;
      }
    }
  });
}

export function pickEmptyPosition({
  bounding,
  gameState,
}: {
  bounding: BoundingBox;
  gameState: GameState;
}): Position | undefined {
  const positionsInBounding = splitBoundingBox(bounding);

  const availablePositions = positionsInBounding.filter(
    (position) =>
      detectCollision({
        state: gameState,
        position,
        location: "farm",
        name: "Basic Bear", // Just assume the item is 1x1
      }) === false
  );

  return availablePositions[0];
}
