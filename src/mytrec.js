import { sorted } from "./util";
import { Rect, flippedRect } from "./rect";
import calc from "./calc";

export function traceCurve() {
  return function({ points, horizontal, smoothness }) {
    return points
      .map(([x1, y1], index) => {
        if (index === 0) {
          return `M ${x1} ${y1}`;
        }
        const [x0, y0] = points[index - 1];
        const dx = smoothness * (horizontal ? x1 - x0 : 0);
        const dy = smoothness * (horizontal ? 0 : y1 - y0);
        return `C ${x0 + dx} ${y0 + dy},  ${x1 - dx} ${y1 - dy}, ${x1} ${y1}`;
      })
      .join(" ");
  };
}

export function nodeGradient(node) {
  const { horizontal, traceStops } = node;

  const start = Math.min(...traceStops.map(s => s.start));
  const end = Math.max(...traceStops.map(s => s.end));

  const stops = [];
  traceStops.forEach(s => {
    stops.push(
      {
        traceIndex: s.traceIndex,
        offset: (s.start - start) / (end - start)
      },
      {
        traceIndex: s.traceIndex,
        offset: (s.end - start) / (end - start)
      }
    );
  });

  return {
    gradientUnits: "userSpaceOnUse",
    x1: horizontal ? 0 : start,
    y1: horizontal ? start : 0,
    x2: horizontal ? 0 : end,
    y2: horizontal ? end : 0,
    stops: sorted(stops, "offset")
  };
}

