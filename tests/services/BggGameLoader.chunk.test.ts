import BggGameLoader from "../../src/services/BggGameLoader";
import BggGameService from "../../src/services/BggGameService";
import { CollectionMerger } from "../../src/services/CollectionMerger";

describe("BggGameLoader chunk method", () => {
    const service = new BggGameService(null);
    const merger = new CollectionMerger();
    let loader: BggGameLoader;

    beforeEach(() => {
        loader = new BggGameLoader(service, merger, false);
    });

    it("should chunk an array into smaller arrays of a specified size", () => {
        const inputArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const chunkSize = 3;
        const expectedChunks = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]];
        const actualChunks = loader.chunk(inputArray, chunkSize);
        expect(actualChunks).toEqual(expectedChunks);
    });
});
