const canvas = document.getElementById("radarCanvas");
const ctx = canvas.getContext("2d");
const center = { x: canvas.width / 2, y: canvas.height / 2 };
const radius = canvas.width / 2 - 10;

let angle = 0;
let scanning = false;
let ringOffset = 0;
let redRings = []; // store dynamic red pulse rings

function drawRadar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // BLUE MOVING RINGS (normal)
  ctx.strokeStyle = "rgba(54,114,191,0.3)";
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(54,114,191,0.6)";
  const numRings = 4;

  for (let i = 1; i <= numRings; i++) {
    let dynamicRadius = ((radius / numRings) * i + ringOffset) % radius;
    ctx.beginPath();
    ctx.arc(center.x, center.y, dynamicRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // BLUE RADAR SWEEP
  const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
  grad.addColorStop(0, "rgba(54,114,191,0.4)");
  grad.addColorStop(1, "rgba(54,114,191,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.arc(center.x, center.y, radius, angle, angle + 0.3);
  ctx.closePath();
  ctx.fill();
  angle += 0.02;

  //  DYNAMIC RED RINGS
  if (scanning) {
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255,50,50,0.7)";

    redRings.forEach((ring, index) => {
      ctx.strokeStyle = `rgba(255,50,50,${ring.alpha})`;
      ctx.beginPath();
      ctx.arc(center.x, center.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();

      // expand + fade
      ring.radius += 1.5; // controls expansion speed
      ring.alpha -= 0.005; // controls fade rate

      // remove when invisible or outside
      if (ring.radius > radius || ring.alpha <= 0) {
        redRings.splice(index, 1);
      }
    });

    // create new red ring periodically
    if (Math.random() < 0.05) {
      redRings.push({ radius: 0, alpha: 0.5 });
    }
  }

  ringOffset += 0.4;

  //  Center glow
  const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius / 2);
  glow.addColorStop(0, "rgba(54,114,191,0.1)");
  glow.addColorStop(1, "rgba(54,114,191,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius / 2, 0, Math.PI * 2);
  ctx.fill();

  requestAnimationFrame(drawRadar);
}

drawRadar();

canvas.addEventListener("click", async () => {
  if (scanning) return;
  scanning = true;
  redRings = []; // reset pulse rings

  const output = document.getElementById("output");
  output.innerText = "🔍 Scanning nearby devices...";

  try {
    const response = await fetch("http://127.0.0.1:8800/realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const data = await response.json();
    scanning = false;

    if (data.status !== "success") {
      output.innerText = "❌ Error: " + (data.message || "Unknown error");
      return;
    }

    const detections = data.detected || [];
    output.innerHTML = "<h3>📡 Real-Time Scan Results:</h3>";

    if (detections.length === 0) {
      output.innerHTML += "<p>No suspicious devices found.</p>";
    } else {
      detections.forEach((d, i) => {
        const color = d.confidence_score > 70 ? "red" :
                      d.confidence_score > 40 ? "orange" : "green";
        const riskLabel = d.confidence_score > 70 ? "⚠️ High Risk" :
                          d.confidence_score > 40 ? "⚠️ Medium Risk" : "✅ Low Risk";

        output.innerHTML += `
          <div style="margin-bottom:15px; padding:10px; border:1px solid #ccc; border-radius:5px;">
            <strong>Device ${i + 1}</strong><br>
            ${d.name ? `<strong>Name:</strong> ${d.name}<br>` : ""}
            ${d.mac ? `<strong>MAC:</strong> ${d.mac}<br>` : ""}
            ${d.ip ? `<strong>IP:</strong> ${d.ip}<br>` : ""}
            ${d.vendor ? `<strong>Vendor:</strong> ${d.vendor}<br>` : ""}
            ${d.location ? `<strong>Location:</strong> ${d.location}<br>` : ""}
            ${d.rf_strength ? `<strong>RF Strength:</strong> ${d.rf_strength}<br>` : ""}
            ${d.rssi ? `<strong>Bluetooth RSSI:</strong> ${d.rssi}<br>` : ""}
            ${d.frequency ? `<strong>Frequency:</strong> ${d.frequency}<br>` : ""}
            ${d.ir_detected ? `<strong>Infrared Hotspot:</strong> Detected<br>` : ""}
            ${d.lens_detected ? `<strong>Optical Lens Reflection:</strong> Detected<br>` : ""}
            ${d.reflection_intensity ? `<strong>Reflection Intensity:</strong> ${d.reflection_intensity}<br>` : ""}
            <strong style="color:${color}">Confidence Score:</strong> ${d.confidence_score}%<br>
            <strong>${riskLabel}</strong><br>
            <strong>Timestamp:</strong> ${d.timestamp}<br>
          </div>
        `;
      });
    }
  } catch (err) {
    scanning = false;
    output.innerText = "❌ Request failed: " + err.message;
  }
});


// Buttons and output area
const output = document.getElementById("scanOutput");

function displayResults(data, label) {
  output.innerHTML = `<h3>${label} Results:</h3>`;

  if (!data || data.length === 0) {
    output.innerHTML += "<p>No suspicious activity detected.</p>";
    return;
  }

  data.forEach((d, i) => {
    output.innerHTML += `
      <div style="margin-bottom:15px; padding:10px; border:1px solid #ccc; border-radius:5px;">
        <strong>Detection ${i + 1}</strong><br>
        ${d.location ? `<strong>Location:</strong> ${d.location}<br>` : ""}
        ${d.temp ? `<strong>Temperature:</strong> ${d.temp}°C<br>` : ""}
        ${d.rf_strength ? `<strong>RF Strength:</strong> ${d.rf_strength}<br>` : ""}
        ${d.ir_detected ? `<strong>Infrared Hotspot:</strong> Detected<br>` : ""}
        ${d.lens_detected ? `<strong>Optical Lens Reflection:</strong> Detected<br>` : ""}
        ${d.reflection_intensity ? `<strong>Reflection Intensity:</strong> ${d.reflection_intensity}<br>` : ""}
        ${d.confidence_score !== undefined ? `<strong>Confidence Score:</strong> ${d.confidence_score}%<br>` : ""}
        <strong>Timestamp:</strong> ${d.timestamp}<br>
      </div>
    `;
  });
}


// Infrared Scan
document.getElementById("infraredBtn").addEventListener("click", async () => {
  output.innerText = "🔦 Running infrared scan...";
  try {
    const response = await fetch("http://127.0.0.1:8800/infrared", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    displayResults(result.detected, "Infrared Scan");
  } catch (err) {
    output.innerText = "❌ Infrared scan failed: " + err.message;
  }
});

// Optical Scan
document.getElementById("opticalBtn").addEventListener("click", async () => {
  output.innerText = "🔍 Running optical scan...";
  try {
    const response = await fetch("http://127.0.0.1:8800/optical", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    displayResults(result.detected, "Optical Scan");
  } catch (err) {
    output.innerText = "❌ Optical scan failed: " + err.message;
  }
});

// Thermal Scan
document.getElementById("thermalBtn").addEventListener("click", async () => {
  output.innerText = "🌡️ Running thermal scan...";
  try {
    const response = await fetch("http://127.0.0.1:8800/realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    const thermalOnly = result.detected.filter(d => d.temp);
    displayResults(thermalOnly, "Thermal Scan");
  } catch (err) {
    output.innerText = "❌ Thermal scan failed: " + err.message;
  }
});

// Scan output area
const scanOutput = document.getElementById('scanOutput');

function addScanResult(text) {
  const entry = document.createElement('div');
  entry.className = 'scan-entry';
  entry.textContent = text;
  scanOutput.appendChild(entry);
}





