        mapboxgl.accessToken = 'pk.eyJ1IjoibWlsYWJvIiwiYSI6ImNsbnFjbG9xZTB0MmIya3B0eDFwNDEwY3gifQ.9SzpYF3dZCwahgWShbsRiQ';

        const map = new mapboxgl.Map({
                container: 'map', // container ID
                style: 'mapbox://styles/mapbox/light-v10', // style URL
                zoom: 8, // starting zoom
                center: [-121.75, 47.5] // starting center
            }
        );


        async function geojsonFetch() {
          const storeData = await fetch("assets/Food_Facilites_-_Multiple_Classes_-_For_King_County___food_facilities_point.geojson")
              .then(res => res.json());

          map.addSource("stores", {
              type: "geojson",
              data: storeData
          });

          map.addLayer({
              id: "store-points",
              type: "circle",
              source: "stores",
              paint: {
                  "circle-radius": 6,
                  "circle-color": "#007cbf",
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 1
              }
          });
          map.addLayer({
              id: "closest-store",
              type: "circle",
              source: "stores",
              paint: {
                  "circle-radius": 10,
                  "circle-color": "#ff0000",
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 2
              },
              filter: ["==", "OBJECTID", -1]
          });
          // Add Mapbox Geocoder search bar
          const geocoder = new MapboxGeocoder({
              accessToken: mapboxgl.accessToken,
              mapboxgl: mapboxgl,
              marker: false
          });

          map.addControl(geocoder);
          let searchMarker;
          geocoder.on("result", (e) => {
          const searchCoords = e.result.geometry.coordinates;

          // Drop search marker
          if (searchMarker) searchMarker.remove();
          searchMarker = new mapboxgl.Marker({ color: "red" })
              .setLngLat(searchCoords)
              .addTo(map);

          // Find nearest store using Turf.js
          const nearest = turf.nearestPoint(searchCoords, storeData);

          // Build a line from search point → nearest store
            const line = {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [
                        searchCoords,
                        nearest.geometry.coordinates
                    ]
                }
            };

            // Update the GeoJSON line source
            map.getSource("nearest-line").setData(line);


          // Highlight it by filtering the "closest-store" layer
          map.setFilter("closest-store", [
              "==",
              "OBJECTID",
              nearest.properties.OBJECTID
          ]);

          // Popup at the nearest store
          new mapboxgl.Popup()
              .setLngLat(nearest.geometry.coordinates)
              .setHTML(`
                  <strong>${nearest.properties.NAME}</strong><br>
                  ${nearest.properties.ADDRESS || ""}
              `)
              .addTo(map);

          // Fly to show both search point & store
          map.flyTo({
              center: nearest.geometry.coordinates,
              zoom: 14
          });
        });

          // When user selects a result
          geocoder.on('result', (e) => {
              const coords = e.result.geometry.coordinates;

              // Remove old marker
              if (searchMarker) {
                  searchMarker.remove();
              }

              // Add new marker at searched location
              searchMarker = new mapboxgl.Marker({ color: "red" })
                  .setLngLat(coords)
                  .addTo(map);

              // Optionally zoom to the location
              map.flyTo({ center: coords, zoom: 14 });
          });

            let response = await fetch("assets/Master_DS.geojson");
            let countyData = await response.json();
            map.on('load', function loadingData() {
                map.addSource('countyData', {
                    type: 'geojson',
                    data: countyData
                });

                map.addLayer({
                    id: "county-outline",
                    type: "line",
                    source: "countyData",
                    paint: {
                        "line-color": "#000000",
                        "line-width": 2
                    }
                });
                map.on("click", "store-points", (e) => {
                    const props = e.features[0].properties;
                    new mapboxgl.Popup()
                        .setLngLat(e.features[0].geometry.coordinates)
                        .setHTML(`
                            <strong>${props.NAME || "Store"}</strong><br>
                            ${props.ADDRESS || ""}
                        `)
                        .addTo(map);
                });
                map.addSource("nearest-line", {
                    type: "geojson",
                    data: {
                        type: "Feature",
                        geometry: {
                            type: "LineString",
                            coordinates: []
                        }
                    }
                });

                map.addLayer({
                    id: "nearest-line-layer",
                    type: "line",
                    source: "nearest-line",
                    paint: {
                        "line-color": "#ff0000",
                        "line-width": 3
                    }
                });


            });
        }

        geojsonFetch();