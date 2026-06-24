document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
    
    btn.classList.add("active");
    const targetTab = btn.getAttribute("data-tab");
    document.getElementById(`tab-${targetTab}`).classList.remove("hidden");
  });
});

const defaultInput = [
  "A->B", "A->C", "B->D", "C->E", "E->F",
  "X->Y", "Y->Z", "Z->X",
  "P->Q", "Q->R",
  "G->H", "G->H", "G->I",
  "hello", "1->2", "A->"
];
document.getElementById("nodeInput").value = JSON.stringify(defaultInput, null, 2);

function renderNode(nodeName, childrenObject) {
  const item = document.createElement("li");
  item.className = "tree-node-item";
  
  const label = document.createElement("span");
  label.className = "node-label";
  label.textContent = nodeName;
  item.appendChild(label);
  
  const childKeys = Object.keys(childrenObject);
  if (childKeys.length > 0) {
    const list = document.createElement("ul");
    list.className = "tree-node-list";
    for (const key of childKeys) {
      list.appendChild(renderNode(key, childrenObject[key]));
    }
    item.appendChild(list);
  }
  return item;
}

document.getElementById("submitBtn").addEventListener("click", async () => {
  const btn = document.getElementById("submitBtn");
  const spinner = btn.querySelector(".spinner");
  const btnText = btn.querySelector("span");
  const errorBox = document.getElementById("errorMessage");
  const resultsContent = document.getElementById("resultsContent");
  const placeholderContent = document.getElementById("placeholderContent");
  const statusDot = document.getElementById("statusIndicator");
  let baseApiUrl = document.getElementById("apiUrl").value.trim().replace(/\/+$/, "");
  // If empty, use current server origin
  if (!baseApiUrl) {
    baseApiUrl = window.location.origin;
  }

  let rawInput = document.getElementById("nodeInput").value.trim();
  let parsedData = [];

  try {
    if (rawInput.startsWith("[") && rawInput.endsWith("]")) {
      parsedData = JSON.parse(rawInput);
    } else {
      parsedData = rawInput
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
  } catch (err) {
    errorBox.textContent = "Invalid input format. Please enter a valid JSON array or comma-separated list.";
    errorBox.classList.remove("hidden");
    statusDot.className = "status-dot error";
    return;
  }

  btn.disabled = true;
  spinner.classList.remove("hidden");
  btnText.textContent = "Processing...";
  errorBox.classList.add("hidden");
  statusDot.className = "status-dot";

  try {
    const response = await fetch(`${baseApiUrl}/bfhl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data: parsedData })
    });

    if (!response.ok) {
      throw new Error(`API responded with status code ${response.status}`);
    }

    const resData = await response.json();
    statusDot.className = "status-dot active";

    document.getElementById("statTrees").textContent = resData.summary.total_trees;
    document.getElementById("statCycles").textContent = resData.summary.total_cycles;
    document.getElementById("statLargest").textContent = resData.summary.largest_tree_root || "N/A";

    document.getElementById("identityUser").textContent = resData.user_id;
    document.getElementById("identityEmail").textContent = resData.email_id;
    document.getElementById("identityRoll").textContent = resData.college_roll_number;

    const dupContainer = document.getElementById("duplicateList");
    dupContainer.innerHTML = "";
    if (resData.duplicate_edges.length === 0) {
      dupContainer.innerHTML = '<span class="empty-tag">None detected</span>';
    } else {
      resData.duplicate_edges.forEach(edge => {
        const badge = document.createElement("span");
        badge.className = "tag-badge yellow";
        badge.textContent = edge;
        dupContainer.appendChild(badge);
      });
    }

    const invContainer = document.getElementById("invalidList");
    invContainer.innerHTML = "";
    if (resData.invalid_entries.length === 0) {
      invContainer.innerHTML = '<span class="empty-tag">None detected</span>';
    } else {
      resData.invalid_entries.forEach(entry => {
        const badge = document.createElement("span");
        badge.className = "tag-badge red";
        badge.textContent = entry;
        invContainer.appendChild(badge);
      });
    }

    const visualizer = document.getElementById("treeVisualizer");
    visualizer.innerHTML = "";

    resData.hierarchies.forEach(h => {
      const container = document.createElement("div");
      container.className = "tree-root-container";

      const header = document.createElement("div");
      header.className = "tree-root-header";

      const label = document.createElement("span");
      label.className = "tree-root-label";
      label.textContent = `Root: ${h.root}`;
      header.appendChild(label);

      if (h.has_cycle) {
        const badge = document.createElement("span");
        badge.className = "badge-cycle";
        badge.textContent = "Cycle Group";
        header.appendChild(badge);
        container.appendChild(header);

        const cycleMsg = document.createElement("div");
        cycleMsg.style.fontSize = "0.9rem";
        cycleMsg.style.color = "#fca5a5";
        cycleMsg.textContent = "Cyclic loop detected. Structural tree omitted.";
        container.appendChild(cycleMsg);
      } else {
        const badge = document.createElement("span");
        badge.className = "badge-depth";
        badge.textContent = `Depth: ${h.depth}`;
        header.appendChild(badge);
        container.appendChild(header);

        const rootKeys = Object.keys(h.tree);
        const rootUl = document.createElement("ul");
        rootUl.className = "tree-node-list";
        for (const key of rootKeys) {
          rootUl.appendChild(renderNode(key, h.tree[key]));
        }
        container.appendChild(rootUl);
      }

      visualizer.appendChild(container);
    });

    document.getElementById("jsonContent").textContent = JSON.stringify(resData, null, 2);

    placeholderContent.classList.add("hidden");
    resultsContent.classList.remove("hidden");

  } catch (err) {
    errorBox.textContent = `Connection Failed: Could not reach the API at ${baseApiUrl}. Make sure your backend server is running and CORS is enabled.`;
    errorBox.classList.remove("hidden");
    statusDot.className = "status-dot error";
  } finally {
    btn.disabled = false;
    spinner.classList.add("hidden");
    btnText.textContent = "Process Relationships";
  }
});
