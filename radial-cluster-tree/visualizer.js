// visualizer.js
const chartDiv = document.getElementById('chart');
const width = chartDiv.clientWidth;
const height = Math.max(chartDiv.clientHeight, window.innerHeight * 0.8);

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

const arcGenerator = d3
  .arc()
  .startAngle(d => d.x0)
  .endAngle(d => d.x1)
  .padAngle(1 / radius)
  .padRadius(radius / 2)
  .innerRadius(d => d.y0)
  .outerRadius(d => d.y1 - 1);

function loadData() {
  d3.json('/data')
    .then(data => {
      console.log('Data loaded:', data);
      render(data);
    })
    .catch(error => {
      console.error('Error loading data:', error);
    });
}

// Create a tooltip div
const tooltip = d3
  .select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0)
  .style('position', 'absolute')
  .style('background-color', 'white')
  .style('border', 'solid')
  .style('border-width', '1px')
  .style('border-radius', '5px')
  .style('padding', '10px');

function render(data) {
  console.log('Rendering data:', data);

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
    .attr('d', arcGenerator);

  console.log('Number of path elements:', path.size());

  path.each(function (d) {
    d3.select(this)
      .on('mouseover', function (event) {
        console.log('Mouseover event triggered', d);
        d3.select(this).attr('fill-opacity', 1);
        tooltip.transition().duration(200).style('opacity', 0.9);
        tooltip
          .html(
            `${d
              .ancestors()
              .map(d => d.data.name)
              .reverse()
              .join(' / ')}<br/>Value: ${d.value}`,
          )
          .style('left', event.pageX + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mousemove', function (event) {
        tooltip.style('left', event.pageX + 'px').style('top', event.pageY - 28 + 'px');
      })
      .on('mouseout', function () {
        console.log('Mouseout event triggered');
        d3.select(this).attr('fill-opacity', 1 / (d.depth + 1));
        tooltip.transition().duration(500).style('opacity', 0);
      });
  });

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
    .on('click', () => {
      console.log('Clicked center');
    });

  console.log('Render complete. Total nodes:', root.descendants().length);
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

  arcGenerator
    .innerRadius(d => d.y0 * (newRadius / radius))
    .outerRadius(d => (d.y1 - 1) * (newRadius / radius));

  loadData();
});
