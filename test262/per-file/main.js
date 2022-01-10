"use strict";

let resultsNode;
let summaryLabel;
let summaryStatusLabel;
let leafTreeNodeTemplate;
let nonLeafTreeNodeTemplate;
let pathInTree = [];
let tree;
const resultsObject = Object.create(null);

function initialize(data, modeName) {
  let mode;
  if (modeName === "") {
    mode = "AST";
  } else if (modeName === "-bytecode") {
    mode = "bytecode";
  } else {
    throw new Error(`Unknown mode: ${modeName}`);
  }

  // Do a pass and generate the tree.
  for (const testPath in data.results) {
    const segments = testPath.split("/");
    const fileName = segments.pop();
    let testObject = resultsObject;
    for (const pathSegment of segments) {
      if (!(pathSegment in testObject)) {
        testObject[pathSegment] = {
          children: Object.create(null),
          aggregatedResults: null,
        };
      }

      testObject = testObject[pathSegment].children;
    }

    if (!(fileName in testObject)) {
      testObject[fileName] = {
        children: null,
        results: Object.create(null),
      };
    }

    testObject[fileName].results[mode] = data.results[testPath].toLowerCase();
  }
}

function generateResults() {
  function constructTree(results) {
    if (results.children === null) {
      results.aggregatedResults = Object.fromEntries(
        Object.keys(results.results).map((name) => [
          name,
          { [results.results[name]]: 1 },
        ])
      );

      return;
    }

    for (const name in results.children) {
      constructTree(results.children[name]);
    }

    for (const name in results.children) {
      const childResults = results.children[name];
      results.aggregatedResults = Object.keys(
        childResults.aggregatedResults
      ).reduce((acc, mode) => {
        if (!(mode in acc)) acc[mode] = {};
        const modeAcc = acc[mode];
        const stats = childResults.aggregatedResults[mode];
        for (const name in stats) {
          if (name in modeAcc) modeAcc[name] += stats[name];
          else modeAcc[name] = stats[name];
        }
        return acc;
      }, results.aggregatedResults || {});
    }
  }

  // Now do another pass and aggregate the results.
  let results = {
    children: resultsObject,
    aggregatedResults: {},
  };
  constructTree(results);
  tree = results;

  resultsNode = document.getElementById("results");
  summaryLabel = document.getElementById("summary");
  summaryStatusLabel = document.getElementById("summary-status");
  leafTreeNodeTemplate = document.getElementById("leaf-tree-node-template");
  nonLeafTreeNodeTemplate = document.getElementById(
    "nonleaf-tree-node-template"
  );

  // Now make a nice lazy-loaded collapsible tree in `resultsNode`.
  generateChildren(resultsNode);

  summaryStatusLabel.classList.remove("hidden");

  summaryLabel.onclick = () => {
    if (pathInTree.length === 0) return;

    pathInTree.pop();
    generateChildren(resultsNode);
  };
}

function generateChildren(node) {
  // Drop all children
  for (const child of Array.prototype.slice.call(node.children)) {
    child.remove();
  }

  // Generate new ones!
  const results = pathInTree.reduce((acc, x) => acc.children[x], tree);

  summaryLabel.textContent = "/ " + pathInTree.join(" / ");
  summaryStatusLabel.innerHTML = generateStatus(results.aggregatedResults);

  Object.keys(results.children)
    .sort()
    .forEach((childName) => {
      const child = results.children[childName];
      const isLeaf = child.children === null;
      const template = isLeaf ? leafTreeNodeTemplate : nonLeafTreeNodeTemplate;
      const childNode = template.content.children[0].cloneNode(true);
      node.appendChild(childNode);
      childNode.querySelector(".tree-node-name").textContent = childName;
      childNode.querySelector(".tree-node-status").innerHTML = generateStatus(
        child.aggregatedResults
      );
      childNode.querySelector(
        ".tree-node-url"
      ).href = `https://github.com/tc39/test262/tree/main/${pathInTree.join(
        "/"
      )}/${childName}`;

      if (!isLeaf) {
        childNode
          .querySelectorAll(".tree-node-name, .tree-node-image")
          .forEach((childNode) => {
            childNode.onclick = function () {
              pathInTree.push(childName);
              generateChildren(node);
            };
          });
      }
    });
}

function color(name) {
  return TestResultColors[name] || "black";
}

function resultAwareSort(names) {
  const resultOrder = [
    TestResult.PASSED,
    TestResult.FAILED,
    TestResult.SKIPPED,
    TestResult.PROCESS_ERROR,
    TestResult.TODO_ERROR,
    TestResult.METADATA_ERROR,
    TestResult.HARNESS_ERROR,
    TestResult.TIMEOUT_ERROR,
    TestResult.RUNNER_EXCEPTION,
    TestResult.DURATION,
  ];

  return names.sort((a, b) => {
    const aIndex = resultOrder.indexOf(a);
    const bIndex = resultOrder.indexOf(b);
    return aIndex - bIndex;
  });
}

function generateStatus(aggregatedResults) {
  const status = Object.keys(aggregatedResults)
    .sort()
    .reduce((acc, mode) => {
      const stats = aggregatedResults[mode];
      const total = Object.keys(stats).reduce(
        (acc, name) => acc + stats[name],
        0
      );
      if (total === 0) return acc;
      acc.push(`<div class="mode-summary-container">
        <span class="mode-result-text">${mode}</span>
        <div class="mode-bar-container">
            ${resultAwareSort(Object.keys(stats))
              .map((x) => {
                const percentTotal = ((100 * stats[x]) / total).toFixed(2);
                const toolTip = `${TestResultLabels[x]}: ${percentTotal}%`;
                const barColor = color(x);
                return `<div title="${toolTip}" style="width: ${percentTotal}%; height: 20px; background-color: ${barColor}"></div>`;
              })
              .join("")}
        </div>
    </div>`);
      return acc;
    }, []);
  return status.join(" ");
}

document.addEventListener("DOMContentLoaded", () => {
  const promises = [];
  for (const mode of ["", "-bytecode"]) {
    promises.push(
      fetchData(`../data/per-file${mode}-master.json`)
        .then((response) => response.json())
        .then((data) => initialize(data, mode))
    );
  }
  Promise.all(promises).then(() => generateResults());
});
