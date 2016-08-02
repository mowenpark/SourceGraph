// set up SVG for D3
var width  = 1500,
    height = 1000,
    colors = d3.scale.category20c();

var svg = d3.select('.directed-graph')
  .append('svg')
  .attr('oncontextmenu', 'return false;')
  .attr('width', width)
  .attr('height', height);

// var drag = d3.behavior.drag()
//     .on("dragstart", dragstarted)
//     .on("drag", dragged)
//     .on("dragend", dragended);

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// set up initial nodes and links using Depth First Search
var nodes = [],
    links = [];

function getNodes(root, count, depth, parent = null) {

  var xmlhttp = new XMLHttpRequest();
  var url = "https://api.github.com/users/" + root + "?access_token=10d740573f1b0205b8bb3ce98e33256387e61304";
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      var node = JSON.parse(xmlhttp.responseText);
      nodes.push(node);
      if (parent != null) {
        links.push({ source: parent, target: node, left: false, right: true });
      }
      getFollowers(node.login, count + 1, depth, node);
    }
  };

  xmlhttp.open("GET", url, true);
  xmlhttp.send();
}

function getFollowers(root, count, depth, parent) {
  if (count == depth) {
    restart();
    return;
  }
  var xmlhttp = new XMLHttpRequest();
  var url = "https://api.github.com/users/" + root + "/followers" + "?access_token=10d740573f1b0205b8bb3ce98e33256387e61304";
  xmlhttp.count = count;
  xmlhttp.depth = depth;
  xmlhttp.parent = parent;
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      var followers = JSON.parse(xmlhttp.responseText);
      followers.forEach(function (follower) {
        getNodes(follower.login, xmlhttp.count, xmlhttp.depth, xmlhttp.parent)
      });
    }
  };

  xmlhttp.open("GET", url, true);
  xmlhttp.send();
}

// init D3 force layout
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-200)
    .on('tick', tick)

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

// handles to link and node element groups
var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g');

// mouse event vars
var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars() {
  mousedown_node = null;
  mouseup_node = null;
  mousedown_link = null;
}

// update force layout (called automatically each iteration)
function tick() {
  // draw directed edges with proper padding from node centers
  path.attr('d', function(d) {
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? 17 : 12,
        targetPadding = d.right ? 17 : 12,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
    return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
  });

  circle.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

// update graph (called when needed)
function restart() {
  // path (link) group
  path = path.data(links);

  // update existing links
  path.classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });


  // add new links
  path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function(d) {
      // select link
      mousedown_link = d;
      if(mousedown_link === selected_link) selected_link = null;
      else selected_link = mousedown_link;
      selected_node = null;
    });

  // remove old links
  path.exit().remove();


  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  circle = circle.data(nodes, function(d) { return d.id; });

  // update existing nodes (reflexive & selected visual states)
  circle.selectAll('circle')
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.company)).brighter().toString() : colors(d.company); });

  // add new nodes
  var g = circle.enter().append('svg:g');
  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', function (d) {
      return (d.login == "mowenpark") ? 40 : 12;
    })
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.company)).brighter().toString() : colors(d.company); })
    .style('stroke', function(d) { return d3.rgb(colors(d.company)).darker().toString(); })
    // .call(drag)
    .on('mouseover', function(d) {
      // enlarge target node
      tooltip.transition()
        .duration(500)
        .style("opacity", .9);
      tooltip.html("login: " + d.login + "<br/>" + "followers: " + d.followers + "<br/>" + "company: " + d.company)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px")
      d3.select(this)
        .transition()
        .duration(500)
        .attr('transform', 'scale(2.25)')
        .transition()
        .ease('elastic')
        .attr('transform', 'scale(2)');
    })
    .on('mouseout', function(d) {
      // unenlarge target node
      d3.select(this)
        .transition()
        .duration(500)
        .attr('transform', '');

      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    })
    .on('mousedown', function(d) {
      // select node
      mousedown_node = d;
      if(mousedown_node === selected_node) selected_node = null;
      else selected_node = mousedown_node;
      selected_link = null;
    });

  // show node IDs
  g.append('svg:text')
      .attr('x', 0)
      .attr('y', 4)
      .attr('class', 'id')
      .text(function(d) { return d.login; });

  // remove old nodes
  circle.exit().remove();

  // set the graph in motion
  force.start();
}

// function dragstarted(d) {
//   d3.event.sourceEvent.stopPropagation();
//   d3.select(this).classed("dragging", true);
// }
//
// function dragged(d) {
//   d.x = d3.event.x;
//   d.y = d3.event.y;
// }
//
// function dragended(d) {
//   d3.select(this).classed("dragging", false);
// }

function searchFollowers(login, key) {
  // getNodes("mowenpark", 0, 3, null);
}

getNodes("mowenpark", 0, 4);
