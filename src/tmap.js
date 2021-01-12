import React, {useRef, useEffect } from 'react';
import logo from './logo.svg';

import { Graph } from "react-d3-graph";
import * as d3 from "d3";
//import { sorted } from "./util";
//import { Rect, flippedRect } from "./rect";
//import calc from "./calc";
import { tracegraph } from "@hownetworks/tracegraph";
import { traceCurve, nodeGradient, genUID } from "@hownetworks/tracegraph";



// graph payload (with minimalist structure)
const data = {
  nodes: [{ id: "Harry" }, { id: "Sally" }, { id: "Alice" }],
  links: [
    { source: "Harry", target: "Sally" },
    { source: "Harry", target: "Alice" },
  ],
};

//const graph = tracegraph();
//graph.horizontal(true);



const tracess = [{hops: [{root: true}, {info: Object, ip: "172.19.0.1", ttl: 1}, {timeout: true, ttl: 2}, {info: Object, ip: "10.68.66.202", ttl: 3}, {info: {name: 'Turkey'}, ip: "138.197.249.36", ttl: 4}, {info: Object, ip: "138.197.250.135", ttl: 5},{info: Object, ip: "195.219.50.41", ttl: 6},
{info: Object, ip: "80.231.65.20", ttl: 7},{info: Object, ip: "5.23.30.16", ttl: 8},{info: Object, ip: "5.23.30.23", ttl: 9},{info: Object, ip: "80.231.6.5", ttl: 10},{info: Object, ip: "217.65.185.115", ttl: 11},{timeout: true, ttl: 12},{timeout: true, ttl: 13},
{info: Object, ip: "46.1.252.113", ttl: 14}]} , {hops: [{root: true}
    ,{info: Object, ip: "172.19.0.1", ttl: 1}
    ,{timeout: true, ttl: 2}
    ,{info: Object, ip: "10.68.66.204", ttl: 3}
    ,{info: Object, ip: "138.197.249.42", ttl: 4}
    ,{info: Object, ip: "138.197.250.149", ttl: 5}
    ,{info: Object, ip: "195.219.50.89", ttl: 6}
    ,{info: Object, ip: "80.231.65.20", ttl: 7}
    ,{info: Object, ip: "5.23.30.16", ttl: 8}
    ,{info: Object, ip: "5.23.30.23", ttl: 9}
    ,{info: Object, ip: "80.231.6.5", ttl: 10}
    ,{info: Object, ip: "217.65.185.115", ttl: 11}
    ,{timeout: true, ttl: 12}
    ,{timeout: true, ttl: 13}
    ,{info: Object, ip: "46.1.252.113", ttl: 14}]}]



//const layout = graph(traces);

//



function Treemap(){
  const ref = useRef();


    const graph = tracegraph()
      .horizontal(true)
      .traceSmoothness(0.5)
      .levelMargin(15)
      .nodeSize(node => {
        return node.hops[0].ip || node.hops[0].root ? [30, 30] : [10, 10];
      })
      .hopDefined(hop => hop.ip || hop.root)
      .hopLevel((hop, index) => index)
      .traceWidth((_, index) => (index === 0 ? 10 : 5.25))
      .nodeId((hop, index) => {
        return hop.ip || (hop.root && "root") || `empty-${index}`;
      });
      const { bounds, traces, nodes } = graph(tracess);
      console.log(nodes);
    const svg = d3.select(ref.current).append("svg");
    const vb = bounds.expanded(1);
    svg
      .attr("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`)
      .attr("width", vb.width)
      .attr("height", vb.height);
    const ids = nodes.map(() => genUID());
    const defs = svg
      .append("defs")
      .selectAll(".gradient")
      .data(nodes.map(nodeGradient));
    const stops = defs
      .enter()
      .append("linearGradient")
      .merge(defs)
      .attr("id", (_, i) => ids[i].id)
      .attr("gradientUnits", d => d.gradientUnits)
      .attr("x1", d => d.x1)
      .attr("y1", d => d.y1)
      .attr("x2", d => d.x2)
      .attr("y2", d => d.y2)
      .selectAll("stop")
      .data(d => d.stops);
    stops
      .enter()
      .append("stop")
      .merge(stops)
      .attr("offset", d => d.offset)
      .attr(
        "stop-color",
        d => d3.schemeSet2[d.traceIndex % d3.schemeSet2.length]
      );
    const traceLayer = svg
      .append("g")
      .attr("fill", "none")
      .selectAll("g")
      .data(traces)
      .enter()
      .append("g");
    traceLayer
      .filter(segment => segment.defined)
      .append("path")
      .attr("d", traceCurve())
      .attr("stroke-width", d => d.width)
      .attr("stroke", "white");
    traceLayer
      .append("path")
      .attr("d", traceCurve())
      .attr("stroke-width", d => d.width - 3)
      .attr(
        "stroke",
        segment => d3.schemeSet2[segment.index % d3.schemeSet2.length]
      )
      .attr("stroke-dasharray", segment => (segment.defined ? "" : "4 2"));
    svg
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("fill", "white")
      .attr("stroke", (_, i) => String(ids[i]))
      .attr("stroke-width", 2)
      .attr("r", ({ bounds }) => Math.min(bounds.width, bounds.height) / 2)
      .attr("cx", ({ bounds }) => bounds.cx)
      .attr("cy", ({ bounds }) => bounds.cy)
      .append("svg:title")
      .text(function(d,i) { return nodes[i].hops[0].ip; });
      



  return (
      <div className="chart">
          <svg ref={ref}>
          </svg>
      </div>
      
  )

}

export default Treemap;