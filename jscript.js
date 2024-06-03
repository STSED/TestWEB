// funkce pro prepnuti stranky do tmaveho modu
function toggleInvertColors() {
    document.body.classList.toggle('invert-colors');
    // probehne pri zavolani funkce html kodem, odvolava se na styly pro cast body
    // kde hleda invert colours
    // toggle je prepnout, takze to pujde vzit zpet
}

// zvetseni velikosti textu
function increaseTextSize() {
    document.body.classList.toggle('increase-text-size');
}




document.addEventListener("DOMContentLoaded", function() {
    const map = L.map('mapa').setView([49.8, 15], 8); // nastevni uvodni polohy okna a zoomu

    // Podkladove mapy - OSM a ZM
    const tileLayer1 = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const tileLayer2 = L.tileLayer.wms('https://ags.cuzk.cz/arcgis1/services/ZTM/ZTM10/MapServer/WMSServer?', {
        layers: '0',
        format: 'image/png',
        transparent: true,
        attribution: '&copy; ČÚZK'
    });

    //prepinani mapy

    const buttonControl = L.control({ position: 'bottomleft' });

    buttonControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-control-button');
        div.innerHTML = '<button id="prepnoutMapy">Přepnout mapy</button>';
        return div;
    };

    buttonControl.addTo(map);

    document.getElementById('prepnoutMapy').addEventListener('click', function() {
        if (map.hasLayer(tileLayer1)) {
            map.removeLayer(tileLayer1);
            map.addLayer(tileLayer2);
        } else {
            map.removeLayer(tileLayer2);
            map.addLayer(tileLayer1);
        }
    });


    // VYSECOVY GRAF, ten je definovan puvodne bez dat, data jsou do nej davana az funkci pro aktualizaci
    // definice velikosti
    const width = 150;
    const height = 150;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // legenda grafu
    function updatePieChart(data) {
        const pieData = [
            { label: "Bez vzdělání", value: +data.VZDEL_ZADNE },
            { label: "Nezjištěno", value: +data.VZDEL_NEZJISTENO },
            { label: "Základní", value: +data.VZDEL_ZAKLADNI },
            { label: "Střední", value: +data.VZDEL_STREDNI },
            { label: "Střední s maturitou", value: +data.VZDEL_STR_S_MATUR },
            { label: "Vyšší odborné", value: +data.VZDEL_VOS },
            { label: "Vysokoškolské", value: +data.VZDEL_VYSOKOSK }
        ];

        const paths = svg.selectAll("path")
            .data(pie(pieData));

        paths.enter().append("path")
            .merge(paths)
            .attr("d", arc)
            .attr("fill", d => color(d.data.label))
            .attr("stroke", "white")
            .style("stroke-width", "2px");

        paths.exit().remove();

        const legend = d3.select("#pie-chart-legend");
        legend.selectAll("*").remove();

        pieData.forEach(d => {
            const item = legend.append("div").style("display", "flex").style("align-items", "center");

            item.append("div")
                .style("width", "12px")
                .style("height", "12px")
                .style("background-color", color(d.label))
                .style("margin-right", "5px");

            item.append("div").text(d.label);
        });
    }

    // nacteni csv souboru
    d3.csv("Okresy_CR.csv").then(function(data) {
        const dataById = {};
        data.forEach(d => {
            dataById[d.OBJECTID] = d;
        });
    
        // nacteni polygonu do mapy, polygony jsou v promene ORP, ktera je definovana primo v json souboru
        geojson = L.geoJSON(ORP, {
            style: kartogram,
            onEachFeature: function(feature, layer) {
                layer.on({
                    mouseover: highlightFeature,
                    mouseout: resetHighlight,
                    click: function(e) {
                        const okresData = dataById[feature.properties.OBJECTID];
                        updatePieChart(okresData); //aktualizuje diagram pro vybrany polygon
                    }
                });
            }
        }).addTo(map);

        // nastaveni update piechart na pocatecni hodnotu
        updatePieChart(data[0]);
    });

    function highlightFeature(e) {
        const layer = e.target;

        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });

        layer.bringToFront();

        info.update(layer.feature.properties);
    }

    function resetHighlight(e) {
        geojson.resetStyle(e.target);
        info.update();
    }

    const info = L.control();

    info.onAdd = function(map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };
    //infotabulka v rohu mapy
    info.update = function(props) {
        const contents = props ? `<b>${props.NAZEV}</b><br />${Math.round(props.BEZ_MATURITY * 100)} % lidí bez maturity </sup>` : 'Přejeďte nad OKRES';
        this._div.innerHTML = `<h4> Procentuální podíl lidí bez maturity</h4>${contents}`;
    };

    info.addTo(map);

    //nastaveni rozsahu a barevne palety v mape
    function getColor(d) {
        return d > 0.444411 ? '#023e8a' :
               d > 0.422574 ? '#0077b6' :
               d > 0.396179 ? '#0096c7' :
               d > 0.35939 ? '#00b4d8' :
               d > 0.281319 ? '#48cae4' : '#90e0ef';
    }

    function kartogram(feature) {
        return {
            weight: 5,
            opacity: 1,
            color: '#f72585',
            fillOpacity: 0.7,
            fillColor: getColor(feature.properties.BEZ_MATURITY)
        };
    }

    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [0, 0.281319, 0.35939, 0.396179, 0.422574, 0.444411];
        const labels = [];
        let from, to;

        for (let i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            const fromPercent = Math.round(from * 100);
            const toPercent = to ? Math.round(to * 100) : null;

            labels.push(`<i style="background:${getColor(from + 0.000001)}"></i> ${fromPercent}${toPercent !== null ? `&ndash;${toPercent}` : '+'}%`);
        }

        div.innerHTML = labels.join('<br>');
        return div;
    };

    legend.addTo(map);
});
