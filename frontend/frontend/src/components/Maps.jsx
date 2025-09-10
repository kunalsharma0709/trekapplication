import { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./TrekMap.css";

// Custom marker icons
const startIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
});
const endIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149059.png",
  iconSize: [32, 32],
});

export default function TrekMap() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [center, setCenter] = useState([20, 78]); // Default: India
  const [loading, setLoading] = useState(false);
  const [trekInfo, setTrekInfo] = useState(null);

  // Fetch suggestions
  const fetchSuggestions = async (text) => {
    if (!text) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await axios.get(
        `http://localhost:3000/maps/search?q=${encodeURIComponent(text)}`
      );
      setSuggestions(res.data.result || []);
    } catch (err) {
      console.error("Suggestion fetch error:", err);
    }
  };

  // When user clicks a suggestion → fetch trek data
  const handleSelectPlace = async (place) => {
    setQuery(place);
    setSuggestions([]);
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3000/maps/treks/${encodeURIComponent(place)}`);
      setNodes(res.data.nodes || []);
      setTrekInfo(res.data);

      if (res.data.nodes && res.data.nodes.length > 0) {
        setCenter([res.data.nodes[0].latitude, res.data.nodes[0].longitude]);
      }
    } catch (err) {
      console.error("Trek fetch error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="map-wrapper">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search for a place..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            fetchSuggestions(e.target.value);
          }}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((item, idx) => (
              <li key={idx} onClick={() => handleSelectPlace(item.name)}>
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <p className="loading">Loading trek data...</p>}

      <MapContainer center={center} zoom={6} style={{ height: "500px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {nodes.length > 0 && (
          <>
            {/* Polyline for trek path */}
            <Polyline
              positions={nodes.map((n) => [n.latitude, n.longitude])}
              color="green"
            />
            {/* Start point */}
            <Marker position={[nodes[0].latitude, nodes[0].longitude]} icon={startIcon}>
              <Popup>Start Point</Popup>
            </Marker>
            {/* End point */}
            <Marker
              position={[nodes[nodes.length - 1].latitude, nodes[nodes.length - 1].longitude]}
              icon={endIcon}
            >
              <Popup>End Point</Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {trekInfo && (
        <div className="trek-info">
          <h3>{trekInfo.place}</h3>
          <p>Total Distance: {trekInfo.totalDistance_m} meters</p>
          <p>Elevation Gain: {trekInfo.elevationGain_m} m</p>
          <p>Elevation Loss: {trekInfo.elevationLoss_m} m</p>
        </div>
      )}
    </div>
  );
}