export function genUID() {
  const base = window.location.href.replace(/#.*/, "");

  for (;;) {
    const id = `uid-${Math.random()}`;
    if (!document.getElementById(id)) {
      const attr = `url(${base}#${id})`;
      return {
        id,
        toString() {
          return attr;
        }
      };
    }
  }
}

function verticalGraph(origTraces, options) {
  const horizontal = Boolean(options.horizontal());
  const levelMargin = options.levelMargin();
  const traceSmoothness = options.traceSmoothness();
  const traceWidths = origTraces.map((trace, index) => {
    return options.traceWidth(trace, index, origTraces);
  });

  const { traces, levels } = calc(origTraces, options);

  const nodeMetrics = new Map();
  levels.forEach(nodes => {
    nodes.forEach(node => {
      const nm = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        traceWidth: node.hops.reduce(
          (total, hop) => total + traceWidths[hop.traceIndex],
          0
        )
      };
      if (!node.virtual) {
        const [width, height] = options.nodeSize({
          hops: node.hops.map(hop => hop.origHop),
          horizontal: Boolean(horizontal)
        });
        nm.width = width;
        nm.height = height;
      }
      nm.width = Math.max(nm.width, nm.traceWidth);
      nodeMetrics.set(node, nm);
    });
  });

  let maxNodeWidth = 0;
  nodeMetrics.forEach(nm => {
    maxNodeWidth = Math.max(nm.width, maxNodeWidth);
  });
  const sortedTraceWidths = sorted(traceWidths);
  levels.forEach(nodes => {
    let width = maxNodeWidth;
    if (nodes.length >= 2) {
      const leeway = sortedTraceWidths
        .slice(nodes.length - 1)
        .reduce((acc, cur) => acc + cur, 0);
      width = (maxNodeWidth + leeway) / 2;
    }
    nodes.forEach((node, index) => {
      nodeMetrics.get(node).x += (index - (nodes.length - 1) / 2) * width;
    });

    let overlaps = 0;
    let maxOverlaps = 0;
    nodes.forEach(node => {
      if (node.virtual) {
        overlaps = 0;
      } else {
        overlaps += 1;
        maxOverlaps = Math.max(overlaps, maxOverlaps);
      }
    });
    nodes.forEach((node, index) => {
      let y = 0;
      if (maxOverlaps >= 2 && index % 2 === 0) {
        const left = index === 0 ? 0 : nodeMetrics.get(nodes[index - 1]).height;
        const right =
          index === nodes.length - 1
            ? 0
            : nodeMetrics.get(nodes[index + 1]).height;
        y += Math.max(left, right);
      }
      nodeMetrics.get(node).y = y;
    });
  });

  const hopMetrics = new Map();
  levels.forEach(nodes => {
    nodes.forEach(node => {
      const nm = nodeMetrics.get(node);

      let traceOffset = 0;
      node.hops.forEach(hop => {
        const traceWidth = traceWidths[hop.traceIndex];
        hopMetrics.set(hop, {
          traceWidth,
          traceOffset,
          x: nm.x + traceOffset + traceWidth / 2 - nm.traceWidth / 2,
          top: 0,
          bottom: 0
        });
        traceOffset += traceWidth;
      });
    });
  });

  traces.forEach(trace => {
    const hops = trace.hops;
    for (let i = 1; i < hops.length; i++) {
      const leftHop = hops[i - 1];
      const left = hopMetrics.get(leftHop);
      const right = hopMetrics.get(hops[i]);
      const lnm = nodeMetrics.get(leftHop.node);

      const dy = (3 / 2) * (1 - traceSmoothness) * (2 * levelMargin);
      const dx = (3 / 2) * (right.x - left.x);
      const normalLen = Math.sqrt(dx * dx + dy * dy);

      let nudge = 0;
      if (normalLen > 0) {
        // Correction
        const xfix = 1 - dy / normalLen;
        const slope = dx !== 0 ? dy / dx : 0;
        const offset = dx / normalLen - slope * xfix;

        if (dx > 0) {
          nudge =
            (lnm.traceWidth - left.traceOffset - left.traceWidth) * offset;
        } else {
          nudge = -left.traceOffset * offset;
        }
      }
      left.bottom = nudge;
      right.top = nudge;
    }
  });

  const levelMetrics = new Map();
  let totalHeight = 0;
  levels.forEach((nodes, level) => {
    let top = 0;
    nodes.forEach(node => {
      node.hops.forEach(hop => {
        const hm = hopMetrics.get(hop);
        top = Math.max(hm.top, top);
      });
    });

    let height = 0;
    nodes.forEach(node => {
      const nm = nodeMetrics.get(node);
      height = Math.max(height, nm.height + nm.y);
    });

    levelMetrics.set(level, {
      top,
      height,
      y: totalHeight
    });
    totalHeight += height + top + 2 * levelMargin;
  });

  const result = {
    nodes: [],
    traces: [],
    bounds: null
  };

  traces.forEach((trace, traceIndex) => {
    const sections = [];

    const hops = trace.hops;
    hops.forEach((hop, index) => {
      if (hop.virtual) {
        return;
      }

      let cut = index - 1;
      while (cut >= 0 && hops[cut].virtual) {
        cut--;
      }
      if (cut >= 0) {
        sections.push({
          hops: hops.slice(cut, index + 1),
          defined: hops[cut].defined && hop.defined
        });
      }
    });

    const joinedSections = sections.splice(0, 1);
    sections.forEach(section => {
      const joined = joinedSections[joinedSections.length - 1];
      if (Boolean(section.defined) === Boolean(joined.defined)) {
        joined.hops.push(...section.hops.slice(1));
      } else {
        joinedSections.push(section);
      }
    });

    const pointSections = joinedSections.map(({ hops, defined }) => {
      const points = [];
      hops.forEach((right, index) => {
        const rhm = hopMetrics.get(right);
        const rnm = nodeMetrics.get(right.node);
        const rlm = levelMetrics.get(right.level);
        if (index === 0) {
          points.push([rhm.x, rlm.y + rlm.top + rnm.y + rnm.height / 2]);
          return;
        }

        const lhm = hopMetrics.get(hops[index - 1]);
        const llm = levelMetrics.get(hops[index - 1].level);
        const y = llm.y + llm.top + llm.height + lhm.bottom;
        points.push([lhm.x, y]);
        points.push([rhm.x, y + 2 * levelMargin]);

        if (index === hops.length - 1) {
          points.push([rhm.x, rlm.y + rlm.top + rnm.y + rnm.height / 2]);
        }
      });
      return { points, defined };
    });

    pointSections.forEach(section => {
      result.traces.push({
        index: traceIndex,
        width: traceWidths[traceIndex],
        hops: trace.hops.map(hop => hop.origHop),
        defined: section.defined,
        points: section.points,
        smoothness: traceSmoothness,
        horizontal: horizontal
      });
    });
  });

  let left = levels.length === 0 ? 0 : Infinity;
  let right = levels.length === 0 ? 0 : -Infinity;
  let top = levels.length === 0 ? 0 : Infinity;
  let bottom = levels.length === 0 ? 0 : -Infinity;
  levels.forEach(nodes => {
    nodes.forEach(node => {
      const nm = nodeMetrics.get(node);
      const lm = levelMetrics.get(node.level);
      const x0 = nm.x - nm.width / 2;
      const x1 = nm.x + nm.width / 2;
      const y0 = lm.y + lm.top + nm.y;
      const y1 = y0 + nm.height;

      left = Math.min(x0, left);
      right = Math.max(x1, right);
      top = Math.min(y0, top);
      bottom = Math.max(y1, bottom);
      if (node.virtual) {
        return;
      }

      let offset = (x0 + x1) / 2 - nm.traceWidth / 2;
      const traceStops = node.hops.map(hop => {
        const start = offset;
        offset += traceWidths[hop.traceIndex];
        return {
          start,
          end: offset,
          traceIndex: hop.traceIndex
        };
      });
      result.nodes.push({
        bounds: new Rect(x0, y0, x1, y1),
        horizontal,
        hops: node.hops.map(hop => hop.origHop),
        traceIndexes: node.hops.map(hop => hop.traceIndex),
        traceStops
      });
    });
  });

  result.bounds = new Rect(left, top, right, bottom);
  return result;
}

export function tracegraph() {
  const values = {
    horizontal: false,
    traceWidth: () => 1,
    traceSmoothness: 0.5,
    levelMargin: 10,
    hopLevel: (hop, index) => index,
    hopDefined: () => true,
    nodeSize: () => [10, 10],
    nodeId: (hop, hopIndex, trace, traceIndex) => `${traceIndex}-${hopIndex}`
  };

  function graph(traces) {
    const horizontal = options.horizontal();
    if (horizontal) {
      const nodeSize = options.nodeSize;
      options.nodeSize = (...args) => {
        const [w, h] = nodeSize(...args);
        return [h, w];
      };
    }

    const result = verticalGraph(traces, options);
    if (!horizontal) {
      return result;
    }
    return {
      bounds: flippedRect(result.bounds),
      traces: result.traces.map(trace => ({
        ...trace,
        points: trace.points.map(([x, y]) => [y, x])
      })),
      nodes: result.nodes.map(node => ({
        ...node,
        bounds: flippedRect(node.bounds)
      }))
    };
  }

  const options = {};
  Object.keys(values).forEach(key => {
    graph[key] = function(value) {
      if (arguments.length === 0) {
        return values[key];
      }
      values[key] = value;
      options[key] = typeof value === "function" ? value : () => value;
      return graph;
    };
    graph[key](values[key]);
  });
  return graph;
}