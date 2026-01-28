const ACCESS_CODE_KEY = "waterwouten_access_code";
const DEFAULT_CODE = "WATERWOUTEN26";

const BOUNDS = {
  minLat: 52.21466,
  minLng: 4.92528,
  maxLat: 52.25315,
  maxLng: 4.98058,
};

const CENTER = [52.23442, 4.94883];
const START_ZOOM = 13;

let placingMode = false;

function ensureCode() {
  let code = localStorage.getItem(ACCESS_CODE_KEY);
  if (!code) {
    code = prompt("Voer toegangscode in:", DEFAULT_CODE) || "";
    localStorage.setItem(ACCESS_CODE_KEY, code);
  }
  return code;
}

function minutesAgo(ms) {
  return Math.floor((Date.now() - ms) / 60000);
}

const map = L.map("map").setView(CENTER, START_ZOOM);

const bounds = L.latLngBounds(
  [BOUNDS.minLat, BOUNDS.minLng],
  [BOUNDS.maxLat, BOUNDS.maxLng]
);

map.fitBounds(bounds);
map.setMaxBounds(bounds.pad(0.2));

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
}).addTo(map);

const markers = {};

async function loadPins() {
  const res = await fetch("/api/pins", {
    headers: { "x-access-code": ensureCode() },
  });
  const data = await res.json();
  data.pins.forEach(addPin);
}

function addPin(pin) {
  if (markers[pin.id]) return;
  const marker = L.marker([pin.lat, pin.lng]).addTo(map);
  marker.bindPopup(
    `Gezien om ${new Date(pin.created_at).toLocaleTimeString()}<br>
     ${minutesAgo(pin.created_at)} min geleden`
  );
  markers[pin.id] = marker;
}

document.getElementById("pinBtn").onclick = () => {
  placingMode = !placingMode;
};

map.on("click", async (e) => {
  if (!placingMode) return;

  const { lat, lng } = e.latlng;

  await fetch("/api/pins", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-code": ensureCode(),
    },
    body: JSON.stringify({ lat, lng }),
  });

  placingMode = false;
  loadPins();
});

loadPins();
