// WorldMap class for interactive globe visualization
class WorldMap {
    constructor(containerId, data) {
        this.containerId = containerId;
        this.data = data;
        this.container = document.getElementById(containerId);
        
        // Set up dimensions
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = this.container.clientWidth - this.margin.left - this.margin.right;
        this.height = this.container.clientHeight - this.margin.top - this.margin.bottom;
        
        // Define a softer red color palette that's visually comfortable
        this.colors = ["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"];
        
        // Process data by location
        this.processData();
        
        // Initialize visualization
        this.initVis();
    }
    
    processData() {
        // Group universities by location and calculate metrics
        this.locationData = {};
        
        this.data.forEach(d => {
            if (!d.location) return;
            
            if (!this.locationData[d.location]) {
                this.locationData[d.location] = {
                    name: d.location,
                    universities: [],
                    scores_overall: 0,
                    scores_teaching: 0,
                    scores_international_outlook: 0,
                    scores_industry_income: 0,
                    scores_research: 0,
                    scores_citations: 0,
                    count: 0
                };
            }
            
            // Add university to location
            this.locationData[d.location].universities.push(d.name);
            
            // Sum up scores
            this.locationData[d.location].scores_overall += d.scores_overall || 0;
            this.locationData[d.location].scores_teaching += d.scores_teaching || 0;
            this.locationData[d.location].scores_international_outlook += d.scores_international_outlook || 0;
            this.locationData[d.location].scores_industry_income += d.scores_industry_income || 0;
            this.locationData[d.location].scores_research += d.scores_research || 0;
            this.locationData[d.location].scores_citations += d.scores_citations || 0;
            this.locationData[d.location].count++;
        });
        
        // Convert to array for easier processing
        this.locationArray = Object.values(this.locationData);
        
        // Find min and max values for color scale
        this.minScore = d3.min(this.locationArray, d => d.scores_overall);
        this.maxScore = d3.max(this.locationArray, d => d.scores_overall);
        
        // Calculate average score for reference
        this.avgScore = d3.mean(this.locationArray, d => d.scores_overall);
        
        console.log("Processed location data:", this.locationArray);
        console.log("Min score:", this.minScore, "Max score:", this.maxScore, "Avg score:", this.avgScore);
        
        // Create a lookup table for country data
        this.wrangleData();
    }
    
    wrangleData() {
        const vis = this;
        
        // Create a lookup table for country data
        vis.countryInfo = {};
        
        // Create a map for country name lookup
        vis.countryNameMap = {
            "United States of America": "United States",
            "United Kingdom": "United Kingdom",
            "Russian Federation": "Russia",
            "Korea": "South Korea",
            "Democratic Republic of the Congo": "Congo",
            "Republic of the Congo": "Congo",
            "United Republic of Tanzania": "Tanzania",
            "Myanmar": "Myanmar",
            "Viet Nam": "Vietnam",
            "Lao PDR": "Laos",
            "Czech Republic": "Czech Republic",
            "Slovakia": "Slovakia",
            "Bosnia and Herzegovina": "Bosnia and Herzegovina",
            "North Macedonia": "Macedonia",
            "Dominican Republic": "Dominican Republic",
            "Brunei Darussalam": "Brunei",
            "Timor-Leste": "East Timor",
            "Solomon Islands": "Solomon Islands",
            "Cabo Verde": "Cape Verde"
        };
    }

    initVis() {
        const vis = this;
        
        // Modify the page title - make it smaller and move it to the center top
        d3.select("#page4 .main-title")
            .text("Global University Rankings")
            .style("font-size", "36px")  // Smaller font size
            .style("position", "absolute")
            .style("top", "20px")
            .style("left", "50%")
            .style("transform", "translateX(-50%)")
            .style("margin", "0")
            .style("text-align", "center")
            .style("width", "100%");
        
        // Create SVG drawing area
        vis.svg = d3.select("#" + vis.containerId)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);
        
        // Create tooltip
        vis.tooltip = d3.select("#worldmap-tooltip");
        
        // Create a custom power scale to better differentiate between high values
        // Using a square root scale helps to spread out the lower values while still showing differences at the top
        vis.colorScale = d3.scalePow()
            .exponent(0.3) // Using an exponent less than 1 gives more visual space to lower values
            .domain([0, vis.maxScore])
            .range([0, 1]);
        
