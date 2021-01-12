import React from 'react';
import logo from './logo.svg';
//import './App.css';
import { Graph } from "react-d3-graph";
import * as d3 from "d3";
//import { sorted } from "./util";
//import { Rect, flippedRect } from "./rect";
//import calc from "./calc";
import { tracegraph } from "@hownetworks/tracegraph";
import { traceCurve, nodeGradient, genUID } from "@hownetworks/tracegraph";
import Treemap from './tmap';
import './a.css'



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



//const tracess = [{hops: [{root: true}, {info: Object, ip: "172.19.0.1", ttl: 1}, {timeout: true, ttl: 2}, {info: Object, ip: "10.68.66.202", ttl: 3}, {info: Object, ip: "138.197.249.36", ttl: 4}]}]


//const layout = graph(traces);

//






//









//const aa = traceCurve(layout);

//console.log(layout);
console.log("-----");
//console.log(graph.hopLevel(2));


// the graph configuration, just override the ones you need
const myConfig = {
  nodeHighlightBehavior: true,
  node: {
    color: "lightgreen",
    size: 120,
    highlightStrokeColor: "blue",
  },
  link: {
    highlightColor: "lightblue",
  },
};

const onClickNode = function(nodeId) {
  window.alert(`Clicked node ${nodeId}`);
};

const onClickLink = function(source, target) {
  window.alert(`Clicked link between ${source} and ${target}`);
};





function App() {
  return (
    <div className="App">
      



   <div>
   <Treemap />
   </div>
      
    </div>
  );
}

export default App;



