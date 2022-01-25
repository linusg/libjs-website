"use strict";

const initialPathInTree = ["test"]; // Don't start at `/`, it only contains `test` anyway.

let resultsNode;
let legendNode;
let summaryLabel;
let summaryStatusLabel;
let leafTreeNodeTemplate;
let nonLeafTreeNodeTemplate;
let pathInTree = new URL(location.href).searchParams
  .get("path")
  ?.split("/") ?? [...initialPathInTree];
let tree;

const resultsObject = Object.create(null);
const legendResults = [
  TestResult.PASSED,
  TestResult.FAILED,
  TestResult.PROCESS_ERROR,
  TestResult.TODO_ERROR,
];

function initialize(data, modeName) {
  let mode;
  if (modeName === "") {
    mode = "AST";
  } else if (modeName === "-bytecode") {
    mode = "Bytecode";
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
  legendNode = document.getElementById("legend");
  summaryLabel = document.getElementById("summary");
  summaryStatusLabel = document.getElementById("summary-status");
  leafTreeNodeTemplate = document.getElementById("leaf-tree-node-template");
  nonLeafTreeNodeTemplate = document.getElementById(
    "nonleaf-tree-node-template"
  );

  // Now make a nice lazy-loaded collapsible tree in `resultsNode`.
  generateChildren(resultsNode);

  summaryStatusLabel.classList.remove("hidden");

  legendNode.innerHTML = legendResults
    .map((result) => {
      const color = TestResultColors[result];
      const label = TestResultLabels[result];
      return `
        <span class="legend-item">
          <span class="legend-circle" style="background-color: ${color};"></span>
          ${label}
        </span>
      `;
    })
    .join(" ");
}

window.onpopstate = (event) => {
  pathInTree = event.state?.pathInTree ?? [...initialPathInTree];
  generateChildren(resultsNode);
};

function navigate() {
  history.pushState(
    { pathInTree },
    pathInTree[pathInTree.length - 1],
    generateQueryString(pathInTree)
  );
}

function goToParentDirectory(count) {
  for (let i = 0; i < count; ++i) {
    pathInTree.pop();
  }
  navigate();
  generateChildren(resultsNode);
}

function generateQueryString(pathSegments) {
  return `?path=${pathSegments.join("/")}`;
}

function generateSummary(results) {
  summaryLabel.innerHTML = "/ ";
  for (let i = 0; i < pathInTree.length; ++i) {
    const pathSegment = pathInTree[i];
    const pathSegmentLink = document.createElement("a");
    pathSegmentLink.textContent = pathSegment;
    pathSegmentLink.href = generateQueryString(pathInTree.slice(0, i + 1));
    pathSegmentLink.onclick = (event) => {
      if (event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      goToParentDirectory(pathInTree.length - i - 1);
    };
    summaryLabel.appendChild(pathSegmentLink);
    if (i < pathInTree.length - 1) {
      summaryLabel.insertAdjacentHTML("beforeend", " / ");
    }
  }
  summaryStatusLabel.innerHTML = generateStatus(results.aggregatedResults);
}

function generateChildNode(childName, child, filepath) {
  const template =
    child.children === null ? leafTreeNodeTemplate : nonLeafTreeNodeTemplate;
  const childNode = template.content.children[0].cloneNode(true);
  childNode.querySelector(".tree-node-name").textContent = childName;
  childNode.querySelector(".tree-node-status").innerHTML = generateStatus(
    child.aggregatedResults
  );
  childNode.querySelector(
    ".tree-node-github-url"
  ).href = `https://github.com/tc39/test262/tree/main/${filepath}`;
  return childNode;
}

function makeChildNavigable(childNode, extraPathParts, targetNode) {
  const actionNode = childNode.querySelector(".tree-node-action");

  actionNode.href = generateQueryString([...pathInTree, ...extraPathParts]);
  actionNode.onclick = function (event) {
    if (event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    for (const part of extraPathParts) pathInTree.push(part);
    navigate();
    generateChildren(targetNode);
  };
}

function sortResultsByTypeAndName([lhsName, lhsResult], [rhsName, rhsResult]) {
  if ((lhsResult.children === null) === (rhsResult.children === null))
    return lhsName.localeCompare(rhsName);
  return lhsResult.children === null ? 1 : -1;
}

function generateChildren(node) {
  // Drop all children
  for (const child of Array.prototype.slice.call(node.children)) {
    child.remove();
  }

  // Generate new ones!
  const results = pathInTree.reduce((acc, x) => acc.children[x], tree);
  generateSummary(results);

  Object.entries(results.children)
    .sort(sortResultsByTypeAndName)
    .forEach(([childName, child]) => {
      const childNode = generateChildNode(
        childName,
        child,
        `${pathInTree.join("/")}/${childName}`
      );
      node.appendChild(childNode);

      const isLeaf = child.children === null;
      if (!isLeaf) {
        makeChildNavigable(childNode, [childName], node);
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
                const toolTip = `${TestResultLabels[x]}: ${stats[x]} / ${total} (${percentTotal}%)`;
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
