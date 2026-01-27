import BggGameService from "../../src/services/BggGameService";
import * as fetchMock from "fetch-mock";
import { readFileSync } from "fs";

const bggCollectionUrl = `https://boardgamegeek.com/xmlapi2/collection?username=Warium&own=1&stats=1&excludesubtype=boardgameexpansion`;
const expectedUrl = `https://corsproxy.io/?url=${encodeURIComponent(bggCollectionUrl)}`;

describe("BggGameService Performance", () => {
    const fetch = fetchMock.sandbox();
    const service = new BggGameService(fetch);
    const largeCollectionXml = readFileSync("tests/services/testxml/TheJadeKnightCollection.xml", "utf8");

    beforeEach(() => {
        fetch.mock(expectedUrl, 200, {
            response: {
                body: largeCollectionXml
            }
        });
    });

    afterEach(fetch.restore);

    it("Measure getUserCollection performance", async () => {
        const iterations = 100;
        const start = Date.now();

        for (let i = 0; i < iterations; i++) {
            const games = await service.getUserCollection("Warium");
            // Basic assertion to ensure it's working
            if (Array.isArray(games)) {
                 expect(games.length).toBeGreaterThan(0);
            }
        }

        const end = Date.now();
        const totalTime = end - start;
        console.log(`[PERF] getUserCollection 100 iterations took ${totalTime}ms`);
        console.log(`[PERF] Average time per call: ${totalTime / iterations}ms`);
    });
});
