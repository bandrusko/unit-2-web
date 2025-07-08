let map;
let geoJsonLayer;
let jsonData;

//Uploads the tilelayer for the map and adjusts the scale in which the map is displayed.
function createMap() {
  map = L.map('mapid').setView([33.220391788294395, -87.18503075340283], 4.5);
  L.tileLayer('https://tile.jawg.io/098b7cac-e237-43c9-be64-6c57c7a8b7b6/{z}/{x}/{y}{r}.png?access-token=u45wMoF3kHbpkQ2FWaBw45sY8X2FKi9O1AmCvSYfaxyQLTCeHDqv8eubPN4OrmWw').addTo(map);
  map.attributionControl.addAttribution('<a href="https://www.jawg.io?utm_medium=map&utm_source=attribution" target="_blank">&copy; Jawg</a> - <a href="https://www.openstreetmap.org?utm_medium=map-attribution&utm_source=jawg" target="_blank">&copy; OpenStreetMap</a>&nbsp;contributors');

  fetchData();
}

//Fetches the data from the data folder.
function fetchData() {
  fetch("data/Fatal_Data.geojson")
    .then(response => {
      return response.json();
    })
    .then(data => {
      jsonData = data;
      var years = getYearsFromData(jsonData);

      createPropSymbols(years[0]);
      createSequenceControls(years);
      createLegend();
    });
}

//Gathers the years from the geojson data.
function getYearsFromData(data) {
  var properties = data.features[0].properties;
  return Object.keys(properties).filter(key => key.length === 4 && !isNaN(key));
}

//Formula that calculates and adjusts the shape of the dots depending on the value.
function calculateRadius(value) {
  var minRadius = 1;
  var scaleFactor = 1.3;
  var exponent = 0.625;
  //Uses 1 to prevent division of 0 (if it applies).
  var minValue = Math.min(...jsonData.features.map(f => Math.abs(f.properties.Ovr_Chag)).filter(v => v > 0)) || 1;
  return scaleFactor * Math.pow(Math.abs(value) / minValue, exponent) * minRadius;
}

//Creates proportional symbols that change throughout the map.
function createPropSymbols(selectedYear) {
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
  }

  //Creates user inputs to query out number of fatalities.
  var minInput = document.getElementById("min-fatal");
  var maxInput = document.getElementById("max-fatal");

  var minFatal = minInput ? parseInt(minInput.value) : 0;
  var maxFatal = maxInput ? parseInt(maxInput.value) : Infinity;

  //Basis for the data visualization through the map.
  geoJsonLayer = L.geoJson(jsonData, {
    filter: feature => {
      var value = feature.properties[selectedYear];
      return value !== undefined && value >= minFatal && value <= maxFatal;
    },
    pointToLayer: (feature, latlng) => {
      var value = Number(feature.properties[selectedYear]);
      var radius = calculateRadius(value);
      var fillColor = value > 0 ? "#ff0000" : "#0080f8";

      var markerOptions = {
        radius: radius,
        fillColor: fillColor,
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      };
      return L.circleMarker(latlng, markerOptions);
    },
    onEachFeature: (feature, layer) => {
      var props = feature.properties;
      var popupContent = `
        <b>State:</b> ${props.State}<br>
        <b>Fatalities in ${selectedYear}:</b> ${props[selectedYear]}<br>
        <b>Population in ${selectedYear}:</b> ${props[`Pop_${selectedYear}`]}<br>
        <b>Rate of accident in ${selectedYear} (per 100k people):</b> ${props[`Rate_${selectedYear}`]}
      `;
      layer.bindPopup(popupContent);
    }
  }).addTo(map);
}

//Creates a legend showing the unit of measurement shown on the map.
function createLegend() {
  var LegendControl = L.Control.extend({
    options: {
      position: 'bottomright'
    },
    onAdd: function () {
      var container = L.DomUtil.create('div', 'legend-control-container');
      container.innerHTML = '<h4>Accident Data Legend</h4><h5>Number of fatalities from cars</h5><img src="img/R.png" style="width: 40px; height: 40px">';
      return container;
    }
  });
  map.addControl(new LegendControl());
}

//Sequence controls that allows the user to slide and click on the buttons to navigate through the map. Uses the years to scroll through the data.
function createSequenceControls(years) {
  var panel = document.querySelector("#panel");
  if (!panel) return;

  panel.innerHTML = `
      <label for="year-slider">Year: <span id="year-label">${years[0]}</span></label>
      <input class='range-slider' id="year-slider" type='range' min="0" max="${years.length - 1}" value="0" step="1">
      <button class="step" id="reverse"><img src="img/turnleft.png"></button>
      <button class="step" id="forward"><img src="img/turnright.png"></button>

      <div style="margin-top:10px;">
        <h6>Insert values below to filter fatality data on the map:</h6>
        <label>Minimum Fatalities: <input type="number" id="min-fatal" value="111" /></label><br>
        <label>Maximum Fatalities: <input type="number" id="max-fatal" value="4500" /></label>
      </div>
    `;

  var slider = panel.querySelector(".range-slider");
  var yearLabel = panel.querySelector("#year-label");

  var updateMapForYear = (index) => {
    var selectedYear = years[index];
    yearLabel.textContent = selectedYear;
    slider.value = index;
    createPropSymbols(selectedYear);
  };

  slider.addEventListener("input", (event) => updateMapForYear(parseInt(event.target.value)));

  //Button to move forward.
  panel.querySelector("#forward").addEventListener("click", () => {
    let index = (parseInt(slider.value) + 1) % years.length;
    updateMapForYear(index);
  });

  //Button to go back on the map.
  panel.querySelector("#reverse").addEventListener("click", () => {
    let index = (parseInt(slider.value) - 1 + years.length) % years.length;
    updateMapForYear(index);
  });
}

//Starts the application once everything is loaded.
document.addEventListener('DOMContentLoaded', createMap);