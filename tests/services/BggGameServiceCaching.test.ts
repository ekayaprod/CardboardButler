import BggGameService from "../../src/services/BggGameService";
import * as fetchMock from "fetch-mock";

const bggCollectionUrl = `https://boardgamegeek.com/xmlapi2/collection?username=Warium&own=1&stats=1&excludesubtype=boardgameexpansion`;
const expectedUrl = `https://corsproxy.io/?url=${encodeURIComponent(bggCollectionUrl)}`;

describe("BggGameService Caching", () => {
    let fetch: fetchMock.FetchMockSandbox;
    let service: BggGameService;
    const mockXml = `<items totalitems="1"><item objectid="123"><name>Test Game</name><yearpublished>2021</yearpublished><stats minplayers="2" maxplayers="4" minplaytime="60" maxplaytime="90" playingtime="60" numowned="1000"><rating value="8"><average value="8"/><ranks><rank type="family" id="1" name="strategygames" friendlyname="Strategy Game Rank" value="1" bayesaverage="8" /></ranks></rating></stats><status own="1"/></item></items>`;

    beforeEach(() => {
        fetch = fetchMock.sandbox();
        service = new BggGameService(fetch);
        fetch.mock(expectedUrl, 200, {
            response: {
                body: mockXml
            }
        });
    });

    afterEach(() => {
        fetch.restore();
        jest.restoreAllMocks();
    });

    it("should fetch only once for repeated requests within TTL", async () => {
        await service.getUserCollection("Warium");
        await service.getUserCollection("Warium");

        // The service might try multiple proxies, but since the first one succeeds (mocked),
        // it should only be one network call if cached.
        // If not cached, it would be two network calls.
        const calls = fetch.calls();
        expect(calls.length).toBe(1);
    });

    it("should re-fetch after TTL expires", async () => {
        const start = 1000000;
        const spy = jest.spyOn(Date, "now").mockReturnValue(start);

        await service.getUserCollection("Warium");
        expect(fetch.calls().length).toBe(1);

        // Advance time by TTL + 1ms (5 mins = 300,000ms)
        spy.mockReturnValue(start + 300001);

        await service.getUserCollection("Warium");
        expect(fetch.calls().length).toBe(2);
    });

    it("should not cache errors", async () => {
        // Mock failure first
        fetch.mock(expectedUrl, 503, { overwriteRoutes: true });
        const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(bggCollectionUrl)}`;
        fetch.mock(proxy2, 503);
        const proxy3 = `https://thingproxy.freeboard.io/fetch/${bggCollectionUrl}`;
        fetch.mock(proxy3, 503);

        const result = await service.getUserCollection("Warium");
        // Expect failure/retry
        expect(result).toHaveProperty("retryLater");

        // Reset to success
        fetch.reset();
        fetch.mock(expectedUrl, 200, {
            response: {
                body: mockXml
            }
        });

        // Try again
        await service.getUserCollection("Warium");

        // Should have called again
        expect(fetch.calls().length).toBeGreaterThan(0);
        // The last call should be to the expectedUrl
        expect(fetch.lastUrl()).toBe(expectedUrl);
    });
});
