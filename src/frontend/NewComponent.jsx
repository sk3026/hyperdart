
import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import "./NewComponent.css";

const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || "";

const CATEGORIES = [
  "all",
  "museum",
  "temple",
  "fort",
  "park",
  "monument",
  "viewpoint",
];

const CATEGORY_MAP = {
  all: "tourism.sights",
  museum: "entertainment.museum",
  temple: "religion.place_of_worship",
  fort: "building.historic",
  park: "leisure.park",
  monument: "tourism.sights",
  viewpoint: "tourism.sights",
};

const CATEGORY_KEYWORDS = {
  museum: ["museum", "gallery"],
  temple: ["temple", "shrine", "worship", "religious"],
  fort: ["fort", "fortress", "castle"],
  park: ["park", "garden"],
  monument: ["monument", "memorial", "statue"],
  viewpoint: ["viewpoint", "lookout", "observation"],
};

function getRecords(value) {
  if (typeof value === "string") {
    try {
      return getRecords(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

function getSearchContext(props) {
  const records = [
    ...getRecords(props?.searchData),
    ...getRecords(props?.searchdata),
    ...getRecords(props?.data),
    ...getRecords(props?.searchDataJson),
    ...getRecords(props?.search_data),
  ];

  const record = records.find((item) => item?.query) || {};
  const query =
    record.query || props?.query || props?.searchQuery || "";

  const entities = [
    ...(Array.isArray(record.entities) ? record.entities : []),
    ...records
      .filter((item) => item !== record)
      .flatMap((item) =>
        Array.isArray(item?.entities) ? item.entities : []
      ),
    ...getRecords(props?.entities),
  ];

  const location = entities.find((entity) => {
    const geo = entity?.entityInfo?.geo || entity?.geo || {};
    const lat = Number(geo.lat ?? geo.latitude);
    const lon = Number(
      geo.long ?? geo.lon ?? geo.longitude
    );

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  });

  const geo =
    location?.entityInfo?.geo || location?.geo || {};

  return {
    query,
    destination:
      location?.entityInfo?.name ||
      location?.word ||
      location?.primaryText ||
      "",
    latitude: location ? Number(geo.lat ?? geo.latitude) : null,
    longitude: location
      ? Number(geo.long ?? geo.lon ?? geo.longitude)
      : null,
  };
}

function parseLocationQuery(input) {
  const originalQuery = input.trim();
  const lower = originalQuery.toLowerCase();

  const isNearMe =
    /\b(near me|nearby|my location|current location)\b/i.test(lower);

  const categoryRules = [
    { category: "museum", regex: /\bmuseums?\b/i },
    { category: "temple", regex: /\btemples?\b/i },
    { category: "fort", regex: /\bforts?\b/i },
    { category: "park", regex: /\bparks?\b/i },
    { category: "monument", regex: /\bmonuments?\b/i },
    { category: "viewpoint", regex: /\bviewpoints?\b/i },
  ];

  const matched = categoryRules.find(({ regex }) =>
    regex.test(originalQuery)
  );

  let location = originalQuery
    .replace(
      /\b(show|find|search|explore|list|get|recommend|suggest|best|top|famous|popular|tourist|attractions?|places|things|to|do|visit|visiting|sights|landmarks|in|near|around|of|me|my|current|location)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "");

  return {
    originalQuery,
    category: matched?.category || "all",
    location,
    isNearMe,
  };
}

function getPlaceCategory(place) {
  const categories = (place.categories || []).map((value) =>
    value.toLowerCase()
  );

  const text = [
    place.name,
    place.address,
    place.category,
    ...categories,
  ]
    .join(" ")
    .toLowerCase();

  for (const category of CATEGORIES.filter((item) => item !== "all")) {
    if (
      categories.some((value) => {
        if (category === "museum") {
          return value.includes("museum") || value.includes("gallery");
        }
        if (category === "temple") {
          return (
            value.includes("place_of_worship") ||
            value.includes("religion")
          );
        }
        if (category === "fort") {
          return value.includes("fort") || value.includes("castle");
        }
        if (category === "park") {
          return value.includes("park") || value.includes("garden");
        }
        if (category === "monument") {
          return (
            value.includes("monument") ||
            value.includes("memorial")
          );
        }
        if (category === "viewpoint") {
          return (
            value.includes("viewpoint") ||
            value.includes("observation")
          );
        }
        return false;
      })
    ) {
      return category;
    }

    if (CATEGORY_KEYWORDS[category].some((word) => text.includes(word))) {
      return category;
    }
  }

  return categories.find((value) => value.startsWith("tourism."))
    ?.split(".")
    .pop()
    .replaceAll("_", " ") || "Attraction";
}

function matchesCategory(place, category) {
  if (category === "all") return true;

  const categories = (place.categories || []).map((value) =>
    value.toLowerCase()
  );

  const exactCategory = {
    museum: (value) =>
      value.includes("museum") || value.includes("gallery"),
    temple: (value) =>
      value.includes("place_of_worship") ||
      value.includes("religion") ||
      value.includes("temple"),
    fort: (value) =>
      value.includes("fort") ||
      value.includes("castle") ||
      value.includes("fortress"),
    park: (value) =>
      value.includes("park") || value.includes("garden"),
    monument: (value) =>
      value.includes("monument") ||
      value.includes("memorial") ||
      value.includes("statue"),
    viewpoint: (value) =>
      value.includes("viewpoint") ||
      value.includes("observation"),
  };

  if (categories.some(exactCategory[category] || (() => false))) {
    return true;
  }

  const text = [
    place.name,
    place.address,
    place.category,
  ]
    .join(" ")
    .toLowerCase();

  return (CATEGORY_KEYWORDS[category] || []).some((word) =>
    text.includes(word)
  );
}

export default function NewComponent(props) {
  const context = getSearchContext(props);

  const [places, setPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(
    parseLocationQuery(context.query).category
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [searched, setSearched] = useState(false);

  const [manualLocation, setManualLocation] = useState("");
  const [locationMode, setLocationMode] = useState("destination");
  const [activeLocation, setActiveLocation] = useState(null);
  const [activeLocationName, setActiveLocationName] = useState("");

  async function findAttractions(
    category = selectedCategory,
    location = activeLocation || {
      latitude: context.latitude,
      longitude: context.longitude,
    }
  ) {
    setError("");
    setLocationError("");
    setSearched(true);

    if (!API_KEY) {
      setPlaces([]);
      setError("Geoapify API key is missing. Check your .env file.");
      return;
    }

    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);

    if (
      location?.latitude == null ||
      location?.longitude == null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setPlaces([]);
      setError("No valid coordinates are available for this location.");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        categories: CATEGORY_MAP[category] || "tourism.sights",
        filter: `circle:${longitude},${latitude},5000`,
        limit: "20",
        lang: "en",
        apiKey: API_KEY,
      });

      const response = await fetch(
        `https://api.geoapify.com/v2/places?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Geoapify Places request failed: HTTP ${response.status}. Check your API key and usage limits.`
        );
      }

      const data = await response.json();

      const results = (data.features || []).map((feature, index) => {
        const item = feature.properties || {};
        const coordinates = feature.geometry?.coordinates || [];
        const categories = item.categories || [];

        const place = {
          id: item.place_id || `${item.name || "place"}-${index}`,
          name:
            item.name ||
            item.address_line1 ||
            "Unnamed attraction",
          address:
            item.formatted ||
            item.address_line1 ||
            item.address_line2 ||
            "",
          categories,
          latitude: Number(item.lat ?? coordinates[1]),
          longitude: Number(item.lon ?? coordinates[0]),
          website: item.website || "",
        };

        place.category = getPlaceCategory(place);
        return place;
      });

      setPlaces(results);
    } catch (err) {
      setPlaces([]);
      setError(err.message || "Unable to load attractions.");
    } finally {
      setLoading(false);
    }
  }

  function getMyLocation() {
    setLocationError("");
    setError("");

    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support location access."
      );
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setActiveLocation(location);
        setActiveLocationName("Your current location");
        setLocationMode("current");
        setManualLocation("");

        await findAttractions(selectedCategory, location);
      },
      (geoError) => {
        setLoading(false);

        if (geoError.code === 1) {
          setLocationError(
            "Location permission denied. Allow location access in your browser settings."
          );
        } else if (geoError.code === 3) {
          setLocationError(
            "Location request timed out. Try again."
          );
        } else {
          setLocationError(
            "Unable to get your location. Check browser permissions and device location settings."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  async function searchEnteredLocation() {
    const parsed = parseLocationQuery(manualLocation);

    if (!parsed.originalQuery) {
      setLocationError("Enter a city or destination first.");
      return;
    }

    if (parsed.isNearMe) {
      getMyLocation();
      return;
    }

    if (!parsed.location) {
      setLocationError(
        "Enter a destination, for example 'museums in Delhi'."
      );
      return;
    }

    if (!API_KEY) {
      setError("Geoapify API key is missing. Check your .env file.");
      return;
    }

    setError("");
    setLocationError("");
    setLoading(true);

    try {
      const params = new URLSearchParams({
        text: parsed.location,
        format: "json",
        limit: "1",
        apiKey: API_KEY,
      });

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Geoapify Geocoding request failed: HTTP ${response.status}. Check your API key and usage limits.`
        );
      }

      const data = await response.json();
      const result = data.results?.[0];

      if (!result) {
        setPlaces([]);
        setLocationError(
          "Location not found. Try adding a state or country, e.g. Delhi, India."
        );
        return;
      }

      const location = {
        latitude: Number(result.lat),
        longitude: Number(result.lon),
      };

      if (
        !Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude)
      ) {
        throw new Error("The location service returned invalid coordinates.");
      }

      setActiveLocation(location);
      setActiveLocationName(
        result.city ||
          result.name ||
          result.formatted ||
          parsed.location
      );
      setLocationMode("manual");
      setSelectedCategory(parsed.category);

      await findAttractions(parsed.category, location);
    } catch (err) {
      setPlaces([]);
      setError(err.message || "Unable to search this location.");
    } finally {
      setLoading(false);
    }
  }

  function returnToDestination() {
    setActiveLocation(null);
    setActiveLocationName("");
    setLocationMode("destination");
    setManualLocation("");

    const parsed = parseLocationQuery(context.query);
    setSelectedCategory(parsed.category);

    findAttractions(parsed.category, {
      latitude: context.latitude,
      longitude: context.longitude,
    });
  }

  useEffect(() => {
    const parsed = parseLocationQuery(context.query);
    setSelectedCategory(parsed.category);
    setLocationMode("destination");
    setActiveLocation(null);
    setActiveLocationName("");
    setManualLocation("");

    if (
      context.latitude != null &&
      context.longitude != null
    ) {
      findAttractions(parsed.category, {
        latitude: context.latitude,
        longitude: context.longitude,
      });
    } else {
      setPlaces([]);
      setSearched(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.query, context.latitude, context.longitude]);

  useEffect(() => {
    props?.messageHandlers?.componentLoaded?.();
  }, [props?.messageHandlers]);

  function changeCategory(category) {
    setSelectedCategory(category);

    const location = activeLocation || {
      latitude: context.latitude,
      longitude: context.longitude,
    };

    findAttractions(category, location);
  }

  const destinationTitle =
    locationMode === "current"
      ? "Your current location"
      : locationMode === "manual"
        ? activeLocationName || manualLocation
        : context.destination ||
          context.query ||
          "Enter a destination";

  const visiblePlaces = places.filter((place) =>
    matchesCategory(place, selectedCategory)
  );

  return (
    <Box className="tourism-explorer">
      <Box className="tourism-heading">
        <Box className="tourism-icon">✈</Box>

        <Box>
          <Typography variant="h6" className="tourism-title">
            Tourism Explorer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Discover places worth visiting
          </Typography>
        </Box>
      </Box>

      <Box className="destination-panel">
        <Typography variant="subtitle2">
          YOUR DESTINATION
        </Typography>

        <Typography variant="h6" className="destination-name">
          {destinationTitle}
        </Typography>

        {locationMode === "destination" && context.query && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Search: {context.query}
          </Typography>
        )}

        {locationMode === "current" && activeLocation && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Coordinates: {activeLocation.latitude.toFixed(4)},{" "}
            {activeLocation.longitude.toFixed(4)}
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          disabled={loading}
          onClick={() =>
            findAttractions(
              selectedCategory,
              activeLocation || {
                latitude: context.latitude,
                longitude: context.longitude,
              }
            )
          }
          sx={{
            mt: 2,
            py: 1.1,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          {loading ? "Finding attractions..." : "Find nearby attractions"}
        </Button>

        <Button
          variant="outlined"
          fullWidth
          disabled={loading}
          onClick={getMyLocation}
          sx={{
            mt: 1,
            py: 1.1,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Use my location
        </Button>

        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">
            OR ENTER A LOCATION OR QUERY
          </Typography>

          <Box
            component="input"
            type="text"
            value={manualLocation}
            onChange={(event) =>
              setManualLocation(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !loading) {
                searchEnteredLocation();
              }
            }}
            placeholder="e.g. Delhi, museums in Delhi, parks near Gurgaon"
            aria-label="Enter a city or tourism query"
            sx={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #bdbdbd",
              borderRadius: "10px",
              fontSize: "16px",
              fontFamily: "inherit",
              backgroundColor: "transparent",
              color: "inherit",
            }}
          />

          <Button
            variant="outlined"
            fullWidth
            disabled={loading}
            onClick={searchEnteredLocation}
            sx={{
              py: 1.1,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Search location
          </Button>
        </Stack>

        {locationMode !== "destination" && (
          <Button
            fullWidth
            disabled={loading}
            onClick={returnToDestination}
            sx={{
              mt: 0.5,
              textTransform: "none",
            }}
          >
            Return to HyperDart destination
          </Button>
        )}
      </Box>

      {loading && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ my: 3 }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2">
            Searching nearby places...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {locationError && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
          {locationError}
        </Alert>
      )}

      {searched && !loading && !error && places.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No attractions were found nearby. Try another location or category.
        </Alert>
      )}

      {places.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
            Attractions ({visiblePlaces.length})
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 2 }}
          >
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={category === "all" ? "All" : category}
                clickable
                color={
                  selectedCategory === category
                    ? "primary"
                    : "default"
                }
                variant={
                  selectedCategory === category
                    ? "filled"
                    : "outlined"
                }
                onClick={() => changeCategory(category)}
                sx={{ textTransform: "capitalize" }}
              />
            ))}
          </Stack>

          {visiblePlaces.length === 0 ? (
            <Alert severity="info">
              No attractions match this category. Try another filter.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {visiblePlaces.map((place) => (
                <Card
                  key={place.id}
                  variant="outlined"
                  className="attraction-card"
                >
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 750 }}
                    >
                      {place.name}
                    </Typography>

                    <Chip
                      size="small"
                      label={place.category}
                      sx={{
                        mt: 1,
                        mb: 1,
                        textTransform: "capitalize",
                      }}
                    />

                    {place.address && (
                      <Typography variant="body2">
                        {place.address}
                      </Typography>
                    )}

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 1 }}
                      flexWrap="wrap"
                    >
                      {Number.isFinite(place.latitude) &&
                        Number.isFinite(place.longitude) && (
                          <Button
                            size="small"
                            onClick={() =>
                              window.open(
                                `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                            sx={{ textTransform: "none" }}
                          >
                            View on Maps
                          </Button>
                        )}

                      {place.website && (
                        <Button
                          size="small"
                          onClick={() =>
                            window.open(
                              place.website,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          sx={{ textTransform: "none" }}
                        >
                          Website
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      )}

      <Typography variant="caption" className="tourism-footer">
        Place information powered by Geoapify
      </Typography>
    </Box>
  );
}
