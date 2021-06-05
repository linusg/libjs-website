"use strict";

(() => {
  const { DateTime, Duration } = luxon;

  const style = getComputedStyle(document.body);
  const backgroundColor = style.getPropertyValue("--color-background");
  const textColor = style.getPropertyValue("--color-text");
  const chartPointBorderColor = style.getPropertyValue(
    "--color-chart-point-border"
  );
  const fontFamily = style.getPropertyValue("font-family");
  const fontSize = parseInt(
    style.getPropertyValue("font-size").slice(0, -2),
    10
  );

  Chart.defaults.borderColor = textColor;
  Chart.defaults.color = textColor;
  Chart.defaults.font.family = fontFamily;
  Chart.defaults.font.size = fontSize;

  const TestResult = {
    PASSED: "passed",
    FAILED: "failed",
    SKIPPED: "skipped",
    METADATA_ERROR: "metadata_error",
    HARNESS_ERROR: "harness_error",
    TIMEOUT_ERROR: "timeout_error",
    PROCESS_ERROR: "process_error",
    RUNNER_EXCEPTION: "runner_exception",
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
    [TestResult.METADATA_ERROR]: "Test metadata failed to parse",
    [TestResult.HARNESS_ERROR]: "Test harness file failed to parse or run",
    [TestResult.TIMEOUT_ERROR]: "Test run timed out",
    [TestResult.PROCESS_ERROR]: "Test run crashed",
    [TestResult.RUNNER_EXCEPTION]: "Unhandled runner exception",
  };

  function prepareDataForCharts(data) {
    const charts = {
      test262: {
        data: {
          [TestResult.PASSED]: [],
          [TestResult.FAILED]: [],
          [TestResult.SKIPPED]: [],
          [TestResult.METADATA_ERROR]: [],
          [TestResult.HARNESS_ERROR]: [],
          [TestResult.TIMEOUT_ERROR]: [],
          [TestResult.PROCESS_ERROR]: [],
          [TestResult.RUNNER_EXCEPTION]: [],
        },
        datasets: [],
        metadata: [],
      },
      ["test262-parser-tests"]: {
        data: {
          [TestResult.PASSED]: [],
          [TestResult.FAILED]: [],
        },
        datasets: [],
        metadata: [],
      },
    };
    for (const entry of data) {
      for (const chart in charts) {
        const results = entry.tests[chart].results;
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
    }

    for (const chart in charts) {
      for (const testResult in charts[chart].data) {
        charts[chart].datasets.push({
          label: TestResultLabels[testResult],
          data: charts[chart].data[testResult],
          backgroundColor: TestResultColors[testResult],
          borderWidth: 2,
          borderColor: "transparent",
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHitRadius: 4,
          pointBorderColor: chartPointBorderColor,
          tension: 0.1,
          fill: true,
        });
      }
      delete charts[chart].data;
    }

    return { charts };
  }

  function initializeChart(element, { datasets, metadata }) {
    const ctx = element.getContext("2d");

    new Chart(ctx, {
      type: "line",
      data: {
        datasets,
      },
      options: {
        parsing: false,
        normalized: true,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            mode: "index",
            usePointStyle: true,
            boxWidth: 12,
            boxHeight: 12,
            padding: 20,
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
                return `    Total: ${formattedValue}`;
              },
              label: (context) => {
                // Space as padding between color circle and label
                const formattedValue = context.parsed.y.toLocaleString("en-US");
                return ` ${context.dataset.label}: ${formattedValue}`;
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
              // Only include failed, passed, and skipped in the legend
              filter: ({ datasetIndex }) => datasetIndex < 3,
            },
          },
        },
        scales: {
          x: {
            type: "time",
            title: {
              display: true,
              text: "Time",
            },
            grid: {
              borderColor: textColor,
              color: "transparent",
              borderWidth: 2,
            },
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: "Number of tests",
            },
            grid: {
              borderColor: textColor,
              color: chartPointBorderColor,
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
      document.getElementById("chart-test262-parser-tests"),
      charts["test262-parser-tests"]
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
      document.getElementById("summary-test262-parser-tests"),
      last.run_timestamp,
      last.versions.serenity,
      last.tests["test262-parser-tests"].duration,
      last.tests["test262-parser-tests"].results
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetch("data/results.json")
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
