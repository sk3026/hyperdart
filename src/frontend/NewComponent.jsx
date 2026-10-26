import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const CATEGORIES = ["all", "museum", "temple", "fort", "park", "monument", "viewpoint"];

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

function firstText(values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function findQueryDeep(value, depth = 0, seen = new Set()) {
  if (depth > 5 || value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") return findQueryDeep(parsed, depth + 1, seen);
    } catch {
      // A plain string may itself be the user query.
    }
    return "";
  }
  if (typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);

  const queryKeys = ["query", "searchQuery", "search_query", "userQuery", "user_query", "prompt", "question", "text", "input", "originalQuery", "original_query"];
  for (const key of queryKeys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    const found = findQueryDeep(child, depth + 1, seen);
    if (found) return found;
  }
  return "";
}

/**
 * HyperDart host props can vary by integration/version. Read common query
 * fields and geo-entities defensively, and log the prop shape without secrets.
 */
function getSearchContext(props) {
  const records = [
    ...getRecords(props?.searchData),
    ...getRecords(props?.searchdata),
    ...getRecords(props?.data),
    ...getRecords(props?.searchDataJson),
    ...getRecords(props?.search_data),
    ...getRecords(props?.message),
    ...getRecords(props?.comp),
    ...getRecords(props?.payload),
    ...getRecords(props?.inputData),
    ...getRecords(props?.search),
  ];

  const query = firstText([
    ...records.map((record) => firstText([
      record?.query,
      record?.searchQuery,
      record?.search_query,
      record?.userQuery,
      record?.prompt,
      record?.question,
      record?.text,
    ])),
    props?.query,
    props?.searchQuery,
    props?.search_query,
    props?.userQuery,
    props?.user_query,
    props?.prompt,
    typeof props?.message === "string" ? props.message : "",
    findQueryDeep(props?.searchData),
    findQueryDeep(props?.searchdata),
    findQueryDeep(props?.data),
    findQueryDeep(props?.searchDataJson),
    findQueryDeep(props?.search_data),
    findQueryDeep(props?.message),
    findQueryDeep(props?.comp),
    findQueryDeep(props?.payload),
    findQueryDeep(props?.inputData),
    findQueryDeep(props?.search),
  ]);

  const record = records.find((item) => item && typeof item === "object" && (
    Array.isArray(item.entities) || Array.isArray(item?.searchData?.entities)
  )) || records.find((item) => typeof item?.query === "string") || {};
  const entities = [
    ...(Array.isArray(record.entities) ? record.entities : []),
    ...(Array.isArray(record?.searchData?.entities) ? record.searchData.entities : []),
    ...records
      .filter((item) => item !== record)
      .flatMap((item) => (Array.isArray(item?.entities) ? item.entities : [])),
    ...getRecords(props?.entities),
  ];

  const locationEntity = entities.find((entity) => {
    const geo = entity?.entityInfo?.geo || entity?.geo || {};
    const rawLat = geo.lat ?? geo.latitude;
    const rawLon = geo.long ?? geo.lon ?? geo.longitude;
    if (rawLat === null || rawLat === undefined || rawLat === "" || rawLon === null || rawLon === undefined || rawLon === "") return false;
    const lat = Number(rawLat);
    const lon = Number(rawLon);
    return Number.isFinite(lat) && Number.isFinite(lon) &&
      lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && !(lat === 0 && lon === 0);
  });

  const geo = locationEntity?.entityInfo?.geo || locationEntity?.geo || {};
  return {
    query,
    destination:
      locationEntity?.entityInfo?.name ||
      locationEntity?.name ||
      locationEntity?.word ||
      locationEntity?.primaryText ||
      "",
    latitude: locationEntity ? Number(geo.lat ?? geo.latitude) : null,
    longitude: locationEntity ? Number(geo.long ?? geo.lon ?? geo.longitude) : null,
  };
}

