const chartDiv = document.getElementById('chart');
let width = chartDiv.clientWidth;
let height = window.innerHeight - chartDiv.offsetTop - 20; // Subtract some padding

const svg = d3.select('#chart').append('svg').attr('width', width).attr('height', height);

const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

// Set up zoom behavior
const zoom = d3.zoom().on('zoom', event => {
  g.attr('transform', event.transform);
});
svg.call(zoom);

// Create the tree layout
let tree = d3.tree().size([2 * Math.PI, Math.min(width, height) / 2 - 100]);

// Color scale for dependency types
const color = d3
  .scaleOrdinal()
  .domain(['direct', 'dev', 'transitive'])
  .range(['#4CAF50', '#2196F3', '#FFC107']);

// Load and render data
function loadData(showDev = false, depth = 2) {
  d3.json(`/data?showDev=${showDev}&depth=${depth}`).then(data => {
    render(data);
  });
}

function render(data) {
  // Clear previous render
  g.selectAll('*').remove();

  const root = d3.hierarchy(data);
  tree(root);

  // Add the links
  const link = g
    .selectAll('.link')
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr(
      'd',
      d3
        .linkRadial()
        .angle(d => d.x)
        .radius(d => d.y),
    );

  // Add the nodes
  const node = g
    .selectAll('.node')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr(
      'transform',
      d => `
              rotate(${(d.x * 180) / Math.PI - 90})
              translate(${d.y},0)
          `,
    );

  node
    .append('circle')
    .attr('r', 4)
    .style('fill', d => color(d.data.type || 'transitive'))
    .on('mouseover', showTooltip)
    .on('mouseout', hideTooltip);

  node
    .append('text')
    .attr('dy', '0.31em')
    .attr('x', d => (d.x < Math.PI ? 6 : -6))
    .attr('text-anchor', d => (d.x < Math.PI ? 'start' : 'end'))
    .attr('transform', d => (d.x >= Math.PI ? 'rotate(180)' : null))
    .text(d => d.data.name)
    .style('fill-opacity', d => (d.depth > 2 ? 0.5 : 1));
}

// Tooltip functions
function showTooltip(event, d) {
  const tooltip = d3.select('#tooltip');
  tooltip
    .style('display', 'block')
    .html(`<strong>${d.data.name}</strong><br>Type: ${d.data.type || 'transitive'}`)
    .style('left', event.pageX + 10 + 'px')
    .style('top', event.pageY - 10 + 'px');
}

function hideTooltip() {
  d3.select('#tooltip').style('display', 'none');
}

// Event listeners
d3.select('#zoomIn').on('click', () => svg.transition().call(zoom.scaleBy, 1.3));
d3.select('#zoomOut').on('click', () => svg.transition().call(zoom.scaleBy, 1 / 1.3));
d3.select('#resetZoom').on('click', () => svg.transition().call(zoom.transform, d3.zoomIdentity));

d3.select('#devDependencies').on('change', function () {
  loadData(this.checked, +d3.select('#depthControl').property('value'));
});

d3.select('#depthControl').on('change', function () {
  loadData(d3.select('#devDependencies').property('checked'), +this.value);
});

d3.select('#search').on('input', function () {
  const searchTerm = this.value.toLowerCase();
  g.selectAll('.node').style('opacity', d =>
    d.data.name.toLowerCase().includes(searchTerm) ? 1 : 0.1,
  );
});

// Initial render
loadData();

// Resize handler
window.addEventListener('resize', () => {
  width = chartDiv.clientWidth;
  height = window.innerHeight - chartDiv.offsetTop - 20;

  svg.attr('width', width).attr('height', height);

  g.attr('transform', `translate(${width / 2},${height / 2})`);

  tree = d3.tree().size([2 * Math.PI, Math.min(width, height) / 2 - 100]);

  loadData(
    d3.select('#devDependencies').property('checked'),
    +d3.select('#depthControl').property('value'),
  );
});
