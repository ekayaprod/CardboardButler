import BggGameService from "../../src/services/BggGameService";
import * as fetchMock from "fetch-mock";
import { readFileSync } from "fs";
import { getLargeCollection } from "./TestHelpers";

const expectedUrl = `https://api.geekdo.com/xmlapi2/collection?username=Warium&own=1&stats=1&excludesubtype=boardgameexpansion`;

describe("BggGameService", () => {
    const fetch = fetchMock.sandbox();

    afterEach(fetch.restore);

    const service = new BggGameService(fetch);

    describe("Initialization", () => {
        it("Can be constructoed with a fetch service", () => {
            new BggGameService(fetch);
        });

        it("Can be constructoed without a fetch service", () => {
            fetchMock.mock(expectedUrl, 200);
            new BggGameService();
        });
    });

    describe("Get Collection", () => {

        it("Calls the bgg api throug a proxy", async () => {
            const myMock = fetch.mock(expectedUrl, 200);
            const games = await service.getUserCollection("Warium");
            expect(myMock.lastUrl()).toEqual(expectedUrl);
        });

        it("Handles large collections", async () => {
            const games = await getLargeCollection();
            expect(games).toHaveLength(70);
        });

        describe("attributes", () => {
            const twoGameXml = readFileSync("tests/services/testxml/TwoGamesCollection.xml", "utf8");

            beforeEach(() => {
                fetch.mock(expectedUrl, 200, {
                    response: {
                        body: twoGameXml
                    }
                });
            });

            it("Returns a list of games", async () => {
                const games = await service.getUserCollection("Warium");
                expect(games).toHaveLength(2);
            });

            it("Games names are set", async () => {
                const games = await service.getUserCollection("Warium");
                expect(games[0].name).toEqual("Alchemists");
                expect(games[1].name).toEqual("Alchemists: The King's Golem");
            });

            it("Games thumbnails are set", async () => {
                const games = await service.getUserCollection("Warium");
                expect(games[0].thumbnailUrl).toEqual("https://cf.geekdo-images.com/thumb/img/4VjOkEjTXNR4KQMjaOK7JibjPSw=/fit-in/200x150/pic2241156.png");
                expect(games[1].thumbnailUrl).toEqual("https://cf.geekdo-images.com/thumb/img/8JvyNMgJl6R1Vf01ybWAd0XVQ5U=/fit-in/200x150/pic3195558.jpg");
            });

            it("Games yearpublished is set", async () => {
                const games = await service.getUserCollection("Warium");
                expect(games[0].yearPublished).toEqual(2014);
                expect(games[1].yearPublished).toEqual(2016);
            });



            it("Games image is set", async () => {
                const games = await service.getUserCollection("Warium");
                expect(games[0].imageUrl).toEqual("https://cf.geekdo-images.com/original/img/VKBFHqR2xm0EFGWfb1sPJZctMCs=/0x0/pic2241156.png");
                expect(games[1].imageUrl).toEqual("https://cf.geekdo-images.com/original/img/8KjTjLyMfdjh-ftl3p2E_MYEBYY=/0x0/pic3195558.jpg");
            });

            it("Has min and max players numbers", async () => {
                const games = await service.getUserCollection("Warium");
                expect(games[0].minPlayers).toEqual(2);
                expect(games[0].maxPlayers).toEqual(4);
                expect(games[1].minPlayers).toEqual(2);
                expect(games[1].maxPlayers).toEqual(4);
            });

            it("Has min and max playtime", async () => {
                const games = await service.getUserCollection("Warium");
                expect(games[0].minPlaytime).toEqual(120);
                expect(games[0].maxPlaytime).toEqual(120);
                expect(games[1].minPlaytime).toEqual(120);
                expect(games[1].maxPlaytime).toBeUndefined();
            });

            it("Has a bgg id", async () => {
                const games = await service.getUserCollection("Warium");
                expect(games[0].id).toBe(161970);
                expect(games[1].id).toBe(204650);
            });

            it("Has an average rating", async () => {
                const games = await service.getUserCollection("Warium");
                expect(Array.isArray(games)).toBe(true);
                if (Array.isArray(games)) {
                    expect(games[0].averagerating).toBe(7.69466);
                    expect(games[1].averagerating).toBe(8.45367);
                }
            });


            it("Has family information", async () => {
                const games = await service.getUserCollection("Warium");
                expect(Array.isArray(games)).toBe(true);
                if (Array.isArray(games)) {
                    expect(games[0].families).toContainEqual({
                        name: "strategygames", friendlyName: "Strategy Game Rank", bayesaverage: 7.50035, value: 76, type: "family"
                    });
                    expect(games[1].families.length).toBe(0);
                }
            });

            it("Has userrating information", async () => {
                const games = await service.getUserCollection("Warium");
                expect(Array.isArray(games)).toBe(true);
                if (Array.isArray(games)) {
                    const gamesWithRatings = games.filter((game) => game.userRating);
                    expect(gamesWithRatings.length).toBe(2);
                    expect(gamesWithRatings[0].userRating).toEqual({ Warium: 8 });
                    expect(gamesWithRatings[1].userRating).toEqual({ Warium: null });
                }
            });

        });

        it("can handle where yearpublished is undefined", async () => {
            const gamesWithoutYearCollection = readFileSync("tests/services/testxml/GamesWithoutYearCollection.xml", "utf8");
            fetch.mock(expectedUrl, 200, {
                response: {
                    body: gamesWithoutYearCollection
                }
            });
            const games = await service.getUserCollection("Warium");
            expect(games[0].yearPublished).toBeUndefined();
        });

    });

    describe("Get Userinfo", () => {
        const validUserUrl = `https://api.geekdo.com/xmlapi2/user?name=Warium`;
        const invalidUserUrl = `https://api.geekdo.com/xmlapi2/user?name=asdfasdfasdfasdfasdfasdf`;
        const validUserXml = readFileSync("tests/services/testxml/WariumUserResult.xml", "utf8");
        const inValidUserXml = readFileSync("tests/services/testxml/InvalidUserResult.xml", "utf8");
        it("Calls the bgg api throug a proxy", async () => {
            const myMock = fetch.mock(validUserUrl, 200);
            await service.getUserInfo("Warium");
            expect(myMock.lastUrl()).toEqual(validUserUrl);
        });

        it("valid users give valid results", async () => {
            fetch.mock(validUserUrl, 202, {
                response: {
                    status: 202,
                    body: validUserXml
                }
            });
            const userinfo = await service.getUserInfo("Warium");
            expect(userinfo.isValid).toBe(true);
        });

        it("invalid users give invalid results", async () => {
            fetch.mock(invalidUserUrl, 202, {
                response: {
                    status: 202,
                    body: inValidUserXml
                }
            });
            const userinfo = await service.getUserInfo("asdfasdfasdfasdfasdfasdf");
            expect(userinfo.isValid).toBe(false);
        });

        it("valid users gives error if bgg fails", async () => {
            const expectedError = new TypeError("Error");
            fetch.mock(validUserUrl, 503, {
                response: {
                    status: 503,
                    body: "Error",
                    throws: expectedError
                }
            });
            const result = await service.getUserInfo("Warium");
            expect(result.isValid).toBe("unknown");
            if (result.isValid === "unknown") {
                expect(result.error).toBe(expectedError);
            }
        });

        it("valid users gives error if bgg returns 500 with HTML", async () => {
            fetch.mock(validUserUrl, 500, {
                response: {
                    status: 500,
                    body: "<html><body>Internal Server Error</body></html>"
                }
            });
            const result = await service.getUserInfo("Warium");
            // If the code crashes, this test will fail or timeout.
            // We expect it to handle it gracefully (likely returning unknown valid state or error)
            expect(result.isValid).toBe("unknown");
        });

        it("valid users gives error if bgg returns 401 with HTML", async () => {
             fetch.mock(validUserUrl, 401, {
                 response: {
                     status: 401,
                     body: "<html><body>Unauthorized</body></html>"
                 }
             });
             const result = await service.getUserInfo("Warium");
             expect(result.isValid).toBe("unknown");
         });


        describe("attributes", () => {
            it("name", async () => {
                fetch.mock(validUserUrl, 202, {
                    response: {
                        status: 202,
                        body: validUserXml
                    }
                });
                const userinfo = await service.getUserInfo("Warium");
                expect(userinfo.isValid).toBe(true);
                if (userinfo.isValid === true) {
                    expect(userinfo.username).toBe("Warium");
                }
            });
        });
    });


    describe("Get Multiple Games", () => {
        const expectedUrlSingle = `https://api.geekdo.com/xmlapi2/thing?id=68448&stats=1`;

        const expectedUrl = `https://api.geekdo.com/xmlapi2/thing?id=68448,161970&stats=1`;
        const twoGamesXml = readFileSync("tests/services/testxml/TwoGameResult.xml", "utf8");
        const alchemistsXml = readFileSync("tests/services/testxml/AlchemistsResult.xml", "utf8");
        const gameId = 68448;

        const gameIds = [68448, 161970];

        beforeEach(() => {
            fetch.mock(expectedUrl, 200, {
                response: {
                    status: 200,
                    body: twoGamesXml
                }
            });

            fetch.mock(expectedUrlSingle, 200, {
                response: {
                    status: 200,
                    body: alchemistsXml
                }
            });
        });

        it("can get extended information about multiple games", async () => {
            const extendedInfo = await service.getGamesInfo(gameIds);
            expect(Array.isArray(extendedInfo)).toBe(true);
            if (Array.isArray(extendedInfo)) {
                expect(extendedInfo).toHaveLength(2);
            }
        });
    });


    describe("Get Player Plays", () => {

        beforeEach(() => {
            fetch.reset();
        });
        it("Can get a users plays", async () => {
            const expectedUrl = `https://api.geekdo.com/xmlapi2/plays?username=Warium`;
            const wariumPlays = readFileSync("tests/services/testxml/WariumPlays100.xml", "utf8");
            fetch.mock(expectedUrl, 200, {
                response: {
                    status: 200,
                    body: wariumPlays
                }
            });
            const plays = await service.getPlays("Warium");
            expect(plays).toBeDefined();
            expect(Array.isArray(plays)).toBe(true);
            if (Array.isArray(plays)) {
                expect(plays.length).toEqual(100);
            }
        });

        it("Request multiple pages if pagenation is needed.", async () => {
            const expectedUrl = `https://api.geekdo.com/xmlapi2/plays?username=Warium`;
            const expectedUrl2 = `https://api.geekdo.com/xmlapi2/plays?username=Warium&page=2`;
            const expectedUrl3 = `https://api.geekdo.com/xmlapi2/plays?username=Warium&page=3`;
            const expectedUrl4 = `https://api.geekdo.com/xmlapi2/plays?username=Warium&page=4`;
            const wariumPlays1 = readFileSync("tests/services/testxml/WariumPlays1.xml", "utf8");
            const wariumPlays2 = readFileSync("tests/services/testxml/WariumPlays2.xml", "utf8");
            const wariumPlays3 = readFileSync("tests/services/testxml/WariumPlays3.xml", "utf8");
            const wariumPlays4 = readFileSync("tests/services/testxml/WariumPlays4.xml", "utf8");
            fetch.mock(expectedUrl, 200, {
                response: {
                    status: 200,
                    body: wariumPlays1
                }
            });
            fetch.mock(expectedUrl2, 200, {
                response: {
                    status: 200,
                    body: wariumPlays2
                }
            });
            fetch.mock(expectedUrl3, 200, {
                response: {
                    status: 200,
                    body: wariumPlays3
                }
            });
            fetch.mock(expectedUrl4, 200, {
                response: {
                    status: 200,
                    body: wariumPlays4
                }
            });
            const plays = await service.getPlays("Warium");
            expect(Array.isArray(plays)).toBe(true);
            if (Array.isArray(plays)) {
                expect(plays).toBeDefined();
                expect(plays.length).toEqual(311);
            }
        });

        it("can load play info", async () => {
            const expectedUrl = `https://api.geekdo.com/xmlapi2/plays?username=Warium`;
            const wariumPlays = readFileSync("tests/services/testxml/WariumPlays100.xml", "utf8");
            fetch.mock(expectedUrl, 200, {
                response: {
                    status: 200,
                    body: wariumPlays
                }
            });
            const plays = await service.getPlays("Warium");
            expect(Array.isArray(plays)).toBe(true);
            if (Array.isArray(plays)) {
                const play = plays[0];
                expect(play.playId).toEqual(37982777);
                expect(play.date).toEqual(new Date("2019-09-28"));
                expect(play.length).toEqual(45);
                expect(play.quantity).toEqual(1);
                expect(play.gameId).toEqual(182134);
            }
        });

        it("gives empty list back when no plays", async () => {
            const expectedUrl = `https://api.geekdo.com/xmlapi2/plays?username=Cyndaq`;
            const noPlays = readFileSync("tests/services/testxml/NoPlays.xml", "utf8");
            fetch.mock(expectedUrl, 200, {
                response: {
                    status: 200,
                    body: noPlays
                }
            });
            const plays = await service.getPlays("Cyndaq");
            expect(plays).toHaveLength(0);
        });
    });


    describe("Handling errors", () => {
        const tryAgainMessage = `<message>
        Your request for this collection has been accepted and will be processed. Please try again later for access.
        </message>`;


        const backOffMessage = `<message>
        Back off
        </message>`;

        it("Returns try again when 202 is given", async () => {
            fetch.mock(expectedUrl, 202, {
                response: {
                    status: 202,
                    body: tryAgainMessage
                }
            });
            const response = await service.getUserCollection("Warium");
            expect(response).toBeInstanceOf(Object);
            if (!Array.isArray(response)) {
                expect(response.retryLater).toBeTruthy();
                expect(response.error).toBeUndefined();
            }
        });


        it("Returns backoffwhen 429 is given", async () => {
            fetch.mock(expectedUrl, 429, {
                response: {
                    status: 429,
                    body: backOffMessage
                }
            });
            const response = await service.getUserCollection("Warium");
            expect("backoff" in response).toBe(true);
            if ("backoff" in response) {
                expect(response.backoff).toBeTruthy();
            }

            expect("retryLater" in response).toBe(true);
            if ("retryLater" in response) {
                expect(response.retryLater).toBeTruthy();
            }
        });



        it("Returns try again when an error is given, but informs there was an error", async () => {
            const error = new TypeError("Error!!!");
            fetch.mock(expectedUrl, 503, {
                response: {
                    throws: error
                }
            });
            const response = await service.getUserCollection("Warium").catch((error) => { throw error; });
            expect(response).toBeInstanceOf(Object);
            if (!Array.isArray(response)) {
                expect(response.retryLater).toBeTruthy();
                expect(response.error).toEqual(error);
            }
        });
    });

});
