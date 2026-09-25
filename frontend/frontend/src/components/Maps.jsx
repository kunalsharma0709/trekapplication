import { useState, useEffect } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
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

// ✅ Auto zoom map to bbox
function FitBounds({ bbox }) {
  const map = useMap();
  useEffect(() => {
    if (bbox) {
      const bounds = [
        [bbox.south, bbox.west],
        [bbox.north, bbox.east],
      ];
      map.fitBounds(bounds);
    }
  }, [bbox, map]);
  return null;
}

export default function TrekMap() {
  const [query, setQuery] = useState("");
  const [paths, setPaths] = useState([]);
  const [center, setCenter] = useState([20, 78]);
  const [loading, setLoading] = useState(false);
  const [trekInfo, setTrekInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSelectPlace = async (place) => {
    if (!place) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:3000/maps/treks/${encodeURIComponent(place)}`
      );

      setPaths(res.data.paths || []);
      setTrekInfo(res.data);

      if (res.data.center) {
        setCenter([res.data.center.lat, res.data.center.lon]);
      }
    } catch (err) {
      console.error("Trek fetch error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="trek-container">
      {/* 🔍 Search Box */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Enter trek name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSelectPlace(query);
          }}
        />
        <button onClick={() => handleSelectPlace(query)}>Search</button>
      </div>

      {loading && <p className="loading">Loading trek data...</p>}

      {/* 🗺️ Map Preview Card */}
      <div className="map-card" onClick={() => setShowModal(true)}>
        <MapContainer
          center={center}
          zoom={6}
          style={{ height: "200px", width: "100%", borderRadius: "12px" }}
          dragging={false}
          zoomControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {paths.length > 0 && (
            <>
              {paths.map((path, idx) => (
                <Polyline key={idx} positions={path} color="green" weight={3} />
              ))}
              {trekInfo?.bbox && <FitBounds bbox={trekInfo.bbox} />}
            </>
          )}
        </MapContainer>
        <p className="map-card-label">
          {trekInfo ? trekInfo.place : "Trek Preview"}
        </p>
      </div>

      {/* Trek Info */}
      {trekInfo && (
        <div className="trek-info">
          <h3>{trekInfo.place}</h3>
          <p>Total Segments: {paths.length}</p>
          <p>Total Points: {paths.reduce((sum, p) => sum + p.length, 0)}</p>
        </div>
      )}

      {/* 🔥 Fullscreen Modal */}
      {showModal && (
        <div className="map-modal">
          <div className="modal-content animate-popup">
            <button className="close-btn" onClick={() => setShowModal(false)}>
              ✖
            </button>
            <MapContainer
              center={center}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              {paths.length > 0 && (
                <>
                  {paths.map((path, idx) => (
                    <Polyline key={idx} positions={path} color="green" />
                  ))}

                  <Marker position={paths[0][0]} icon={startIcon}>
                    <Popup>Start Point</Popup>
                  </Marker>

                  <Marker
                    position={paths[paths.length - 1].slice(-1)[0]}
                    icon={endIcon}
                  >
                    <Popup>End Point</Popup>
                  </Marker>

                  {trekInfo?.bbox && <FitBounds bbox={trekInfo.bbox} />}
                </>
              )}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
