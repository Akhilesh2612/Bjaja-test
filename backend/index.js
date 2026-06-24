const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];
  
  const fullName = process.env.FULL_NAME || "john_doe";
  const dob = process.env.DOB || "17091999";
  const formattedName = fullName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const user_id = `${formattedName}_${dob}`;
  const email_id = process.env.EMAIL_ID || "john.doe@college.edu";
  const college_roll_number = process.env.COLLEGE_ROLL_NUMBER || "21CS1001";

  const invalid_entries = [];
  const duplicate_edges = [];
  
  const seenEdges = new Set();
  const duplicateSeen = new Set();
  const uniqueValidEdges = [];

  for (const item of data) {
    if (typeof item !== "string") {
      invalid_entries.push(item);
      continue;
    }

    const trimmed = item.trim();
    const match = trimmed.match(/^([A-Z])->([A-Z])$/);

    if (!match || match[1] === match[2]) {
      invalid_entries.push(item);
      continue;
    }

    const parent = match[1];
    const child = match[2];
    const edgeStr = `${parent}->${child}`;

    if (seenEdges.has(edgeStr)) {
      if (!duplicateSeen.has(edgeStr)) {
        duplicateSeen.add(edgeStr);
        duplicate_edges.push(edgeStr);
      }
    } else {
      seenEdges.add(edgeStr);
      uniqueValidEdges.push({ parent, child, original: item });
    }
  }

  const parentOf = new Map();
  const childrenOf = new Map();
  const nodes = new Set();

  for (const edge of uniqueValidEdges) {
    const { parent, child } = edge;
    if (parentOf.has(child)) {
      continue;
    }
    parentOf.set(child, parent);
    if (!childrenOf.has(parent)) {
      childrenOf.set(parent, []);
    }
    childrenOf.get(parent).push(child);
    nodes.add(parent);
    nodes.add(child);
  }

  const adj = new Map();
  for (const node of nodes) {
    adj.set(node, []);
  }
  for (const [child, parent] of parentOf.entries()) {
    adj.get(child).push(parent);
    adj.get(parent).push(child);
  }

  const visited = new Set();
  const components = [];

  for (const node of nodes) {
    if (!visited.has(node)) {
      const comp = [];
      const queue = [node];
      visited.add(node);
      while (queue.length > 0) {
        const curr = queue.shift();
        comp.push(curr);
        const neighbors = adj.get(curr) || [];
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
      components.push(comp);
    }
  }

  const nodeFirstIndex = new Map();
  uniqueValidEdges.forEach((edge, index) => {
    if (!nodeFirstIndex.has(edge.parent)) {
      nodeFirstIndex.set(edge.parent, index);
    }
    if (!nodeFirstIndex.has(edge.child)) {
      nodeFirstIndex.set(edge.child, index);
    }
  });

  function buildTree(node) {
    const res = {};
    const children = childrenOf.get(node) || [];
    const sortedChildren = [...children].sort();
    for (const c of sortedChildren) {
      res[c] = buildTree(c);
    }
    return res;
  }

  function getDepth(node) {
    const children = childrenOf.get(node) || [];
    if (children.length === 0) {
      return 1;
    }
    let maxDepth = 0;
    for (const c of children) {
      maxDepth = Math.max(maxDepth, getDepth(c));
    }
    return 1 + maxDepth;
  }

  const hierarchies = [];

  for (const comp of components) {
    let edgeCount = 0;
    for (const node of comp) {
      if (parentOf.has(node)) {
        edgeCount++;
      }
    }

    const isCyclic = edgeCount === comp.length;
    const root = isCyclic ? [...comp].sort()[0] : comp.find(node => !parentOf.has(node));
    const minIndex = Math.min(...comp.map(n => nodeFirstIndex.get(n)));

    if (isCyclic) {
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
        _index: minIndex
      });
    } else {
      hierarchies.push({
        root,
        tree: { [root]: buildTree(root) },
        depth: getDepth(root),
        _index: minIndex
      });
    }
  }

  hierarchies.sort((a, b) => a._index - b._index);
  hierarchies.forEach(h => delete h._index);

  let total_trees = 0;
  let total_cycles = 0;
  let largest_tree_root = "";
  let maxDepth = -1;

  for (const h of hierarchies) {
    if (h.has_cycle) {
      total_cycles++;
    } else {
      total_trees++;
      if (h.depth > maxDepth) {
        maxDepth = h.depth;
        largest_tree_root = h.root;
      } else if (h.depth === maxDepth) {
        if (!largest_tree_root || h.root < largest_tree_root) {
          largest_tree_root = h.root;
        }
      }
    }
  }

  res.json({
    user_id,
    email_id,
    college_roll_number,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