        // Create a color interpolator that maps the normalized values to colors
        vis.colorInterpolator = d3.scaleQuantize()
            .domain([0, 1])
            .range(vis.colors);
        
        // Create projection
        vis.projection = d3.geoOrthographic()
            .translate([vis.width / 2, vis.height / 2])
            .scale(Math.min(vis.width, vis.height) * 0.4);
        
        // Create path generator
        vis.path = d3.geoPath()
            .projection(vis.projection);
        
        // Create legend first (so it appears behind the globe)
        vis.createLegend();
        
        // Load world map data
        d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
            .then(function(geoData) {
                vis.geoData = geoData;
                
                // Convert TopoJSON to GeoJSON
                vis.world = topojson.feature(vis.geoData, vis.geoData.objects.countries).features;
                
                // Create a group for the entire globe
                vis.globeGroup = vis.svg.append("g")
                    .attr("class", "globe-group");
                
                // Add sphere for the globe (ocean)
                vis.globeGroup.append("path")
                    .datum({type: "Sphere"})
                    .attr("class", "ocean")
                    .attr('fill', '#ADD8E6')  // Light blue for ocean
                    .attr("stroke", "rgba(129,129,129,0.35)")
                    .attr("d", vis.path);
                
                // Add graticule (grid lines)
                const graticule = d3.geoGraticule();
                vis.globeGroup.append("path")
                    .datum(graticule)
                    .attr("class", "graticule")
                    .attr("fill", "none")
                    .attr("stroke", "rgba(129,129,129,0.35)")
                    .attr("stroke-width", 0.5)
                    .attr("d", vis.path);
                
                // Draw countries
                vis.countries = vis.globeGroup.selectAll(".country")
                    .data(vis.world)
                    .enter()
                    .append("path")
                    .attr('class', 'country')
                    .attr("d", vis.path)
                    .attr("fill", d => {
                        // Find matching location in our data
                        const countryName = d.properties.name;
                        let matchedLocation = null;
                        
                        // Try to match with our location data
                        Object.values(vis.locationData).forEach(location => {
                            if (location.name === countryName || 
                                location.name.includes(countryName) || 
                                countryName.includes(location.name) ||
                                (vis.countryNameMap[countryName] && location.name.includes(vis.countryNameMap[countryName]))) {
                                matchedLocation = location;
                            }
                        });
                        
                        if (matchedLocation) {
                            // Apply the power scale to get a normalized value, then map to color
                            const normalizedValue = vis.colorScale(matchedLocation.scores_overall);
                            return vis.colorInterpolator(normalizedValue);
                        } else {
                            return "#f7f4f9"; // Default lightest color
                        }
                    })
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 0.5)
                    .on("mouseover", function(event, d) {
                        // Find matching location in our data
                        const countryName = d.properties.name;
                        let matchedLocation = null;
                        
                        // Try to match with our location data
                        Object.values(vis.locationData).forEach(location => {
                            if (location.name === countryName || 
                                location.name.includes(countryName) || 
                                countryName.includes(location.name) ||
                                (vis.countryNameMap[countryName] && location.name.includes(vis.countryNameMap[countryName]))) {
                                matchedLocation = location;
                            }
                        });
                        
                        // Highlight country
                        d3.select(this)
                            .attr("stroke", "#000")
                            .attr("stroke-width", 1.5);
                        
                        // Show tooltip
                        if (matchedLocation) {
                            // Get normalized value for reference
                            const score = matchedLocation.scores_overall;
                            const normalizedValue = vis.colorScale(score);
                            const percentOfMax = (score / vis.maxScore * 100).toFixed(1);
                            
                            vis.tooltip
                                .style("opacity", 1)
                                .style("left", (event.pageX + 10) + "px")
                                .style("top", (event.pageY + 10) + "px")
                                .html(`
                                    <h3>${matchedLocation.name}</h3>
                                    <p>Universities: ${matchedLocation.universities.length}</p>
                                    <p>Overall Score: ${matchedLocation.scores_overall.toFixed(0)}</p>
                                    <p>Percent of Max: ${percentOfMax}%</p>
                                `);
                        } else {
                            vis.tooltip
                                .style("opacity", 1)
                                .style("left", (event.pageX + 10) + "px")
                                .style("top", (event.pageY + 10) + "px")
                                .html(`
                                    <h3>${countryName}</h3>
                                    <p>No university data available</p>
                                `);
                        }
                    })
                    .on("mouseout", function() {
                        // Reset highlight
                        d3.select(this)
                            .attr("stroke", "#fff")
                            .attr("stroke-width", 0.5);
                        
                        // Hide tooltip
                        vis.tooltip.style("opacity", 0);
                    })
                    .on("click", function(event, d) {
                        // Find matching location in our data
                        const countryName = d.properties.name;
                        let matchedLocation = null;
                        
                        // Try to match with our location data
                        Object.values(vis.locationData).forEach(location => {
                            if (location.name === countryName || 
                                location.name.includes(countryName) || 
                                countryName.includes(location.name) ||
                                (vis.countryNameMap[countryName] && location.name.includes(vis.countryNameMap[countryName]))) {
                                matchedLocation = location;
                            }
                        });
                        
                        if (matchedLocation) {
                            // Log data to console
                            console.log(`Country: ${matchedLocation.name}`);
                            console.log(`Universities: ${matchedLocation.universities.length}`);
                            console.log(`Overall Score: ${matchedLocation.scores_overall}`);
                            console.log(`Teaching Score: ${matchedLocation.scores_teaching}`);
                            console.log(`International Outlook Score: ${matchedLocation.scores_international_outlook}`);
                            console.log(`Industry Income Score: ${matchedLocation.scores_industry_income}`);
                            console.log(`Research Score: ${matchedLocation.scores_research}`);
                            console.log(`Citations Score: ${matchedLocation.scores_citations}`);
                            console.log(`Universities: ${matchedLocation.universities.join(', ')}`);
                        }
                    });
                
                // Make the globe draggable/rotatable
                vis.makeGlobeDraggable();
            })
            .catch(function(error) {
                console.error("Error loading world data:", error);
            });
    }
    
    createLegend() {
        const vis = this;
        
        // Create legend group - Position it at the bottom of the visualization
        vis.legend = vis.svg.append("g")
            .attr('class', 'legend')
            .attr('transform', `translate(${vis.width / 2 - 100}, ${vis.height - 30})`);
        
        // Create sample points for the legend
        const samplePoints = [];
        for (let i = 0; i <= 8; i++) {
            samplePoints.push(vis.maxScore * Math.pow(i/8, 1/0.3));
        }
        
        // Create legend scale with power scale
        const legendScale = d3.scaleLinear()
            .domain([0, vis.maxScore])
            .range([0, 200]);
        
        // Create legend axis with custom tick values
        const legendAxis = d3.axisBottom(legendScale)
            .tickValues([0, Math.round(vis.maxScore * 0.1), Math.round(vis.maxScore * 0.25), 
                         Math.round(vis.maxScore * 0.5), Math.round(vis.maxScore)])
            .tickFormat(d3.format(",d"))
            .tickSize(0);
        
        // Create legend rectangles
        vis.legend.selectAll(".legend-rect")
            .data(vis.colors)
            .enter()
            .append("rect")
            .attr("class", "legend-rect")
            .attr("x", (d, i) => i * (200 / vis.colors.length))
            .attr("width", 200 / vis.colors.length)
            .attr("height", 10)
            .attr("fill", d => d);
        
        // Add legend axis
        vis.legend.append("g")
            .attr("transform", "translate(0, 10)")
            .call(legendAxis)
            .select(".domain").remove();
    }
    
    makeGlobeDraggable() {
        const vis = this;
        
        let m0, o0;
        
        // Apply drag behavior to the entire globe group
        vis.globeGroup.call(
            d3.drag()
                .on("start", function(event) {
                    // Store initial mouse position and projection rotation
                    m0 = [event.x, event.y];
                    let lastRotationParams = vis.projection.rotate();
                    o0 = [-lastRotationParams[0], -lastRotationParams[1]];
                })
                .on("drag", function(event) {
                    if (m0) {
                        let m1 = [event.x, event.y],
                            o1 = [o0[0] + (m0[0] - m1[0]) / 4, o0[1] + (m1[1] - m0[1]) / 4];
                        vis.projection.rotate([-o1[0], -o1[1]]);
                    }
                    
                    // Update all paths with the new projection
                    vis.globeGroup.selectAll("path").attr("d", vis.path);
                })
        );
    }
}