function parseLocationQuery(input = "") {
  const originalQuery = String(input).trim();
  const isNearMe = /\b(near me|nearby|my location|current location)\b/i.test(originalQuery);

  const categoryRules = [
    { category: "museum", regex: /\bmuseums?\b/i },
    { category: "temple", regex: /\btemples?\b/i },
    { category: "fort", regex: /\bforts?\b/i },
    { category: "park", regex: /\bparks?\b/i },
    { category: "monument", regex: /\bmonuments?\b/i },
    { category: "viewpoint", regex: /\bviewpoints?\b/i },
  ];
  const matched = categoryRules.find(({ regex }) => regex.test(originalQuery));

  const location = originalQuery
    .replace(
      /\b(show|find|search|explore|list|get|recommend|suggest|best|top|famous|popular|tourist|attractions?|places|things|to|do|visit|visiting|sights|landmarks|points|of|interest|museums?|monuments?|temples?|forts?|viewpoints?|parks?|historic(al)?|sites?|in|near|around|me|my|current|location)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "");

  return { originalQuery, category: matched?.category || "all", location, isNearMe };
}

function validCoordinates(latitude, longitude) {
  // Number(null) and Number("") both evaluate to 0; reject missing values first.
  if (
    latitude === null || latitude === undefined || latitude === "" ||
    longitude === null || longitude === undefined || longitude === ""
  ) return false;

  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function getPlaceCategory(place) {
  const categories = (place.categories || []).map((value) => String(value).toLowerCase());
  const text = [place.name, place.address, place.category, ...categories].join(" ").toLowerCase();

  const matchers = {
    museum: (value) => value.includes("museum") || value.includes("gallery"),
    temple: (value) => value.includes("place_of_worship") || value.includes("religion") || value.includes("temple"),
    fort: (value) => value.includes("fort") || value.includes("castle") || value.includes("fortress"),
    park: (value) => value.includes("park") || value.includes("garden"),
    monument: (value) => value.includes("monument") || value.includes("memorial") || value.includes("statue"),
    viewpoint: (value) => value.includes("viewpoint") || value.includes("observation") || value.includes("lookout"),
  };

  for (const category of CATEGORIES.filter((item) => item !== "all")) {
    if (categories.some(matchers[category])) return category;
    if ((CATEGORY_KEYWORDS[category] || []).some((word) => text.includes(word))) return category;
  }

  return categories.find((value) => value.startsWith("tourism."))?.split(".").pop()?.replaceAll("_", " ") || "Attraction";
}

function matchesCategory(place, category) {
  if (category === "all") return true;
  const categories = (place.categories || []).map((value) => String(value).toLowerCase());
  const matchers = {
    museum: (value) => value.includes("museum") || value.includes("gallery"),
    temple: (value) => value.includes("place_of_worship") || value.includes("religion") || value.includes("temple"),
    fort: (value) => value.includes("fort") || value.includes("castle") || value.includes("fortress"),
    park: (value) => value.includes("park") || value.includes("garden"),
    monument: (value) => value.includes("monument") || value.includes("memorial") || value.includes("statue"),
    viewpoint: (value) => value.includes("viewpoint") || value.includes("observation") || value.includes("lookout"),
  };
  if (categories.some(matchers[category] || (() => false))) return true;
  const text = [place.name, place.address, place.category, ...categories].join(" ").toLowerCase();
  return (CATEGORY_KEYWORDS[category] || []).some((word) => text.includes(word));
}

export default function NewComponent(props) {
  const context = useMemo(() => getSearchContext(props), [props]);
  const [places, setPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [searched, setSearched] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [locationMode, setLocationMode] = useState("destination");
  const [activeLocation, setActiveLocation] = useState(null);
  const [activeLocationName, setActiveLocationName] = useState("");
  const requestIdRef = useRef(0);
  const lastAutoSearchKeyRef = useRef("");

  // Diagnostic: inspect props passed by the HyperDart host.
  useEffect(() => {
    console.groupCollapsed("[Tourism Explorer] Component props received");
    console.log("Available prop keys:", Object.keys(props || {}));
    console.log("Detected search context:", context);
    console.log("searchData preview:", props?.searchData);
    console.groupEnd();
  }, [props, context]);

  const geocodeDestination = useCallback(async (destination) => {
    if (!API_KEY) throw new Error("Geoapify API key is missing. Check your local .env configuration.");

    const params = new URLSearchParams({
      text: destination,
      format: "json",
      limit: "1",
      apiKey: API_KEY,
    });
    console.info("[Tourism Explorer] Geocoding destination:", destination);
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params.toString()}`);
    if (!response.ok) throw new Error(`Geoapify Geocoding failed (HTTP ${response.status}).`);

    const data = await response.json();
    const result = data.results?.[0];
    if (!result) throw new Error(`Location "${destination}" was not found. Try adding a state or country.`);

    const location = {
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      name: result.city || result.name || result.formatted || destination,
    };
    if (!validCoordinates(location.latitude, location.longitude)) {
      throw new Error("The geocoding service returned invalid coordinates.");
    }
    console.info("[Tourism Explorer] Geocoding resolved:", {
      destination: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    return location;
  }, []);

  const fetchAttractions = useCallback(async (category, location, requestId) => {
    if (!API_KEY) throw new Error("Geoapify API key is missing. Check your local .env configuration.");
    if (!validCoordinates(location?.latitude, location?.longitude)) {
      throw new Error("No valid coordinates are available for this location.");
    }

    const params = new URLSearchParams({
      categories: CATEGORY_MAP[category] || CATEGORY_MAP.all,
      filter: `circle:${Number(location.longitude)},${Number(location.latitude)},5000`,
      limit: "20",
      lang: "en",
      apiKey: API_KEY,
    });

    console.info("[Tourism Explorer] Requesting places:", {
      category,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      radiusMeters: 5000,
      limit: 20,
    });

    const response = await fetch(`https://api.geoapify.com/v2/places?${params.toString()}`);
    if (!response.ok) throw new Error(`Geoapify Places failed (HTTP ${response.status}). Check API key and usage limits.`);

    const data = await response.json();
    const results = (data.features || []).map((feature, index) => {
      const item = feature.properties || {};
      const coordinates = feature.geometry?.coordinates || [];
      const place = {
        id: item.place_id || `${item.name || "place"}-${index}`,
        name: item.name || item.address_line1 || "Unnamed attraction",
        address: item.formatted || item.address_line1 || item.address_line2 || "",
        categories: item.categories || [],
        latitude: Number(item.lat ?? coordinates[1]),
        longitude: Number(item.lon ?? coordinates[0]),
        website: item.website || "",
      };
      place.category = getPlaceCategory(place);
      return place;
    });

    if (requestId === requestIdRef.current) {
      console.info("[Tourism Explorer] API response summary:", {
        featureCount: data.features?.length || 0,
        displayedRecordCount: results.length,
        category,
      });
      console.debug("[Tourism Explorer] Raw Geoapify response:", data);
      console.table(results.map(({ name, category: placeCategory, address, latitude, longitude }) => ({
        name, category: placeCategory, address, latitude, longitude,
      })));
      console.info("[Tourism Explorer] Processed results:", results);
    }
    return results;
  }, []);

  const runDestinationSearch = useCallback(async (query, options = {}) => {
    const requestId = ++requestIdRef.current;
    const parsed = parseLocationQuery(query);
    const category = options.category || parsed.category || "all";

    setLoading(true);
    setError("");
    setLocationError("");
    setSearched(true);
    setPlaces([]);
    setSelectedCategory(category);
    setLocationMode(options.mode || "destination");
    setActiveLocation(null);
    setActiveLocationName("");

    console.groupCollapsed(`[Tourism Explorer] Search: ${query}`);
    console.info("Incoming query:", query);
    console.info("Parsed query:", parsed);
    console.info("Selected category:", category);

    try {
      let location;
      if (
        validCoordinates(options.latitude, options.longitude) &&
        !(Number(options.latitude) === 0 && Number(options.longitude) === 0)
      ) {
        location = {
          latitude: Number(options.latitude),
          longitude: Number(options.longitude),
          name: options.destination || parsed.location || "HyperDart location",
        };
        console.info("[Tourism Explorer] Using coordinates provided by HyperDart.");
      } else {
        if (!parsed.location) {
          throw new Error("Could not identify a destination. Try 'museums in Delhi' or 'tourist attractions in Paris'.");
        }
        location = await geocodeDestination(parsed.location);
      }

      if (requestId !== requestIdRef.current) return;
      setActiveLocation({ latitude: location.latitude, longitude: location.longitude });
      setActiveLocationName(location.name || parsed.location);

      const results = await fetchAttractions(category, location, requestId);
      if (requestId !== requestIdRef.current) return;

      setPlaces(results);
      if (results.length === 0) {
        setLocationError("No attractions were found for this search. Try another destination or category.");
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setPlaces([]);
      setError(err?.message || "Unable to load attractions.");
      console.error("[Tourism Explorer] Search failed:", err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
      console.groupEnd();
    }
  }, [fetchAttractions, geocodeDestination]);

  const findAttractions = useCallback(async (
    category = selectedCategory,
    location = activeLocation || { latitude: context.latitude, longitude: context.longitude }
  ) => {
    const requestId = ++requestIdRef.current;
    setError("");
    setLocationError("");
    setSearched(true);
    setLoading(true);
    setPlaces([]);

    try {
      const results = await fetchAttractions(category, location, requestId);
      if (requestId !== requestIdRef.current) return;
      setPlaces(results);
      if (!results.length) setLocationError("No attractions were found nearby. Try another location or category.");
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setPlaces([]);
      setError(err?.message || "Unable to load attractions.");
      console.error("[Tourism Explorer] Search failed:", err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [activeLocation, context.latitude, context.longitude, fetchAttractions, selectedCategory]);

  const getMyLocation = useCallback(() => {
    setLocationError("");
    setError("");
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location access.");
      return;
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (requestId !== requestIdRef.current) return;
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          name: "Your current location",
        };
        setActiveLocation(location);
        setActiveLocationName(location.name);
        setLocationMode("current");
        setManualLocation("");
        try {
          const results = await fetchAttractions(selectedCategory, location, requestId);
          if (requestId !== requestIdRef.current) return;
          setPlaces(results);
          setSearched(true);
          if (!results.length) setLocationError("No attractions were found nearby. Try another category.");
        } catch (err) {
          if (requestId !== requestIdRef.current) return;
          setPlaces([]);
          setError(err?.message || "Unable to load attractions.");
          console.error("[Tourism Explorer] Current-location search failed:", err);
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      },
      (geoError) => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
        const message = geoError.code === 1
          ? "Location permission denied. Allow location access in your browser settings."
          : geoError.code === 3
            ? "Location request timed out. Try again."
            : "Unable to get your location. Check browser permissions and device location settings.";
        setLocationError(message);
        console.warn("[Tourism Explorer] Geolocation error:", {
          code: geoError.code,
          message: geoError.message,
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [fetchAttractions, selectedCategory]);

  // Automatically search whenever HyperDart supplies a new query.
  useEffect(() => {
    const query = context.query;
    if (!query) {
      console.debug("[Tourism Explorer] No query found in HyperDart props.", {
        propKeys: Object.keys(props || {}),
      });
      return;
    }

    const key = `${query}|${context.latitude ?? ""}|${context.longitude ?? ""}`;
    if (lastAutoSearchKeyRef.current === key) return;
    lastAutoSearchKeyRef.current = key;

    console.debug("[Tourism Explorer] HyperDart props received:", {
      propKeys: Object.keys(props || {}),
      query: context.query,
      destinationEntity: context.destination,
      latitude: context.latitude,
      longitude: context.longitude,
    });
    runDestinationSearch(query, context);
    // Query/coordinate changes are the intended trigger. `props` is inspected for
    // diagnostics, while context fields determine when a new search is required.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.query, context.latitude, context.longitude]);

  useEffect(() => {
    props?.messageHandlers?.componentLoaded?.();
  }, [props?.messageHandlers]);

  const changeCategory = (category) => {
    setSelectedCategory(category);
    const location = activeLocation || {
      latitude: context.latitude,
      longitude: context.longitude,
    };
    if (validCoordinates(location.latitude, location.longitude)) {
      findAttractions(category, location);
    } else if (context.query) {
      runDestinationSearch(context.query, { ...context, category });
    }
  };

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
    await runDestinationSearch(manualLocation, { mode: "manual" });
    setLocationMode("manual");
  }

  function returnToDestination() {
    setManualLocation("");
    if (context.query) runDestinationSearch(context.query, context);
  }

  const destinationTitle = locationMode === "current"
    ? "Your current location"
    : locationMode === "manual"
      ? activeLocationName || manualLocation
      : activeLocationName || context.destination || context.query || "Waiting for HyperDart search";

  const visiblePlaces = places.filter((place) => matchesCategory(place, selectedCategory));

  return (
    <Box className="tourism-explorer">
      <Box className="tourism-heading">
        <Box className="tourism-icon">✈</Box>
        <Box>
          <Typography variant="h6" className="tourism-title">Tourism Explorer</Typography>
          <Typography variant="body2" color="text.secondary">
            Discover places worth visiting
          </Typography>
        </Box>
      </Box>

      <Box className="destination-panel">
        <Typography variant="subtitle2">YOUR DESTINATION</Typography>
        <Typography variant="h6" className="destination-name">{destinationTitle}</Typography>

        {context.query && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            HyperDart query: {context.query}
          </Typography>
        )}

        {locationMode === "current" && activeLocation && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Coordinates: {activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)}
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          disabled={loading}
          onClick={() => {
            if (context.query) runDestinationSearch(context.query, context);
            else findAttractions(selectedCategory);
          }}
          sx={{ mt: 2, py: 1.1, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
        >
          {loading ? "Finding attractions..." : "Find nearby attractions"}
        </Button>

        <Button
          variant="outlined"
          fullWidth
          disabled={loading}
          onClick={getMyLocation}
          sx={{ mt: 1, py: 1.1, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
        >
          Use my location
        </Button>

        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">OR ENTER A LOCATION OR QUERY</Typography>
          <Box
            component="input"
            type="text"
            value={manualLocation}
            onChange={(event) => setManualLocation(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !loading) searchEnteredLocation();
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
            sx={{ py: 1.1, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
          >
            Search location
          </Button>
        </Stack>

        {locationMode !== "destination" && (
          <Button
            fullWidth
            disabled={loading}
            onClick={returnToDestination}
            sx={{ mt: 0.5, textTransform: "none" }}
          >
            Return to HyperDart destination
          </Button>
        )}
      </Box>

      {loading && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Searching nearby places...</Typography>
        </Stack>
      )}

      {error && <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      {locationError && <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>{locationError}</Alert>}

      {searched && !loading && !error && !locationError && places.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No attractions were found nearby. Try another location or category.
        </Alert>
      )}

      {places.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
            Attractions ({visiblePlaces.length})
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={category === "all" ? "All" : category}
                clickable
                color={selectedCategory === category ? "primary" : "default"}
                variant={selectedCategory === category ? "filled" : "outlined"}
                onClick={() => changeCategory(category)}
                sx={{ textTransform: "capitalize" }}
              />
            ))}
          </Stack>

          {visiblePlaces.length === 0 ? (
            <Alert severity="info">No attractions match this category. Try another filter.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {visiblePlaces.map((place) => (
                <Card key={place.id} variant="outlined" className="attraction-card">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>{place.name}</Typography>
                    <Chip
                      size="small"
                      label={place.category}
                      sx={{ mt: 1, mb: 1, textTransform: "capitalize" }}
                    />
                    {place.address && <Typography variant="body2">{place.address}</Typography>}
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                      {Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && (
                        <Button
                          size="small"
                          onClick={() => window.open(
                            `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
                            "_blank",
                            "noopener,noreferrer"
                          )}
                          sx={{ textTransform: "none" }}
                        >
                          View on Maps
                        </Button>
                      )}
                      {place.website && (
                        <Button
                          size="small"
                          onClick={() => window.open(place.website, "_blank", "noopener,noreferrer")}
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
