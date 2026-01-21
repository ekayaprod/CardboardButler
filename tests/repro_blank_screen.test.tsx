
import * as React from "react";
import App from "../src/components/App";
import { render, fireEvent, waitForElement } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import BggGameService from "../src/services/BggGameService";
import * as fetchMock from "fetch-mock";

describe("Blank Screen Reproduction", () => {

    let service: BggGameService;

    beforeEach(() => {
        const fetch = fetchMock.sandbox();
        service = new BggGameService(fetch);
    });

    it("Renders blank screen (or nothing visible) when user has no games", async () => {
        // Mock getUserInfo to return valid
        service.getUserInfo = jest.fn((username) => (new Promise((resolver) => resolver({
            isValid: true,
            username: username
        }))));
        // Mock getUserCollection to return empty array
        service.getUserCollection = jest.fn((username) => (new Promise((resolver) => resolver(
            []
        ))));
        service.getPlays = jest.fn((username) => (new Promise((resolver) => resolver(
            []
        ))));

        const { getByTestId, queryByTestId, queryByText } = render(<App bggServce={service} />);

        // Enter username
        const input = getByTestId("Input0");
        fireEvent.change(input, { target: { value: "EmptyUser" } });

        // Wait for validation (wait for the 300ms debounce + async)
        await waitForElement(() => getByTestId("Input0Valid"));

        // Click Use Names
        fireEvent.click(getByTestId("UseNames"));

        // Wait for async operations
        // loadCollections calls service.getUserCollection immediately (in promise)
        // We need to wait for promise resolution.
        // Since we mocked with Promises, we can use a small delay or wait for something to change?
        // But if it goes blank, we can't wait for "element to appear".
        // We can wait for WelcomePage to disappear.

        await waitForElement(() => queryByTestId("WelcomePage") === null);

        // Now check if CollectionPage is visible
        expect(queryByTestId("CollectionPage")).not.toBeNull();

        // Check if "No games found" is visible
        expect(queryByText("Sorry, I could not find any games that match what you are looking for.")).not.toBeNull();
    });
});
