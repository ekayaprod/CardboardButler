
import BggGameLoader from "../../src/services/BggGameLoader";
import BggGameService from "../../src/services/BggGameService";
import * as fetchMock from "fetch-mock";
import { CollectionMerger } from "../../src/services/BggGameLoader";
import { GameInfo } from "../../src/types";

// Mock data generation
const createGame = (id: number): GameInfo => ({
    id,
    name: `Game ${id}`,
    thumbnailUrl: "",
    imageUrl: "",
    averagerating: 7.5,
    families: [],
    owners: ["User"]
});

describe("BggGameLoader Benchmark", () => {
    const fetch = fetchMock.sandbox();
    const service = new BggGameService(fetch);
    // Mock getGamesInfo to return immediately
    service.getGamesInfo = jest.fn().mockImplementation((ids: number[]) => {
        return Promise.resolve(ids.map(id => ({
            description: "Desc",
            suggestedNumberOfPlayers: {}
        })));
    });

    const merger = new CollectionMerger();
    let loader: BggGameLoader;

    beforeEach(() => {
        loader = new BggGameLoader(service, merger, false);
    });

    afterEach(() => {
        fetch.restore();
    });

    test("loadExtendedInfo performance with many games", async () => {
        const gameCount = 10000;
        const games: GameInfo[] = [];
        for (let i = 0; i < gameCount; i++) {
            games.push(createGame(i));
        }

        // Mock getting collection to return these games
        service.getUserCollection = jest.fn().mockResolvedValue(games);

        // Load collection first to populate internal state if needed,
        // but loadExtendedInfo works on getAllGamesPlus.
        // We need to make sure loader has these games known.
        // BggGameLoader stores games in collectionMap.

        await loader.loadCollections(["User"]);

        const start = Date.now();
        await loader.loadExtendedInfo();
        const end = Date.now();

        console.log(`loadExtendedInfo for ${gameCount} games took ${end - start}ms`);
    });
});
