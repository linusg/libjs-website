"use strict";

(() => {
  const { DateTime, Duration } = luxon;

  const style = getComputedStyle(document.body);
  const backgroundColor = style.getPropertyValue("--color-background");
  const textColor = style.getPropertyValue("--color-text");
  const chartBorderColor = style.getPropertyValue("--color-chart-border");
  const fontFamily = style.getPropertyValue("font-family");
  const fontSize = parseInt(
    style.getPropertyValue("font-size").slice(0, -2),
    10
  );

  Chart.defaults.borderColor = textColor;
  Chart.defaults.color = textColor;
  Chart.defaults.font.family = fontFamily;
  Chart.defaults.font.size = fontSize;

  // place tooltip's origin point under the cursor
  const tooltipPlugin = Chart.registry.getPlugin("tooltip");
  tooltipPlugin.positioners.underCursor = function (elements, eventPosition) {
    const pos = tooltipPlugin.positioners.average(elements);

    if (pos === false) {
      return false;
    }

    return {
      x: pos.x,
      y: eventPosition.y,
    };
  };

  class LineWithVerticalHoverLineController extends Chart.LineController {
    draw() {
      super.draw(arguments);

      if (!this.chart.tooltip._active.length) return;

      const { x } = this.chart.tooltip._active[0].element;
      const { top: topY, bottom: bottomY } = this.chart.chartArea;
      const ctx = this.chart.ctx;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1;
      ctx.strokeStyle = chartBorderColor;
      ctx.stroke();
      ctx.restore();
    }
  }

  LineWithVerticalHoverLineController.id = "lineWithVerticalHoverLine";
  LineWithVerticalHoverLineController.defaults = Chart.LineController.defaults;
  Chart.register(LineWithVerticalHoverLineController);

  // This is when we started running the tests on Idan's self-hosted runner. Before that,
  // durations varied a lot across runs. See https://github.com/SerenityOS/serenity/pull/7718.
  const PERFORMANCE_CHART_START_DATE_TIME = DateTime.fromISO("2021-07-04");

  const TestResult = {
    PASSED: "passed",
    FAILED: "failed",
    SKIPPED: "skipped",
    METADATA_ERROR: "metadata_error",
    HARNESS_ERROR: "harness_error",
    TIMEOUT_ERROR: "timeout_error",
    PROCESS_ERROR: "process_error",
    RUNNER_EXCEPTION: "runner_exception",
    DURATION: "duration",
  };

  const TestResultColors = {
    [TestResult.PASSED]: style.getPropertyValue("--color-chart-passed"),
    [TestResult.FAILED]: style.getPropertyValue("--color-chart-failed"),
    [TestResult.SKIPPED]: style.getPropertyValue("--color-chart-skipped"),
    [TestResult.METADATA_ERROR]: style.getPropertyValue(
      "--color-chart-metadata-error"
    ),
    [TestResult.HARNESS_ERROR]: style.getPropertyValue(
      "--color-chart-harness-error"
    ),
    [TestResult.TIMEOUT_ERROR]: style.getPropertyValue(
      "--color-chart-timeout-error"
    ),
    [TestResult.PROCESS_ERROR]: style.getPropertyValue(
      "--color-chart-process-error"
    ),
    [TestResult.RUNNER_EXCEPTION]: style.getPropertyValue(
      "--color-chart-runner-exception"
    ),
  };

  const TestResultLabels = {
    [TestResult.PASSED]: "Passed",
    [TestResult.FAILED]: "Failed",
    [TestResult.SKIPPED]: "Skipped",
    [TestResult.METADATA_ERROR]: "Metadata failed to parse",
    [TestResult.HARNESS_ERROR]: "Harness file failed to parse or run",
    [TestResult.TIMEOUT_ERROR]: "Timed out",
    [TestResult.PROCESS_ERROR]: "Crashed",
    [TestResult.RUNNER_EXCEPTION]: "Unhandled runner exception",
    [TestResult.DURATION]: "Duration (seconds)",
  };

  function prepareDataForCharts(data) {
    const charts = {
      ...Object.fromEntries(
        ["test262", "test262-bytecode"].map((name) => [
          name,
          {
            data: {
              [TestResult.PASSED]: [],
              [TestResult.FAILED]: [],
              [TestResult.SKIPPED]: [],
              [TestResult.METADATA_ERROR]: [],
              [TestResult.HARNESS_ERROR]: [],
              [TestResult.TIMEOUT_ERROR]: [],
              [TestResult.PROCESS_ERROR]: [],
              [TestResult.RUNNER_EXCEPTION]: [],
              [TestResult.DURATION]: [],
            },
            datasets: [],
            metadata: [],
          },
        ])
      ),
      ["test262-parser-tests"]: {
        data: {
          [TestResult.PASSED]: [],
          [TestResult.FAILED]: [],
        },
        datasets: [],
        metadata: [],
      },
      ["test262-performance"]: {
        data: {
          [TestResult.DURATION]: [],
        },
        datasets: [],
        metadata: [],
      },
      ["test262-performance-per-test"]: {
        data: {
          [TestResult.DURATION]: [],
        },
        datasets: [],
        metadata: [],
      },
      ["test262-bytecode-performance"]: {
        data: {
          [TestResult.DURATION]: [],
        },
        datasets: [],
        metadata: [],
      },
      ["test262-bytecode-performance-per-test"]: {
        data: {
          [TestResult.DURATION]: [],
        },
        datasets: [],
        metadata: [],
      },
    };

    for (const entry of data) {
      for (const chart in charts) {
        const results = entry.tests[chart]?.results;
        if (!results) {
          continue;
        }
        charts[chart].metadata.push({
          commitTimestamp: entry.commit_timestamp,
          runTimestamp: entry.run_timestamp,
          duration: entry.tests[chart].duration,
          versions: entry.versions,
          total: results.total,
        });
        for (const testResult in results) {
          if (testResult === "total") {
            continue;
          }
          charts[chart].data[testResult].push({
            x: entry.commit_timestamp * 1000,
            y: results[testResult],
          });
        }
      }

      const dt = DateTime.fromSeconds(entry.commit_timestamp);
      if (dt < PERFORMANCE_CHART_START_DATE_TIME) {
        continue;
      }

      // chart-test262-performance
      const performanceTests = entry.tests["test262"];
      const performanceChart = charts["test262-performance"];
      const performanceResults = performanceTests?.results;
      if (performanceResults) {
        performanceChart.metadata.push({
          commitTimestamp: entry.commit_timestamp,
          runTimestamp: entry.run_timestamp,
          duration: performanceTests.duration,
          versions: entry.versions,
          total: performanceResults.total,
        });
        performanceChart.data["duration"].push({
          x: entry.commit_timestamp * 1000,
          y: performanceTests.duration,
        });
      }

      // chart-test262-performance-per-test
      const performancePerTestTests = entry.tests["test262"];
      const performancePerTestChart = charts["test262-performance-per-test"];
      const performancePerTestResults = performancePerTestTests?.results;
      if (performancePerTestResults) {
        performancePerTestChart.metadata.push({
          commitTimestamp: entry.commit_timestamp,
          runTimestamp: entry.run_timestamp,
          duration:
            performancePerTestTests.duration / performancePerTestResults.total,
          versions: entry.versions,
          total: performancePerTestResults.total,
        });
        performancePerTestChart.data["duration"].push({
          x: entry.commit_timestamp * 1000,
          y: performancePerTestTests.duration / performancePerTestResults.total,
        });
      }

      // chart-test262-bytecode-performance
      const byteCodePerformanceTests = entry.tests["test262-bytecode"];
      const byteCodePerformanceChart = charts["test262-bytecode-performance"];
      const byteCodePerformanceResults = byteCodePerformanceTests?.results;
      if (byteCodePerformanceResults) {
        byteCodePerformanceChart.metadata.push({
          commitTimestamp: entry.commit_timestamp,
          runTimestamp: entry.run_timestamp,
          duration: byteCodePerformanceTests.duration,
          versions: entry.versions,
          total: byteCodePerformanceResults.total,
        });
        byteCodePerformanceChart.data["duration"].push({
          x: entry.commit_timestamp * 1000,
          y: byteCodePerformanceTests.duration,
        });
      }

      // chart-test262-bytecode-performance-per-test
      const byteCodePerformancePerTestTests = entry.tests["test262-bytecode"];
      const byteCodePerformancePerTestChart =
        charts["test262-bytecode-performance-per-test"];
      const byteCodePerformancePerTestResults =
        byteCodePerformancePerTestTests?.results;
      if (byteCodePerformancePerTestResults) {
        byteCodePerformancePerTestChart.metadata.push({
          commitTimestamp: entry.commit_timestamp,
          runTimestamp: entry.run_timestamp,
          duration:
            byteCodePerformancePerTestTests.duration /
            byteCodePerformancePerTestResults.total,
          versions: entry.versions,
          total: byteCodePerformancePerTestResults.total,
        });
        byteCodePerformancePerTestChart.data["duration"].push({
          x: entry.commit_timestamp * 1000,
          y:
            byteCodePerformancePerTestTests.duration /
            byteCodePerformancePerTestResults.total,
        });
      }
    }

    for (const chart in charts) {
      for (const testResult in charts[chart].data) {
        charts[chart].datasets.push({
          label: TestResultLabels[testResult],
          data: charts[chart].data[testResult],
          backgroundColor: TestResultColors[testResult],
          borderWidth: 2,
          borderColor: chartBorderColor,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: true,
        });
      }
      delete charts[chart].data;
    }

    return { charts };
  }

  function initializeChart(
    element,
    { datasets, metadata },
    { xAxisTitle = "Time", yAxisTitle = "Number of tests" } = {}
  ) {
    const ctx = element.getContext("2d");

    new Chart(ctx, {
      type: "lineWithVerticalHoverLine",
      data: {
        datasets,
      },
      options: {
        parsing: false,
        normalized: true,
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          zoom: {
            zoom: {
              mode: "x",
              wheel: {
                enabled: true,
              },
            },
            pan: {
              enabled: true,
              mode: "x",
            },
          },
          hover: {
            mode: "index",
            intersect: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            usePointStyle: true,
            boxWidth: 12,
            boxHeight: 12,
            padding: 20,
            position: "underCursor",
            titleColor: textColor,
            bodyColor: textColor,
            footerColor: textColor,
            footerFont: { weight: "normal" },
            footerMarginTop: 20,
            backgroundColor: backgroundColor,
            callbacks: {
              title: () => {
                return null;
              },
              beforeBody: (context) => {
                const { dataIndex } = context[0];
                const { total } = metadata[dataIndex];
                const formattedValue = total.toLocaleString("en-US");
                // Leading spaces to make up for missing color circle
                return `    Number of tests: ${formattedValue}`;
              },
              label: (context) => {
                // Space as padding between color circle and label
                const formattedValue = context.parsed.y.toLocaleString("en-US");
                if (
                  context.dataset.label !==
                  TestResultLabels[TestResult.DURATION]
                ) {
                  const { total } = metadata[context.dataIndex];
                  const percentOfTotal = (
                    (context.parsed.y / total) *
                    100
                  ).toFixed(2);
                  return ` ${context.dataset.label}: ${formattedValue} (${percentOfTotal}%)`;
                } else {
                  return ` ${context.dataset.label}: ${formattedValue}`;
                }
              },

              footer: (context) => {
                const { dataIndex } = context[0];
                const {
                  commitTimestamp,
                  duration: durationSeconds,
                  versions,
                } = metadata[dataIndex];
                const dateTime = DateTime.fromSeconds(commitTimestamp);
                const duration = Duration.fromMillis(durationSeconds * 1000);
                const serenityVersion = versions.serenity.substring(0, 7);
                // prettier-ignore
                const libjsTest262Version = versions["libjs-test262"].substring(0, 7);
                const test262Version = versions.test262.substring(0, 7);
                // prettier-ignore
                const test262ParserTestsVersion = versions["test262-parser-tests"].substring(0, 7);
                return `\
Committed on ${dateTime.toLocaleString(DateTime.DATETIME_SHORT)}, \
run took ${duration.toISOTime()}

Versions: serenity@${serenityVersion}, libjs-test262@${libjsTest262Version},
test262@${test262Version}, test262-parser-tests@${test262ParserTestsVersion}`;
              },
            },
          },
          legend: {
            align: "end",
            labels: {
              usePointStyle: true,
              boxWidth: 10,
              // Only include passed, failed, and crashed in the legend
              filter: ({ text }) =>
                text === TestResultLabels[TestResult.PASSED] ||
                text === TestResultLabels[TestResult.FAILED] ||
                text === TestResultLabels[TestResult.PROCESS_ERROR],
            },
          },
        },
        scales: {
          x: {
            type: "time",
            title: {
              display: true,
              text: xAxisTitle,
            },
            grid: {
              borderColor: textColor,
              color: "transparent",
              borderWidth: 2,
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: yAxisTitle,
            },
            grid: {
              borderColor: textColor,
              color: chartBorderColor,
              borderWidth: 2,
            },
          },
        },
      },
    });
  }

  function initializeSummary(
    element,
    runTimestamp,
    commitHash,
    durationSeconds,
    results
  ) {
    const dateTime = DateTime.fromSeconds(runTimestamp);
    const duration = Duration.fromMillis(durationSeconds * 1000);
    const passed = results[TestResult.PASSED];
    const total = results.total;
    const percent = ((passed / total) * 100).toFixed(2);
    element.innerHTML = `
    The last test run was on <strong>
    ${dateTime.toLocaleString(DateTime.DATETIME_SHORT)}
    </strong> for commit
    <code>
      <a
        href="https://github.com/SerenityOS/serenity/commits/${commitHash}"
        target="_blank"
        rel="noopener noreferrer"
        title="View commits up to this point"
      >
        ${commitHash.slice(0, 7)}
      </a>
    </code>
    and took <strong>${duration.toISOTime()}</strong>.
    <strong>${passed} of ${total}</strong> tests passed, i.e. <strong>${percent}%</strong>.
    `;
  }

  function initialize(data) {
    const { charts } = prepareDataForCharts(data);
    initializeChart(document.getElementById("chart-test262"), charts.test262);
    initializeChart(
      document.getElementById("chart-test262-bytecode"),
      charts["test262-bytecode"]
    );
    initializeChart(
      document.getElementById("chart-test262-parser-tests"),
      charts["test262-parser-tests"]
    );
    initializeChart(
      document.getElementById("chart-test262-performance"),
      charts["test262-performance"],
      { yAxisTitle: TestResultLabels[TestResult.DURATION] }
    );
    initializeChart(
      document.getElementById("chart-test262-performance-per-test"),
      charts["test262-performance-per-test"],
      { yAxisTitle: TestResultLabels[TestResult.DURATION] }
    );
    initializeChart(
      document.getElementById("chart-test262-bytecode-performance"),
      charts["test262-bytecode-performance"],
      { yAxisTitle: TestResultLabels[TestResult.DURATION] }
    );
    initializeChart(
      document.getElementById("chart-test262-bytecode-performance-per-test"),
      charts["test262-bytecode-performance-per-test"],
      { yAxisTitle: TestResultLabels[TestResult.DURATION] }
    );
    const last = data.slice(-1)[0];
    initializeSummary(
      document.getElementById("summary-test262"),
      last.run_timestamp,
      last.versions.serenity,
      last.tests.test262.duration,
      last.tests.test262.results
    );
    initializeSummary(
      document.getElementById("summary-test262-bytecode"),
      last.run_timestamp,
      last.versions.serenity,
      last.tests["test262-bytecode"].duration,
      last.tests["test262-bytecode"].results
    );
    initializeSummary(
      document.getElementById("summary-test262-parser-tests"),
      last.run_timestamp,
      last.versions.serenity,
      last.tests["test262-parser-tests"].duration,
      last.tests["test262-parser-tests"].results
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    const headers = new Headers();
    headers.append("pragma", "no-cache");
    headers.append("cache-control", "no-cache");
    fetch(new Request("data/results.json"), { method: "GET", headers })
      .then((response) => response.json())
      .then((data) => {
        data.sort((a, b) =>
          a.commit_timestamp === b.commit_timestamp
            ? 0
            : a.commit_timestamp < b.commit_timestamp
            ? -1
            : 1
        );
        return data;
      })
      .then((data) => initialize(data));
  });
})();
