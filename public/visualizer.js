// visualizer.js
const chartDiv = document.getElementById('chart');
const width = chartDiv.clientWidth;
const height = Math.max(chartDiv.clientHeight, window.innerHeight * 0.8); // Ensure a minimum height

const svg = d3
  .select('#chart')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .append('g')
  .attr('transform', `translate(${width / 2},${height / 2})`);

const radius = Math.min(width, height) / 2;

const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, 20));

function partition(data) {
  return d3.partition().size([2 * Math.PI, radius])(
    d3
      .hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value),
  );
}

function arc() {
  return d3
    .arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(1 / radius)
    .padRadius(radius / 2)
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y1 - 1);
}

function loadData() {
  d3.json('/data')
    .then(data => {
      // console.log("Received data:", data);
      // document.getElementById('debug').innerHTML += `<p>Received data: ${JSON.stringify(data).slice(0, 100)}...</p>`;
      render(data);
    })
    .catch(error => {
      // console.error("Error loading data:", error);
      // document.getElementById('debug').innerHTML += `<p>Error loading data: ${error}</p>`;
    });
}

function render(data) {
  // console.log("Rendering data:", data);
  // document.getElementById('debug').innerHTML += `<p>Rendering data...</p>`;

  const root = partition(data);

  svg.selectAll('*').remove();

  const g = svg.append('g');

  const path = g
    .append('g')
    .selectAll('path')
    .data(root.descendants().filter(d => d.depth))
    .join('path')
    .attr('fill', d => color(d.data.name))
    .attr('fill-opacity', d => 1 / (d.depth + 1))
    .attr('d', arc());

  path.append('title').text(
    d =>
      `${d
        .ancestors()
        .map(d => d.data.name)
        .reverse()
        .join('/')}\n${d.value}`,
  );
  // Add tooltip functionality
  path.on('mouseover', showTooltip).on('mousemove', moveTooltip).on('mouseout', hideTooltip);
  const label = g
    .append('g')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .style('user-select', 'none')
    .selectAll('text')
    .data(root.descendants().filter(d => d.depth && ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 10))
    .join('text')
    .attr('transform', function (d) {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const y = (d.y0 + d.y1) / 2;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    })
    .attr('dy', '0.35em')
    .text(d => d.data.name)
    .style('font-size', '0.9em');

  g.append('circle')
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .attr('r', radius)
    .on('click', (event, d) => {
      // Placeholder for zoom functionality
      console.log('Clicked center, would reset zoom');
    });

  document.getElementById('debug').innerHTML += `<p>Render complete. Total nodes: ${
    root.descendants().length
  }</p>`;
}

// Tooltip functions
function showTooltip(event, d) {
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);

  tooltip.transition().duration(200).style('opacity', 0.9);

  tooltip
    .html(
      `${d
        .ancestors()
        .map(d => d.data.name)
        .reverse()
        .join(' / ')}<br/>Value: ${d.value}`,
    )
    .style('left', event.pageX + 10 + 'px')
    .style('top', event.pageY - 28 + 'px');
}

function moveTooltip(event) {
  d3.select('.tooltip')
    .style('left', event.pageX + 10 + 'px')
    .style('top', event.pageY - 28 + 'px');
}

function hideTooltip() {
  d3.select('.tooltip').remove();
}

let view;

function zoomTo(v) {
  const k = width / v.x1 / 2;
  view = v;
  const newArc = d3
    .arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(1 / radius)
    .padRadius(radius / 2)
    .innerRadius(d => Math.max(0, d.y0 - v.depth) * k)
    .outerRadius(d => Math.max(0, d.y1 - v.depth) * k - 1);

  svg
    .selectAll('path')
    .transition()
    .duration(750)
    .attrTween('d', d => () => newArc(d));

  svg
    .selectAll('text')
    .transition()
    .duration(750)
    .attr('transform', function (d) {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const y = ((d.y0 + d.y1) / 2 - view.depth) * k;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    })
    .attr('opacity', d => +labelVisible(d));
}

function labelVisible(d) {
  return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
}

// Zoom in and out buttons
const zoomButtons = d3
  .select('#chart')
  .append('div')
  .style('position', 'absolute')
  .style('top', '10px')
  .style('left', '10px');

zoomButtons
  .append('button')
  .text('Zoom In')
  .on('click', () => zoomIn());

zoomButtons
  .append('button')
  .text('Zoom Out')
  .on('click', () => zoomOut());

function zoomIn() {
  const clicked = svg
    .selectAll('path')
    .filter(function (d) {
      const mouse = d3.pointer(event, this);
      return d.x0 <= mouse[0] && mouse[0] <= d.x1 && d.y0 <= mouse[1] && mouse[1] <= d.y1;
    })
    .data()[0];
  if (clicked && clicked.depth < 3) zoomTo(clicked);
}

function zoomOut() {
  if (view.parent) zoomTo(view.parent);
}

loadData();

window.addEventListener('resize', () => {
  const chartDiv = document.getElementById('chart');
  const width = chartDiv.clientWidth;
  const height = Math.max(chartDiv.clientHeight, window.innerHeight * 0.8);
  const newRadius = Math.min(width, height) / 2;

  svg
    .attr('width', width)
    .attr('height', height)
    .attr('transform', `translate(${width / 2},${height / 2})`);

  arc
    .innerRadius(d => d.y0 * (newRadius / radius))
    .outerRadius(d => (d.y1 - 1) * (newRadius / radius));

  loadData();
});
