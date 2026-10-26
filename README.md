# Tourism Explorer — HyperDart Component

Tourism Explorer is a HyperDart component that helps users discover tourist attractions and places of interest using natural-language queries. It uses Geoapify APIs to resolve destinations and retrieve nearby places, presenting the results in a category-filterable interface.

## 1. Overview

Users can search for tourist attractions by entering a destination or using their current location. They can explore categories such as museums, temples, forts, parks, monuments, and viewpoints.

The component aims to provide relevant tourist destinations quickly, with clear results, useful links, and appropriate handling of empty searches, location errors, and API failures.

## 2. Architecture

The component follows a client-side React architecture integrated with HyperDart.

### Architecture Flow

```text
HyperDart Platform
       |
       v
HyperDart Component Trigger
       |
       v
withHD Frontend Wrapper
       |
       v
Tourism Explorer React UI
       |
       v
Query Parsing and Category Detection
       |
       v
Location Resolution
       |
       +---------------------------+
       |                           |
       v                           v
Geoapify Geocoding API       Browser Geolocation API
       |                           |
       v                           v
Destination Coordinates      Current Coordinates
       |                           |
       +-------------+-------------+
                     |
                     v
             Geoapify Places API
                     |
                     v
           Place Data Processing
                     |
                     v
          Category Matching/Filtering
                     |
                     v
             Results Rendering
                     |
          +----------+----------+
          |          |          |
          v          v          v
       Results     Empty      Error
        Cards      State      State
```

### Main Components

**1. HyperDart Integration**

The `withHD` wrapper connects the React component to the HyperDart platform and enables it to be launched through configured triggers.

**2. User Interface**

`src/frontend/NewComponent.jsx` contains the search interface, query handling, location selection, API requests, result processing, and loading, empty, and error states.

**3. Styling**

`src/frontend/NewComponent.css` defines the component's visual presentation and layout.

**4. Geocoding Service**

Geoapify Geocoding converts a typed destination, such as Delhi or Paris, into geographic coordinates.

**5. Places Service**

Geoapify Places retrieves place information using coordinates and category-related request parameters.

**6. Browser Geolocation**

The browser Geolocation API can provide the user's current coordinates after permission is granted.

**7. Sandbox**

`src/sandbox/main.jsx` loads the component in the HyperDart sandbox. `searchData.json` provides sample queries for testing. These fixtures are not the live tourism database.

## 3. Search and Data Flow

### Step 1: User Input

The user enters a query, for example:

- `tourist attractions in Paris`
- `museums in Delhi`
- `parks near Gurgaon`
- `forts in Jaipur`

The user can also search using their current location if the browser permits location access.

### Step 2: Query Parsing

The component parses the query to identify the destination and, where supported, the requested category.

Category selection can further narrow the results.

Query parsing uses rules defined in the component; it is not an unrestricted AI language model.

### Step 3: Resolve the Location

For a typed destination, the component calls the Geoapify Geocoding API:

`https://api.geoapify.com/v1/geocode/search`

The response provides geographic information, including coordinates used for the place search.

For a current-location search, the browser Geolocation API supplies the coordinates after permission is granted.

### Step 4: Fetch Tourist Places

The component calls the Geoapify Places API:

`https://api.geoapify.com/v2/places`

The request uses the resolved coordinates and relevant category parameters to retrieve nearby places.

### Step 5: Process Results

The component reads the returned place features and their properties. It applies the supported category-matching logic where needed and prepares the matching records for display.

The results depend on Geoapify's available data and the requested location and categories.

### Step 6: Display Results

Matching places are displayed as attraction cards. Available place details and map or website links can help users explore the results further.

### Step 7: Handle Empty Results and Errors

The component handles different outcomes:

- Loading state while requests are running.
- Empty state when no suitable results are found.
- Error state when an API request fails.
- Location-related messages when geolocation is unavailable or permission is denied.

Users can try another destination or category.

## 4. Supported Search Categories

The component is designed to support categories including:

- Tourist attractions and sights
- Museums
- Temples and places of worship
- Forts and historic buildings
- Parks
- Monuments
- Viewpoints

Actual results depend on the category mapping and data returned by Geoapify.

## 5. Technology Stack

- React
- JavaScript
- Vite
- HyperDart frontend package
- HyperDart sandbox package
- Geoapify Geocoding API
- Geoapify Places API
- Browser Geolocation API
- CSS

## 6. Project Structure

```text
tourism_explorer/
├── hyperdart.config.js
├── searchData.json
├── package.json
├── .env
├── .env.example
└── src/
    ├── frontend/
    │   ├── index.jsx
    │   ├── NewComponent.jsx
    │   └── NewComponent.css
    └── sandbox/
        ├── main.jsx
        └── index.css
```

### Important Files

- `hyperdart.config.js` — HyperDart component configuration, triggers, keywords, and query patterns.
- `searchData.json` — sample search queries used by the sandbox.
- `src/frontend/index.jsx` — HyperDart `withHD` integration entry point.
- `src/frontend/NewComponent.jsx` — main component logic and API integration.
- `src/frontend/NewComponent.css` — component styling.
- `src/sandbox/main.jsx` — sandbox entry point.
- `.env` — local environment variables; must not be committed.
- `.env.example` — example environment variable names with placeholder values.

## 7. Environment Configuration

Create a `.env` file in the project root:

```env
VITE_GEOAPIFY_API_KEY=your_actual_api_key
```

The `.env.example` file should contain only a placeholder:

```env
VITE_GEOAPIFY_API_KEY=your_geoapify_api_key_here
```

Never commit the actual `.env` file or expose the real key in documentation, source control, or screenshots.

## 8. Installation and Local Development

### Prerequisites

- Node.js and npm
- A Geoapify API key

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm start
```

Open the local URL printed by Vite.

### Build the Component

```bash
npm run build
```

If configured in the project, run the publishing validation script:

```bash
npm run prepublishOnly
```

Test different destinations, categories, empty-result cases, API errors, and current-location behavior before publishing.

## 9. HyperDart Configuration and Publishing

Before publishing:

1. Verify the trigger keywords and query patterns in `hyperdart.config.js`.
2. Set the correct GitHub repository URL.
3. Add a valid demo video URL if required by the HyperDart publishing validator.
4. Verify the package metadata and registry configuration in `package.json`.
5. Ensure `.env` is excluded from Git.
6. Run the production build and publishing validation.
7. Follow the official HyperDart registry authentication and publishing workflow.

Publishing documentation:

https://hyperdart.com/docs/docs/publish/

## 10. Robustness and Limitations

**Location resolution:** Ambiguous or misspelled destinations may resolve incorrectly.

**Data coverage:** Geoapify may not have suitable results for every location or category.

**Category matching:** Category filters depend on the component's mappings and the metadata returned by Geoapify.

**Geolocation:** Current-location searches require browser permission and a supported execution environment. An embedded iframe may restrict location access.

**API and network failures:** Invalid keys, connectivity problems, provider restrictions, and rate limits can cause requests to fail.

**Query understanding:** Natural-language handling is based on the implemented parsing rules and supported query patterns.

**Third-party data:** Place details and links depend on Geoapify and may be incomplete or outdated.

## 11. Security

The frontend uses the Geoapify API directly.

Vite environment variables prefixed with `VITE_` are exposed to client-side code when referenced by the application. Excluding `.env` from Git protects the repository from accidental key disclosure, but does not make a browser-used key secret.

To reduce risk:

- Restrict the Geoapify key using available provider controls, such as allowed origins and usage limits.
- Never commit `.env` or other secrets.
- Use a backend or serverless proxy if the API key must remain confidential.

A backend proxy is not part of the current client-side architecture described here.

## 12. Evaluation Focus

The component should be tested against the following judging criteria:

- **Design and creativity — 25%:** Original interface and interaction that works in sidebar and mainline layouts, in light and dark themes.
- **Usefulness and clarity — 20%:** Quickly presents relevant attractions for the requested destination.
- **Accuracy and relevance — 15%:** Returns tourist places near the correct location rather than presenting restaurants, hotels, or shops as primary results.
- **Robustness — 15%:** Handles different locations, categories, queries, API failures, and empty results.
- **Understanding and live review — 15%:** Ability to explain the architecture and make a small change to the component during review.
- **Code quality and README — 10%:** Readable code, clear documentation, and API-key protection.

## 13. Future Improvements

Potential improvements include:

- Stronger query parsing and support for more natural-language patterns.
- Better validation of place categories to prevent irrelevant results.
- Improved handling of ambiguous destinations.
- More detailed place information when supported by the provider.
- Automated tests for query parsing, filtering, empty results, and API failures.
- A backend or serverless proxy for confidential API-key handling.

## License

Add the license appropriate for the project before public distribution.
